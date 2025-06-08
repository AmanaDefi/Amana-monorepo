// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./StrategyParent.sol";

/// @title ERC20StrategyParent
/// @notice Base contract for cross-chain investment strategies.
/// @dev Handles common logic for investing, divesting, and cross-chain messaging.
abstract contract ERC20StrategyParent is StrategyParent {
    using SafeERC20 for IERC20;

    /// @notice Invests ERC20 into the yield source.

    function _invest() internal virtual override {
        BufferedTx memory txn = pendingByNonce[lastProcessedNonce + 1];

        uint256 totalUnderlyingAssetsBefore = totalUnderlyingAssets();
        _depositFundsIntoYieldSource(txn.assetAmount, txn.minimumOut);
        _sendInvestConfirmation(
            totalUnderlyingAssets() - totalUnderlyingAssetsBefore,
            totalUnderlyingAssets(),
            lastProcessedNonce + 1
        );
        emit FundsInvested(
            lastProcessedNonce + 1,
            txn.assetAmount,
            totalUnderlyingAssets()
        );
    }

    /**
     * @dev Sends a deposit and calls the `amanaVault` with the specified outgoing message and revert options.
     * @param amount The amount of native tokens to send with the transaction.
     * @param amanaVault The address of the vault to which the deposit and call are sent.
     * @param outgoingMessage The payload to be passed to the `amanaVault`.
     * @param revertOptions Options specifying how to handle transaction reverts.
     */
    function _sendDepositAndCall(
        uint256 amount,
        address amanaVault,
        bytes memory outgoingMessage,
        RevertOptions memory revertOptions
    ) internal override {
        approveOrIncreaseAllowance(inputToken, _GATEWAY_ADDRESS, amount);

        IGatewayEVM(_GATEWAY_ADDRESS).depositAndCall(
            amanaVault,
            amount,
            address(inputToken),
            outgoingMessage,
            revertOptions
        );
    }

    function _transferAssetsToNewStrategy() internal virtual override {
        BufferedTx memory txn = pendingByNonce[lastProcessedNonce + 1];

        if (IStrategy(txn.newStrategy).amanaVault() != amanaVault) {
            revert InvalidAmanaVault();
        }
        uint256 totalShares = IERC20(receiptTokenAddress).balanceOf(
            address(this)
        );
        approveOrIncreaseAllowance(
            IERC20(receiptTokenAddress),
            txn.newStrategy,
            totalShares
        );

        IStrategy(txn.newStrategy).depositFromOldStrategy(
            totalShares,
            txn.minimumOut,
            lastProcessedNonce + 1
        );
        emit AssetsTransferredToNewStrategy(
            txn.newStrategy,
            totalShares,
            lastProcessedNonce + 1
        );
    }

    /**
     * @dev Handles deposits from an old strategy into this strategy during a strategy switch.
     *      This function ensures the deposit comes from the old strategy, updates the execution nonce, and invests the funds.
     * @param amount The amount of funds being transferred.
     * @param currentExecutionNonce The current execution nonce from the old strategy.
     */
    function depositFromOldStrategy(
        uint256 amount,
        uint256 minimumOut,
        uint256 currentExecutionNonce,
        bytes32
    ) external virtual {
        if (oldStrategy == address(0)) revert OldStrategyNotSet();
        if (msg.sender != oldStrategy) revert NotAuthorized();
        if (amount == 0) revert NoFundsReceived();
        lastProcessedNonce = currentExecutionNonce - 1;
        IERC20(inputToken).safeTransferFrom(oldStrategy, address(this), amount);
        _invest();
        emit AssetsReceivedFromOldStrategy(
            oldStrategy,
            amount,
            currentExecutionNonce
        );
        oldStrategy = address(0);
    }

    function swapToInputToken(
        address token,
        uint256 amountIn,
        uint16 initialSlippageBps
    ) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;

        IERC20(token).safeTransfer(swapHelper, amountIn);

        uint16 maxDeadline = uint16(block.timestamp + 1 hours);
        uint16 slippage = initialSlippageBps;

        // Retry with increasing slippage up to 10% (1000 bps)
        while (slippage <= 1000) {
            try
                ISwapHelper(swapHelper).swap(
                    token,
                    amountIn,
                    address(inputToken),
                    slippage,
                    address(this),
                    maxDeadline,
                    ""
                )
            returns (uint256 result) {
                emit RewardsHarvested(token, amountIn, result);
                return result;
            } catch {
                emit SwapFailed(token, amountIn, "Swap attempt failed");
            }

            slippage += 100; // increase slippage by 1% (100 bps)
        }

        // Swap failed even after max attempts
        return 0;
    }

    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance == 0) {
            revert NothingToWithdraw();
        }
        IERC20(_token).safeTransfer(owner(), balance);
    }
}
