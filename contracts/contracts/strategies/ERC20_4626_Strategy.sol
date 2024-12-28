// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/I4626Vault.sol";
import "./ERC20StrategyParent.sol";

/// @title ERC20_4626_Strategy
/// @notice Base contract for USDC strategies using Aave and ZetaChain.
/// @dev Handles USDC investments and divestments for strategies on EVM-compatible chains.
contract ERC20_4626_Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    I4626Vault public immutable receiptToken;

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
        receiptToken = I4626Vault(_receiptTokenAddress);
    }

    /// @notice Deposits funds into the yield source.
    /// @param amount Amount to be deposited.
    function _depositFundsIntoYieldSource(uint256 amount) internal override {
        bool success = inputToken.approve(address(receiptToken), amount);
        if (!success) {
            revert ApprovalFailed();
        }
        uint256 shares = receiptToken.deposit(amount, address(this));
        if (shares == 0) {
            revert DepositFailed();
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
        amountWithdrawn = receiptToken.withdraw(
            amount,
            address(this), // receiver
            address(this) // owner
        );
    }

    /**
     * @notice Transfers assets from the current strategy to a new strategy.
     * @dev This function is intended to be overridden in derived contracts to define specific transfer logic.
     * @param newStrategy The address of the new strategy contract.
     * @param currentExecutionNonce The current execution nonce for the transaction.
     * @param _crossChainTxId The cross-chain transaction ID.
     */
    function _transferAssetsToNewStrategy(
        address newStrategy,
        uint256 currentExecutionNonce,
        uint256 _crossChainTxId
    ) internal override {
        uint256 strategyTotalBalance = receiptToken.maxWithdraw(address(this)); // TODO use maxwithdraw?
        _withdrawFundsFromYieldSource(strategyTotalBalance);
        bool success = inputToken.approve(newStrategy, strategyTotalBalance);
        if (!success) {
            revert ApprovalFailed();
        }
        IStrategy(newStrategy).depositFromOldStrategy(
            strategyTotalBalance,
            currentExecutionNonce,
            _crossChainTxId
        );
        emit AssetsTransferredToNewStrategy(
            newStrategy,
            strategyTotalBalance,
            _crossChainTxId,
            currentExecutionNonce
        );
    }

    /// @notice Gets the total assets held in the strategy.
    /// @return Total assets as an unsigned integer.
    function totalUnderlyingAssets() public view override returns (uint256) {
        return receiptToken.balanceOf(address(this));
    }
}
