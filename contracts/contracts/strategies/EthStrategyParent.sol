// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./StrategyParent.sol";

/// @title EthStrategyParent
/// @notice Base contract for cross-chain investment strategies.
/// @dev Handles common logic for investing, divesting, and cross-chain messaging.
abstract contract EthStrategyParent is StrategyParent {
    using SafeERC20 for IERC20;

    /// @notice Invests ETH into the Aave pool.
    /// @param receiverAddress Address of the user whose funds are being invested.
    /// @param amount Amount of ETH to invest.
    /// @param _executionNonce Current execution nonce for the transaction.
    /// @param _crossChainTxId Cross-chain transaction ID.
    function _invest(
        address receiverAddress,
        uint256 amount,
        uint256 minimumOut,
        uint256 _executionNonce,
        bytes32 _crossChainTxId
    ) internal override {
        if (msg.value == 0) revert NoFundsReceived();

        _depositFundsIntoYieldSource(msg.value, minimumOut);

        _sendInvestConfirmation(
            receiverAddress,
            amount,
            totalUnderlyingAssets(),
            _executionNonce,
            _crossChainTxId
        );

        emit FundsInvested(_crossChainTxId, receiverAddress, amount);
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
     * @dev Handles deposits from an old strategy into this strategy during a strategy switch.
     *      This function ensures the deposit comes from the old strategy, updates the execution nonce, and invests the funds.
     * @param currentExecutionNonce The current execution nonce from the old strategy.
     * @param _crossChainTxId The cross-chain transaction ID associated with this deposit.
     */
    function depositFromOldStrategy(
        uint256,
        uint256 minimumOut,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) external payable {
        if (oldStrategy == address(0)) revert OldStrategyNotSet();
        if (msg.sender != oldStrategy) revert NotAuthorized();
        if (msg.value == 0) revert NoFundsReceived();
        executionNonce = currentExecutionNonce + 1;
        _invest(
            address(0),
            msg.value,
            minimumOut,
            currentExecutionNonce,
            _crossChainTxId
        );
        oldStrategy = address(0);
    }

    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) {
            revert NothingToWithdraw();
        }
        (bool success, ) = owner().call{value: balance}("");
        if (!success) {
            revert IErrors.TransferFailed();
        }
    }

    /// @notice Allows the contract to receive ETH.
    receive() external payable {}
}
