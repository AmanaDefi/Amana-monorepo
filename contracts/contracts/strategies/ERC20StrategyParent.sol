// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./StrategyParent.sol";

/// @title ERC20StrategyParent
/// @notice Base contract for cross-chain investment strategies.
/// @dev Handles common logic for investing, divesting, and cross-chain messaging.
abstract contract ERC20StrategyParent is StrategyParent {
    using SafeERC20 for IERC20;

    IERC20 public immutable inputToken;

    constructor(address _inputTokenAddress) {
        inputToken = IERC20(_inputTokenAddress);
    }

    /// @notice Invests ERC20 into the yield source.
    /// @param receiverAddress Address of the user whose funds are being invested.
    /// @param amount Amount of ERC20 to invest.
    /// @param _executionNonce Current execution nonce for the transaction.
    /// @param _crossChainTxId Cross-chain transaction ID.
    function _invest(
        address receiverAddress,
        uint256 amount,
        uint256 minimumOut,
        uint256 _executionNonce,
        bytes32 _crossChainTxId
    ) internal virtual override {
        SafeERC20.safeTransferFrom(
            inputToken,
            msg.sender,
            address(this),
            amount
        );
        _depositFundsIntoYieldSource(amount, minimumOut);
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
        approveOrIncreaseAllowance(inputToken, _GATEWAY_ADDRESS, amount);

        IGatewayEVM(_GATEWAY_ADDRESS).depositAndCall(
            amanaVault,
            amount,
            address(inputToken),
            outgoingMessage,
            revertOptions
        );
    }

    /**
     * @dev Handles deposits from an old strategy into this strategy during a strategy switch.
     *      This function ensures the deposit comes from the old strategy, updates the execution nonce, and invests the funds.
     * @param amount The amount of funds being transferred.
     * @param currentExecutionNonce The current execution nonce from the old strategy.
     * @param _crossChainTxId The cross-chain transaction ID associated with this deposit.
     */
    function depositFromOldStrategy(
        uint256 amount,
        uint256 minimumOut,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) external virtual {
        if (oldStrategy == address(0)) revert OldStrategyNotSet();
        if (msg.sender != oldStrategy) revert NotAuthorized();
        if (amount == 0) revert NoFundsReceived();
        lastProcessedNonce = currentExecutionNonce;
        _invest(
            address(0),
            amount,
            minimumOut,
            currentExecutionNonce,
            _crossChainTxId
        );
        oldStrategy = address(0);
    }

    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance == 0) {
            revert NothingToWithdraw();
        }
        IERC20(_token).safeTransfer(owner(), balance);
    }
}
