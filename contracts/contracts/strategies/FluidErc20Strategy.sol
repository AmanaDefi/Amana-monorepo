// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/I4626Vault.sol";
import "./ERC20StrategyParent.sol";

// Fluid pool 0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169
// input token USDC on Base 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

/// @title FluidErc20Strategy
/// @notice Base contract for USDC strategies using Fluid protocol.
/// @dev Handles USDC investments and divestments for strategies on EVM-compatible chains.
contract FluidErc20Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    I4626Vault public receiptToken;

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _gatewayAddress Address of the ZetaChain Gateway.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _withdrawHelper Address of the withdraw helper contract.
    /// @param _receiptTokenAddress Address of the Aave receipt token.
    /// @param _inputTokenAddress Address of the input token for the strategy.
    function initialize(
        string memory _name,
        address _gatewayAddress,
        address _amanaVault,
        address _withdrawHelper,
        address, // _swapHelper — not needed
        address _receiptTokenAddress, // receiptTokenAddress
        address _inputTokenAddress, // inputToken
        address /* rewardsContractAddress — not needed */,
        address /* _rewardsTokenAddress — not needed */,
        uint256 /* _inputTokenIndex — not needed */
    ) external initializer {
        __StrategyParent_init(
            _name,
            _amanaVault,
            _gatewayAddress,
            _withdrawHelper,
            _inputTokenAddress,
            _receiptTokenAddress
        );

        receiptToken = I4626Vault(_receiptTokenAddress);
    }

    /// @notice Deposits funds into the yield source.
    /// @param amount Amount to be deposited.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut,
        TxType /* txType */
    ) internal override {
        approveOrIncreaseAllowance(inputToken, address(receiptToken), amount);

        uint256 shares = receiptToken.deposit(amount, address(this));
        if (shares < minimumOut) {
            revert InsufficientOut();
        }
    }

    /**
     * @notice Withdraws funds from the configured yield source.
     * @param assetAmount The amount of assets to withdraw from the yield source.
     * @param minAmountOut The maximum number of strategy shares that can be burnt.
     * @return amountWithdrawn The amount of funds successfully withdrawn.
     */
    function _withdrawFundsFromYieldSource(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(assetAmount);
        amountWithdrawn = receiptToken.redeem(
            sharesToWithdraw,
            address(this), // receiver
            address(this) // owner
        );
        if (amountWithdrawn < minAmountOut) {
            revert InsufficientOut();
        }
    }

    function getStrategyWithdrawShareAmount(
        uint256 assetAmount
    ) public view override returns (uint256) {
        uint256 totalShares = receiptToken.balanceOf(address(this));
        uint256 sharesToWithdraw = convertToShares(assetAmount);
        if (sharesToWithdraw > totalShares) {
            sharesToWithdraw = totalShares;
        }
        if (totalShares > 0 && totalShares - sharesToWithdraw <= 1e3) {
            sharesToWithdraw = totalShares;
        }
        return sharesToWithdraw;
    }

    /// @notice Gets the total assets held in the strategy.
    /// @return Total assets as an unsigned integer.
    function totalUnderlyingAssets() public view override returns (uint256) {
        uint256 shares = receiptToken.balanceOf(address(this));
        return receiptToken.convertToAssets(shares);
    }

    function convertToShares(
        uint256 assetAmount
    ) public view override returns (uint256) {
        return receiptToken.convertToShares(assetAmount);
    }

    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256) {
        return receiptToken.convertToAssets(shares);
    }
}
