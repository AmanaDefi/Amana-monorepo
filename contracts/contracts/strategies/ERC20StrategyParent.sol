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

    /// @notice Invests ETH into the Aave pool.
    /// @param userAddress Address of the user whose funds are being invested.
    /// @param amount Amount of ETH to invest.
    /// @param _executionNonce Current execution nonce for the transaction.
    /// @param _crossChainTxId Cross-chain transaction ID.
    function _invest(
        address userAddress,
        uint256 amount,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) internal override {
        uint256 totalUnderlyingAssetsBefore = totalUnderlyingAssets();
        bool success = inputToken.transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!success) {
            revert TransferFailed();
        }
        _depositFundsIntoYieldSource(amount);

        _sendInvestConfirmation(
            userAddress,
            amount,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssets(),
            _executionNonce,
            _crossChainTxId
        );

        emit FundsInvested(_crossChainTxId, userAddress, amount);
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
        inputToken.approve(_GATEWAY_ADDRESS, amount);

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
        uint256 currentExecutionNonce,
        uint256 _crossChainTxId
    ) external {
        if (oldStrategy == address(0)) revert OldStrategyNotSet();
        if (msg.sender != oldStrategy) revert Unauthorized();
        if (amount == 0) revert NoFundsReceived();
        executionNonce = currentExecutionNonce + 1;
        _invest(address(0), amount, currentExecutionNonce, _crossChainTxId);
        oldStrategy = address(0);
    }

    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance == 0) {
            revert NothingToWithdraw();
        }
        inputToken.safeTransfer(owner(), balance);
    }
}
