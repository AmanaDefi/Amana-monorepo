// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./StrategyParent.sol";

/// @title EthStrategyParent
/// @notice Base contract for cross-chain investment strategies.
/// @dev Handles common logic for investing, divesting, and cross-chain messaging.
abstract contract EthStrategyParent is StrategyParent {
    using SafeERC20 for IERC20;

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
        require(msg.value > 0, "No ETH sent");

        uint256 totalUnderlyingAssetsBefore = totalUnderlyingAssets();
        _depositFundsIntoYieldSource(msg.value);

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

    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        payable(owner()).transfer(balance);
    }

    /// @notice Allows the contract to receive ETH.
    receive() external payable {}
}
