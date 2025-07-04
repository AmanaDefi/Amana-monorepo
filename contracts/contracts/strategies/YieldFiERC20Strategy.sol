// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./ERC20StrategyParent.sol";

import "../interfaces/ISwapHelper.sol";
import "../interfaces/I4626Vault.sol";

import "../interfaces/IYieldFiManager.sol";

import "hardhat/console.sol";

contract YieldFiERC20Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    address public manager;

    function initialize(
        string memory _name,
        address _gatewayAddress,
        address _amanaVault,
        address _withdrawHelper,
        address _swapHelper,
        address _receiptTokenAddress, // this is YUSD
        address _inputTokenAddress, // inputToken
        address _manager, // _liquidityGaugeAddress, // this is the YUSD staking gauge
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

        manager = _manager; // 0x03ACc35286bAAE6D73d99a9f14Ef13752208C8dC;
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minAmountOut
    ) internal override {
        require(amount > 0, "Deposit amount must be greater than zero");

        approveOrIncreaseAllowance(inputToken, receiptTokenAddress, amount);

        uint256 amountOut = I4626Vault(receiptTokenAddress).deposit(
            amount,
            address(this)
        );
        // approveOrIncreaseAllowance(IERC20(inputToken), manager, amount);
        // uint256 inputTokenBalanceBefore = inputToken.balanceOf(address(this));
        // IYieldFiManager(manager).deposit(
        //     receiptTokenAddress,
        //     address(inputToken),
        //     amount,
        //     address(this),
        //     address(this),
        //     "",
        //     bytes32(0)
        // );

        // uint256 inputTokenBalanceAfter = inputToken.balanceOf(address(this));
        // uint256 amountOut = inputTokenBalanceBefore - inputTokenBalanceAfter;
        require(amountOut >= minAmountOut, "Insufficient output amount");
    }

    function _withdrawFundsFromYieldSource(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 vyusdToWithdraw = getStrategyWithdrawShareAmount(assetAmount);

        approveOrIncreaseAllowance(
            IERC20(receiptTokenAddress),
            address(this),
            vyusdToWithdraw
        );

        uint256 inputTokenBalanceBefore = inputToken.balanceOf(address(this));
        uint256 amountOut;
        console.log("YieldFiERC20Strategy: redeeming via I4626Vault");

        try
            I4626Vault(receiptTokenAddress).redeem(
                vyusdToWithdraw,
                address(this),
                address(this)
            )
        returns (uint256 redeemedAmount) {
            amountOut = redeemedAmount;
        } catch {
            console.log("YieldFiERC20Strategy: redeem failed, trying manager");
            // fallback: try redeem via manager
            IERC20(receiptTokenAddress).approve(manager, type(uint256).max);

            IYieldFiManager(manager).redeem(
                address(this),
                receiptTokenAddress,
                address(inputToken),
                vyusdToWithdraw,
                address(this),
                address(0),
                ""
            );

            uint256 inputTokenBalanceAfter = inputToken.balanceOf(
                address(this)
            );
            amountOut = inputTokenBalanceAfter - inputTokenBalanceBefore;
        }
        console.log(
            "YieldFiERC20Strategy: redeemed amount",
            amountOut,
            "vyusdToWithdraw",
            vyusdToWithdraw
        );
        uint256 inputTokenBalanceAfter = inputToken.balanceOf(address(this));
        console.log(
            "YieldFiERC20Strategy: inputToken balance after redeem",
            inputTokenBalanceAfter
        );
        require(amountOut >= minAmountOut, "Insufficient output amount");
        amountWithdrawn = amountOut;
    }

    function _transferAssetsToNewStrategy() internal override {
        BufferedTx memory txn = pendingByNonce[lastProcessedNonce + 1];

        if (IStrategy(txn.newStrategy).amanaVault() != amanaVault)
            revert InvalidAmanaVault();

        uint256 totalinvyUsd = IERC20(receiptTokenAddress).balanceOf(
            address(this)
        );

        // Transfer the LP tokens to the new strategy
        IERC20(receiptTokenAddress).transfer(txn.newStrategy, totalinvyUsd);

        IStrategy(txn.newStrategy).depositFromOldStrategy(
            totalinvyUsd,
            txn.minimumOut,
            lastProcessedNonce + 1
        );

        emit AssetsTransferredToNewStrategy(
            txn.newStrategy,
            totalinvyUsd,
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
        uint256, // minimumSharesOut
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
        uint256 total = IERC20(receiptTokenAddress).balanceOf(address(this));
        return total > 0 ? convertToAssets(total) : 0;
    }

    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256 assets) {
        assets = I4626Vault(receiptTokenAddress).convertToAssets(shares);
    }

    function convertToShares(
        uint256 assets
    ) public view override returns (uint256 shares) {
        shares = I4626Vault(receiptTokenAddress).convertToShares(assets);
    }

    function getStrategyWithdrawShareAmount(
        uint256 assetAmount
    ) public view override returns (uint256 yusdToWithdraw) {
        uint256 totalinvyUsd = IERC20(receiptTokenAddress).balanceOf(
            address(this)
        );
        yusdToWithdraw = convertToShares(assetAmount);

        if (yusdToWithdraw > totalinvyUsd) {
            yusdToWithdraw = totalinvyUsd;
        }
        if (totalinvyUsd > 0 && totalinvyUsd - yusdToWithdraw <= 1e9) {
            yusdToWithdraw = totalinvyUsd;
        }
    }
}
