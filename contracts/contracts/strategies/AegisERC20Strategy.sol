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
        uint256 minAmountOut
    ) internal override {
        require(amount > 0, "Deposit amount must be greater than zero");

        IERC20(inputToken).transfer(address(swapHelper), amount);

        // Swap input token to receipt token (YUSD)
        uint256 amountOut = ISwapHelper(swapHelper).swap(
            address(inputToken),
            amount,
            receiptToken,
            500,
            address(this),
            9999,
            "0x"
        );
        approveOrIncreaseAllowance(
            IERC20(receiptToken),
            address(stakingVault),
            amountOut
        );

        uint256 amountStaked = stakingVault.deposit(amountOut, address(this));
        console.log("Deposited %s YUSD into stakingVault", amountOut);
        require(amountStaked >= minAmountOut, "Insufficient output amount");
    }

    function coolDown(uint256 assetAmount) external {
        // Cooldown the assets in the staking vault
        stakingVault.cooldownAssets(assetAmount, address(this));
    }

    function _withdrawFundsFromYieldSource(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        // uint256 totalinYusd = IERC20(receiptToken).balanceOf(address(this));

        stakingVault.unstake(address(this));

        // uint256 yusdOut = stakingVault.withdraw(
        //     assetAmount,
        //     address(this),
        //     address(this)
        // );
        console.log("Withdrew %s YUSD from stakingVault", assetAmount);
        IERC20(receiptToken).transfer(address(swapHelper), assetAmount);
        console.log("Swapping %s YUSD to input token", assetAmount);
        uint256 amountOut = ISwapHelper(swapHelper).swap(
            receiptToken,
            assetAmount,
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
        uint256 total = IERC20(receiptToken).balanceOf(address(this));
        return total > 0 ? convertToAssets(total) : 0;
    }

    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256 assets) {
        if (address(inputToken) == receiptToken || shares == 0) {
            return shares;
        }

        try
            ISwapHelper(swapHelper).getPathV3(receiptToken, address(inputToken))
        returns (
            address[] memory path,
            uint24[] memory feeTiers,
            bytes memory /* encodedPath */
        ) {
            if (path.length == 0 || feeTiers.length == 0) {
                return shares; // fallback to 1:1 if no path found
            }

            try
                ISwapHelper(swapHelper).getAmountOutV3(shares, path, feeTiers)
            returns (uint amountOut) {
                return amountOut;
            } catch {
                return shares; // fallback if price estimation fails
            }
        } catch {
            return shares; // fallback if path retrieval fails
        }
    }

    function convertToShares(
        uint256 assets
    ) public view override returns (uint256 shares) {
        if (address(inputToken) == receiptToken || assets == 0) {
            return assets;
        }

        try
            ISwapHelper(swapHelper).getPathV3(address(inputToken), receiptToken)
        returns (
            address[] memory path,
            uint24[] memory feeTiers,
            bytes memory /* encodedPath */
        ) {
            if (path.length == 0 || feeTiers.length == 0) {
                return assets; // fallback to 1:1 if no path found
            }

            try
                ISwapHelper(swapHelper).getAmountOutV3(assets, path, feeTiers)
            returns (uint amountOut) {
                return amountOut;
            } catch {
                return assets; // fallback if price estimation fails
            }
        } catch {
            return assets; // fallback if path retrieval fails
        }
    }

    function getStrategyWithdrawShareAmount(
        uint256 fractionOfTotalShares
    ) public view override returns (uint256 withdrawShareAmount) {}
}
