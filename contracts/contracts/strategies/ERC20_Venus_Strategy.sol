// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IVToken.sol";
import "./ERC20StrategyParent.sol";

// USDT_ADDRESS = 0x55d398326f99059fF775485246999027B3197955;
// VENUS_USDT_ADDRESS = 0xfD5840Cd36d94D7229439859C0112a4185BC0255;

/// @title ERC20_Venus_Strategy
/// @notice Contract for strategy depositing USDT into Venus on BSC.
/// @dev Handles USDC investments and divestments for strategies on EVM-compatible chains.
contract ERC20_Venus_Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    IVToken public immutable receiptToken;

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _inputTokenAddress Address of the input token.
    /// @param _receiptTokenAddress Address of the Aave receipt token.
    /// @param _gateway Address of the ZetaChain Gateway.
    constructor(
        string memory _name,
        address _amanaVault,
        address _inputTokenAddress,
        address _receiptTokenAddress,
        address _gateway
    )
        StrategyParent(_name, _amanaVault, _gateway)
        ERC20StrategyParent(_inputTokenAddress)
    {
        receiptToken = IVToken(_receiptTokenAddress);
    }

    /// @notice Deposits funds into the yield source.
    /// @param amount Amount to be deposited.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal override {
        uint initialBalance = receiptToken.balanceOf(address(this));
        approveOrIncreaseAllowance(inputToken, address(receiptToken), amount);
        receiptToken.mint(amount);
        uint finalBalance = receiptToken.balanceOf(address(this));
        uint shares = finalBalance - initialBalance;
        if (shares < minimumOut) {
            revert InsufficientOut();
        }
    }

    /**
     * @notice Withdraws funds from the configured yield source.
     * @param fractionToWithdraw The fraction of shares to withdraw from the yield source.
     * @param minAmountOut The minimum amount of USDC to withdraw.
     * @return amountWithdrawn The amount of funds successfully withdrawn.
     */
    function _withdrawFundsFromYieldSource(
        uint256 fractionToWithdraw,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(
            fractionToWithdraw
        );
        uint256 initialBalance = IERC20(inputToken).balanceOf(address(this));

        receiptToken.redeem(sharesToWithdraw);
        uint256 finalBalance = IERC20(inputToken).balanceOf(address(this));
        amountWithdrawn = finalBalance - initialBalance;
        if (amountWithdrawn < minAmountOut) {
            revert InsufficientOut();
        }
        return amountWithdrawn;
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

    /**
     * @notice Transfers assets from the current strategy to a new strategy.
     * @dev This function is intended to be overridden in derived contracts to define specific transfer logic.
     * @param newStrategy The address of the new strategy contract.
     * @param currentExecutionNonce The current execution nonce for the transaction.
     * @param _crossChainTxId The cross-chain transaction ID.
     */
    function _transferAssetsToNewStrategy(
        uint256 minAmountOut,
        uint256 minimumSharesOut,
        address newStrategy,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) internal override {
        uint256 amountWithdrawn = _withdrawFundsFromYieldSource(
            1e18,
            minAmountOut
        );

        approveOrIncreaseAllowance(inputToken, newStrategy, amountWithdrawn);
        IStrategy(newStrategy).depositFromOldStrategy(
            amountWithdrawn,
            minimumSharesOut,
            currentExecutionNonce,
            _crossChainTxId
        );
        emit AssetsTransferredToNewStrategy(
            newStrategy,
            amountWithdrawn,
            currentExecutionNonce,
            _crossChainTxId
        );
    }

    /// @notice Gets the total assets held in the strategy.
    /// @return Total assets as an unsigned integer.
    function totalUnderlyingAssets() public view override returns (uint256) {
        uint256 vTokenBalance = receiptToken.balanceOf(address(this));
        uint256 exchangeRate = receiptToken.exchangeRateStored();
        return (vTokenBalance * exchangeRate) / (10 ** 18);
    }

    function convertToShares(
        uint256 assetAmount
    ) public view override returns (uint256) {
        uint256 exchangeRate = receiptToken.exchangeRateStored();
        return (assetAmount * (10 ** 18)) / exchangeRate;
    }

    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256) {
        uint256 exchangeRate = receiptToken.exchangeRateStored();
        return (shares * exchangeRate) / (10 ** 18);
    }
}
