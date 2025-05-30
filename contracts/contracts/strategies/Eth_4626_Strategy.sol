// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/I4626Vault.sol";
import "../interfaces/IWrappedTokenGatewayV3.sol";
import "../interfaces/IWETH.sol";
import "./EthStrategyParent.sol";

// Moonwell Eth vault: 0xa0E430870c4604CcfC7B38Ca7845B1FF653D0ff1
// Base Weth: 0x4200000000000000000000000000000000000006

/// @title Eth_4626_Strategy
/// @notice Base contract for Ethereum-based strategies using Aave and ZetaChain.
/// @dev Handles ETH investments and divestments for strategies on EVM-compatible chains.
contract Eth_4626_Strategy is EthStrategyParent {
    using SafeERC20 for IERC20;

    IWETH public weth;
    I4626Vault public receiptToken;

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _receiptTokenAddress Address of the Aave receipt token.
    /// @param _gateway Address of the ZetaChain Gateway.
    /// @param _wethAddress Address of the WETH contract.
    function initialize(
        string memory _name,
        address _amanaVault,
        address _receiptTokenAddress,
        address _gateway,
        address _wethAddress,
        address _withdrawHelper
    ) external initializer {
        __StrategyParent_init(_name, _amanaVault, _gateway, _withdrawHelper);

        receiptToken = I4626Vault(_receiptTokenAddress);
        weth = IWETH(_wethAddress);
    }

    /// @notice deposits funds into the yield source.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal override {
        weth.deposit{value: amount}();
        approveOrIncreaseAllowance(IERC20(weth), address(receiptToken), amount);

        uint256 shares = receiptToken.deposit(amount, address(this));
        if (shares < minimumOut) {
            revert InsufficientOut();
        }
    }

    /// @notice Withdraws funds from the Aave pool.
    /// @param fractionToWithdraw Fraction of shares to be withdrawn.
    /// @param minAmountOut Minimum amount of ETH to be withdrawn.
    function _withdrawFundsFromYieldSource(
        uint256 fractionToWithdraw,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(
            fractionToWithdraw
        );

        amountWithdrawn = receiptToken.redeem(
            sharesToWithdraw,
            address(this), // receiver
            address(this) // owner
        );
        if (amountWithdrawn < minAmountOut) {
            revert InsufficientOut();
        }
        weth.withdraw{gas: 50000}(amountWithdrawn);
    }

    function getStrategyWithdrawShareAmount(
        uint256 fractionOfTotalShares
    ) public view override returns (uint256) {
        uint256 totalShares = receiptToken.balanceOf(address(this));
        uint256 withdrawShareAmount = (fractionOfTotalShares *
            totalShares +
            5e17) / 1e18;
        if (withdrawShareAmount > totalShares) {
            withdrawShareAmount = totalShares;
        }
        return withdrawShareAmount;
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
