// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./ERC20StrategyParent.sol";

import "../interfaces/ISwapHelper.sol";
import "../interfaces/IAegisStakingVault.sol";

import "hardhat/console.sol";

contract AegisERC20Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    address public receiptToken;
    uint256 public inputTokenIndex;
    IAegisStakingVault public stakingVault;

    function initialize(
        string memory _name,
        address _gatewayAddress,
        address _amanaVault,
        address _withdrawHelper,
        address _swapHelper,
        address _receiptTokenAddress, // this is YUSD
        address _inputTokenAddress, // inputToken
        address _stakingVault, // this is the YUSD staking gauge
        address /* _rewardsTokenAddress — not needed */,
        uint256 // _inputTokenIndex - not needed
    ) external initializer {
        __StrategyParent_init(
            _name,
            _amanaVault,
            _gatewayAddress,
            _withdrawHelper,
            _inputTokenAddress,
            _receiptTokenAddress
        );

        swapHelper = _swapHelper;

        receiptToken = _receiptTokenAddress;

        stakingVault = IAegisStakingVault(_stakingVault);
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minAmountOut,
        TxType /* txType */ // not used in this strategy
    ) internal override {
        require(amount > 0, "Deposit amount must be greater than zero");

        IERC20(inputToken).transfer(address(swapHelper), amount);

        // Swap input token to receipt token (YUSD)
        console.log("address(this): %s", address(this));
        uint256 amountOut = ISwapHelper(swapHelper).swap(
            address(inputToken),
            amount,
            receiptToken,
            500,
            address(this),
            9999,
            "0x"
        );
        // approveOrIncreaseAllowance(
        //     IERC20(receiptToken),
        //     address(stakingVault),
        //     amountOut
        // );
        console.log(
            "balance after swap: %s",
            IERC20(receiptToken).balanceOf(address(this))
        );
        // uint256 amountStaked = stakingVault.deposit(amountOut, address(this));
        // console.log("Deposited %s YUSD into stakingVault", amountOut);
        require(amountOut >= minAmountOut, "Insufficient output amount");
    }

    // function coolDown(uint256 assetAmount) external {
    //     // Cooldown the assets in the staking vault
    //     stakingVault.cooldownAssets(assetAmount, address(this));
    // }

    function _withdrawFundsFromYieldSource(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(assetAmount);

        // uint256 totalinYusd = IERC20(receiptToken).balanceOf(address(this));

        // stakingVault.unstake(address(this));

        // uint256 yusdOut = stakingVault.withdraw(
        //     assetAmount,
        //     address(this),
        //     address(this)
        // );

        // console.log("Withdrew %s YUSD from stakingVault", sharesToWithdraw);
        IERC20(receiptToken).transfer(address(swapHelper), sharesToWithdraw);
        console.log("Swapping %s YUSD to input token", sharesToWithdraw);
        uint256 amountOut = ISwapHelper(swapHelper).swap(
            receiptToken,
            sharesToWithdraw,
            address(inputToken),
            500,
            address(this),
            9999,
            "0x"
        );
        console.log("Swapped to %s input token", amountOut);
        require(amountOut >= minAmountOut, "Insufficient output amount");
        amountWithdrawn = amountOut;
    }

    function _transferAssetsToNewStrategy() internal override {
        BufferedTx memory txn = pendingByNonce[lastProcessedNonce + 1];

        if (IStrategy(txn.newStrategy).amanaVault() != amanaVault)
            revert InvalidAmanaVault();

        harvest();

        // Withdraw all BPT from the liquidity gauge
        uint256 totalinYusd = IERC20(receiptToken).balanceOf(address(this));

        // Transfer the LP tokens to the new strategy
        IERC20(receiptToken).transfer(txn.newStrategy, totalinYusd);

        IStrategy(txn.newStrategy).depositFromOldStrategy(
            totalinYusd,
            txn.minimumOut,
            lastProcessedNonce + 1
        );

        emit AssetsTransferredToNewStrategy(
            txn.newStrategy,
            totalinYusd,
            lastProcessedNonce + 1
        );
    }

    /**
     * @dev Handles deposits from an old strategy into this strategy during a strategy switch.
     *      This function ensures the deposit comes from the old strategy, updates the execution nonce, and invests the funds.
     * @param currentExecutionNonce The current execution nonce from the old strategy.
     */
    function depositFromOldStrategy(
        uint256 amount,
        uint256 minimumSharesOut,
        uint256 currentExecutionNonce
    ) external override {
        if (oldStrategy == address(0)) revert OldStrategyNotSet();
        if (msg.sender != oldStrategy) revert NotAuthorized();

        lastProcessedNonce = currentExecutionNonce;

        emit AssetsReceivedFromOldStrategy(
            oldStrategy,
            amount,
            currentExecutionNonce
        );

        oldStrategy = address(0);
    }

    function totalUnderlyingAssets() public view override returns (uint256) {
        // uint256 staked = stakingVault.balanceOf(address(this));
        uint256 held = IERC20(receiptToken).balanceOf(address(this));
        // uint256 total = staked + held;
        return held > 0 ? convertToAssets(held) : 0;
    }

    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256 assets) {
        // assumes YUSD:USDC is 1:1
        return shares;
    }

    function convertToShares(
        uint256 assets
    ) public view override returns (uint256 shares) {
        // assumes YUSD:USDC is 1:1
        return assets;
    }

    function getStrategyWithdrawShareAmount(
        uint256 assetAmount
    ) public view override returns (uint256 withdrawShareAmount) {
        uint256 totalShares = IERC20(receiptToken).balanceOf(address(this));
        console.log("Total shares in strategy: %s", totalShares);
        uint256 sharesToWithdraw = convertToShares(assetAmount);
        console.log(
            "Shares to withdraw based on asset amount: %s",
            sharesToWithdraw
        );
        if (sharesToWithdraw > totalShares) {
            sharesToWithdraw = totalShares;
        }
        if (totalShares > 0 && totalShares - sharesToWithdraw <= 1e9) {
            sharesToWithdraw = totalShares;
        }
        console.log("Final shares to withdraw: %s", sharesToWithdraw);
        return sharesToWithdraw;
    }
}
