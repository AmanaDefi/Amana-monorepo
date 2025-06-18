// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./StrategyParent.sol";

/// @title EthStrategyParent
/// @notice Base contract for cross-chain investment strategies.
/// @dev Handles common logic for investing, divesting, and cross-chain messaging.
abstract contract EthStrategyParent is StrategyParent {
    using SafeERC20 for IERC20;

    /// @notice Invests ETH into the Aave pool.
    function _invest() internal override {
        if (msg.value == 0) revert NoFundsReceived();
        BufferedTx memory txn = pendingByNonce[lastProcessedNonce + 1];
        uint256 totalUnderlyingAssetsBefore = totalUnderlyingAssets();

        _depositFundsIntoYieldSource(msg.value, txn.minimumOut);

        _sendInvestConfirmation(
            totalUnderlyingAssets() - totalUnderlyingAssetsBefore,
            totalUnderlyingAssets(),
            lastProcessedNonce + 1
        );

        emit FundsInvested(
            lastProcessedNonce + 1,
            msg.value,
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
        IGatewayEVM(_GATEWAY_ADDRESS).depositAndCall{value: amount}(
            amanaVault,
            outgoingMessage,
            revertOptions
        );
    }

    /**
     * @notice Transfers assets from the current strategy to a new strategy.
     * @dev This function is intended to be overridden in derived contracts to define specific transfer logic.
     */
    function _transferAssetsToNewStrategy() internal virtual override {
        BufferedTx memory txn = pendingByNonce[lastProcessedNonce + 1];
        if (IStrategy(txn.newStrategy).amanaVault() != amanaVault) {
            revert InvalidAmanaVault();
        }
        uint256 amountWithdrawn = _withdrawFundsFromYieldSource(
            1e18,
            txn.assetAmount
        );

        IStrategy(txn.newStrategy).depositFromOldStrategy{
            value: amountWithdrawn
        }(amountWithdrawn, txn.minimumOut, lastProcessedNonce + 1);
        emit AssetsTransferredToNewStrategy(
            txn.newStrategy,
            amountWithdrawn,
            lastProcessedNonce + 1
        );
    }

    /**
     * @dev Handles deposits from an old strategy into this strategy during a strategy switch.
     *      This function ensures the deposit comes from the old strategy, updates the execution nonce, and invests the funds.
     * @param currentExecutionNonce The current execution nonce from the old strategy.
     */
    function depositFromOldStrategy(
        uint256,
        uint256 minimumOut,
        uint256 currentExecutionNonce
    ) external payable virtual {
        if (oldStrategy == address(0)) revert OldStrategyNotSet();
        if (msg.sender != oldStrategy) revert NotAuthorized();
        if (msg.value == 0) revert NoFundsReceived();
        lastProcessedNonce = currentExecutionNonce;
        _invest();
        emit AssetsReceivedFromOldStrategy(
            oldStrategy,
            msg.value,
            currentExecutionNonce
        );
        oldStrategy = address(0);
    }

    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) {
            revert NothingToWithdraw();
        }
        (bool success, ) = payable(owner()).call{value: balance}("");
        if (!success) {
            revert IErrors.TransferFailed();
        }
    }

    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance == 0) {
            revert NothingToWithdraw();
        }
        IERC20(_token).safeTransfer(owner(), balance);
    }

    /// @notice Allows the contract to receive ETH.
    receive() external payable {}
}
