// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./ERC20StrategyParent.sol";

import "../interfaces/ISwapHelper.sol";
import "../interfaces/I4626Vault.sol";

import "hardhat/console.sol";

contract YieldFiERC20Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    address public receiptToken;
    uint256 public inputTokenIndex;

    function initialize(
        string memory _name,
        address _gatewayAddress,
        address _amanaVault,
        address _withdrawHelper,
        address _swapHelper,
        address _receiptTokenAddress, // this is YUSD
        address _inputTokenAddress, // inputToken
        address, // _liquidityGaugeAddress, // this is the YUSD staking gauge
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
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minAmountOut
    ) internal override {
        // need to check if we swap USDC into YUSD first, or if we can directly deposit USDC into the sYUSD 4626 vault
        // swap USDC into YUSD - either uniswap or curve on BNB
        // need to create a BNB swapHelper for this
        // stake YUSD into sYUSD
        // check min out
        require(amount > 0, "Deposit amount must be greater than zero");

        console.log(
            "Depositing %s of input token %s into swapHelper",
            amount,
            address(inputToken)
        );
        approveOrIncreaseAllowance(inputToken, address(receiptToken), amount);

        // Swap input token to receipt token (YUSD)
        uint256 amountOut = I4626Vault(receiptToken).deposit(
            amount,
            address(this)
        );
        console.log(
            "Amount out after swap from %s to %s: %s",
            address(inputToken),
            receiptToken,
            amountOut
        );
        require(amountOut >= minAmountOut, "Insufficient output amount");
    }

    function _withdrawFundsFromYieldSource(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        harvest();
        uint256 yusdToWithdraw = getStrategyWithdrawShareAmount(assetAmount);
        uint256 amountOut = I4626Vault(receiptToken).redeem(
            yusdToWithdraw,
            address(this),
            address(this)
        );

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
        uint256 assetAmount
    ) public view override returns (uint256 withdrawShareAmount) {
        uint256 totalinYusd = IERC20(receiptToken).balanceOf(address(this));
        uint256 yusdToWithdraw = convertToShares(assetAmount);
        console.log(
            "Shares to withdraw based on asset amount %s: %s",
            assetAmount,
            yusdToWithdraw
        );
        if (yusdToWithdraw > totalinYusd) {
            yusdToWithdraw = totalinYusd;
            console.log(
                "Rounding down to withdraw full staked balance: %s",
                yusdToWithdraw
            );
        }
        if (totalinYusd > 0 && totalinYusd - yusdToWithdraw <= 1e3) {
            yusdToWithdraw = totalinYusd;
            console.log(
                "Rounding up to withdraw full staked balance: %s",
                yusdToWithdraw
            );
        }
    }
}
