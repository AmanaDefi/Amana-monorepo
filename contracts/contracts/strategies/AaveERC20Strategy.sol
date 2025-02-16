// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IAavePool.sol";
import "../interfaces/IAaveReceiptToken.sol";
import "./ERC20StrategyParent.sol";

/// @title AaveERC20Strategy
/// @notice Contract for ERC20 strategies using Aave and ZetaChain.
/// @dev Handles ERC20 investments and divestments for strategies on EVM-compatible chains.
contract AaveERC20Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    IAavePool public immutable aavePool;
    IAaveReceiptToken public immutable receiptToken;

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _amanaVault Address of the Amana vault.
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
        receiptToken = IAaveReceiptToken(_receiptTokenAddress);
        aavePool = IAavePool(receiptToken.POOL());
    }

    /// @notice Deposits funds into the Aave pool.
    /// @param amount Amount to be deposited.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minSharesOut
    ) internal override {
        approveOrIncreaseAllowance(inputToken, address(aavePool), amount);

        aavePool.supply(address(inputToken), amount, address(this), 0);
        // shares out = amount deposited, so no need to check minSharesOut
    }

    /**
     * @notice Withdraws funds from the configured yield source.
     * @param amount The amount of funds to withdraw from the yield source.
     * @return amountWithdrawn The amount of funds successfully withdrawn.
     */
    function _withdrawFundsFromYieldSource(
        uint256 amount
    ) internal override returns (uint256 amountWithdrawn) {
        amountWithdrawn = aavePool.withdraw(
            address(inputToken),
            amount,
            address(this)
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
        uint256 minSharesOut,
        address newStrategy,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) internal override {
        // uint256 strategyTotalBalance = receiptToken.balanceOf(address(this));
        uint256 amountWithdrawn = _withdrawFundsFromYieldSource(
            type(uint256).max
        );
        approveOrIncreaseAllowance(inputToken, newStrategy, amountWithdrawn);
        IStrategy(newStrategy).depositFromOldStrategy(
            amountWithdrawn,
            minSharesOut,
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
        return receiptToken.balanceOf(address(this));
    }

    function sharesOutForUnderlying(
        uint256 depositAmountInUnderlying
    ) public pure override returns (uint256) {
        return depositAmountInUnderlying;
    }
}
