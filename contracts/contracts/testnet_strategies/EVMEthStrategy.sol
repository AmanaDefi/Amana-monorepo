// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./EVMStrategy.sol";

/// @title EVMEthStrategy
/// @notice Base contract for cross-chain investment strategies.
/// @dev Handles common logic for investing, divesting, and cross-chain messaging.
abstract contract EVMEthStrategy is EVMStrategy {
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
    ) internal virtual override {
        require(msg.value > 0, "No ETH sent");

        uint256 totalUnderlyingAssetsBefore = totalUnderlyingAssets();
        _depositFundsIntoYieldSource(amount);

        bytes memory outgoingMessage = abi.encode(
            userAddress,
            address(0),
            amount,
            0,
            0,
            true,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssets(),
            _executionNonce,
            _crossChainTxId
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this),
            false,
            address(this),
            abi.encode("_investConfirmFailed", _crossChainTxId),
            uint256(1000000)
        );

        IGatewayEVM(_GATEWAY_ADDRESS).call(
            amanaVault,
            outgoingMessage,
            revertOptions
        );

        emit FundsInvested(_crossChainTxId, userAddress, amount);
    }

    /// @notice Withdraws funds from the Aave pool.
    /// @param userAddress Address of the user whose funds are being withdrawn.
    /// @param withdrawZRC20 ZRC20 token address for the withdrawal.
    /// @param amount Amount to withdraw.
    /// @param fee Gas fee for the transaction.
    /// @param withdrawChainId Chain ID for the withdrawal.
    /// @param _executionNonce Current execution nonce for the transaction.
    /// @param _crossChainTxId Cross-chain transaction ID.
    function _divest(
        address userAddress,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 withdrawChainId,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) internal virtual override {
        uint256 totalUnderlyingAssetsBefore = totalUnderlyingAssets();

        _withdrawFundsFromYieldSource(amount + fee);

        bytes memory outgoingMessage = abi.encode(
            userAddress,
            withdrawZRC20,
            amount,
            fee,
            withdrawChainId,
            false,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssets(),
            _executionNonce,
            _crossChainTxId
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this),
            true,
            address(this),
            abi.encode("_returnFundsFromStrategyFailed", _crossChainTxId),
            uint256(1000000)
        );

        IGatewayEVM(_GATEWAY_ADDRESS).depositAndCall{value: amount + fee}(
            amanaVault,
            outgoingMessage,
            revertOptions
        );

        emit FundsDivested(_crossChainTxId, userAddress, amount);
    }

    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        payable(owner()).transfer(balance);
    }

    /// @notice Allows the contract to receive ETH.
    receive() external payable {}
}
