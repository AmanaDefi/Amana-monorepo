// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IBeefyVault.sol";
import "../interfaces/IWETH.sol";
import "./EthStrategyParent.sol";

// Beefy WETH receipt token 0x0A2Bc5Bd33bac3C34551C67Af3657451911518Fa
// Base WETH 0x4200000000000000000000000000000000000006

/// @title BeefyStrategy
/// @notice Base contract for USDC strategies using Beefy.
/// @dev Handles USDC investments and divestments for strategies on EVM-compatible chains.
contract BeefyETHStrategy is EthStrategyParent {
    using SafeERC20 for IERC20;
    IWETH public immutable weth;
    IBeefyVault public immutable receiptToken;

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _receiptTokenAddress Address of the Aave receipt token.
    /// @param _gateway Address of the ZetaChain Gateway.
    constructor(
        string memory _name,
        address _amanaVault,
        address _receiptTokenAddress,
        address _gateway,
        address _wethAddress
    ) StrategyParent(_name, _amanaVault, _gateway) {
        receiptToken = IBeefyVault(_receiptTokenAddress);
        weth = IWETH(_wethAddress);
    }

    /// @notice Deposits funds into the yield source.
    /// @param amount Amount to be deposited.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minSharesOut
    ) internal override {
        weth.deposit{value: amount}();

        uint256 initialBalance = receiptToken.balanceOf(address(this));

        approveOrIncreaseAllowance(IERC20(weth), address(receiptToken), amount);
        receiptToken.deposit(amount);

        uint256 finalBalance = receiptToken.balanceOf(address(this));
        uint256 shares = finalBalance - initialBalance;

        if (shares < minSharesOut) {
            revert InsufficientOut();
        }
    }

    /**
     * @notice Withdraws funds from the configured yield source.
     * @param amount The amount of funds to withdraw from the yield source.
     * @return amountWithdrawn The amount of funds successfully withdrawn.
     */
    function _withdrawFundsFromYieldSource(
        uint256 amount
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 shares = convertToShares(amount);
        receiptToken.withdraw(shares);
        weth.withdraw{gas: 50000}(amountWithdrawn);

        return shares;
    }

    /**
     * @notice Transfers assets from the current strategy to a new strategy.
     * @dev This function is intended to be overridden in derived contracts to define specific transfer logic.
     * @param newStrategy The address of the new strategy contract.
     * @param currentExecutionNonce The current execution nonce for the transaction.
     * @param _crossChainTxId The cross-chain transaction ID.
     */
    function _transferAssetsToNewStrategy(
        uint256 maxStrategySharesBurnt,
        uint256 minimumSharesOut,
        address newStrategy,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) internal override {
        uint256 strategyTotalBalance = receiptToken.balanceOf(address(this));
        _withdrawFundsFromYieldSource(strategyTotalBalance);

        weth.deposit{value: strategyTotalBalance}();
        approveOrIncreaseAllowance(weth, newStrategy, strategyTotalBalance);

        IStrategy(newStrategy).depositFromOldStrategy{
            value: strategyTotalBalance
        }(
            strategyTotalBalance,
            minimumSharesOut,
            currentExecutionNonce,
            _crossChainTxId
        );
        emit AssetsTransferredToNewStrategy(
            newStrategy,
            strategyTotalBalance,
            currentExecutionNonce,
            _crossChainTxId
        );
    }

    /// @notice Gets the total assets held in the strategy.
    /// @return Total assets as an unsigned integer.
    function totalUnderlyingAssets() public view override returns (uint256) {
        uint256 shares = receiptToken.balanceOf(address(this));

        return (shares * receiptToken.getPricePerFullShare()) / 1e18;
    }

    function convertToShares(
        uint256 amount
    ) public view override returns (uint256) {
        return (amount * 1e18) / receiptToken.getPricePerFullShare();
    }
}
