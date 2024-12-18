// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./EVMStrategy.sol";

/// @title EVMERC20Strategy
/// @notice Base contract for cross-chain investment strategies.
/// @dev Handles common logic for investing, divesting, and cross-chain messaging.
abstract contract EVMERC20Strategy is EVMStrategy {
    using SafeERC20 for IERC20;

    IERC20 public immutable inputToken;

    constructor(address _inputTokenAddress) {
        inputToken = IERC20(_inputTokenAddress);
    }

    /// @notice Invests ETH into the Aave pool.
    /// @param userAddress Address of the user whose funds are being invested.
    /// @param amount Amount of ETH to invest.
    /// @param _executionNonce Current execution nonce for the transaction.
    function _invest(
        address userAddress,
        uint256 amount,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) internal override {
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
    function _divest(
        address userAddress,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 withdrawChainId,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) internal override {
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
            false,
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

    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        inputToken.safeTransfer(owner(), balance);
    }
}
