// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IAavePool.sol";
import "../interfaces/IAaveReceiptToken.sol";
import "../interfaces/IWrappedTokenGatewayV3.sol";
import "../interfaces/IWETH.sol";
import "./EthStrategyParent.sol";

// Wrapped Token Gateway (Base): 0x729b3EA8C005AbC58c9150fb57Ec161296F06766
// ABasWETH: 0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7
// Aave Pool (Base): 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
// Base Weth: 0x4200000000000000000000000000000000000006

/// @title AaveEthStrategy
/// @notice Base contract for Ethereum-based strategies using Aave and ZetaChain.
/// @dev Handles ETH investments and divestments for strategies on EVM-compatible chains.
contract AaveEthStrategy is EthStrategyParent {
    using SafeERC20 for IERC20;

    IWETH public immutable weth;
    IAavePool public immutable aavePool;
    IAaveReceiptToken public immutable receiptToken;
    IWrappedTokenGatewayV3 public immutable tokenGateway;

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _receiptTokenAddress Address of the Aave receipt token.
    /// @param _gateway Address of the ZetaChain Gateway.
    /// @param _wrappedTokenGateway Address of the Wrapped Token Gateway.
    /// @param _wethAddress Address of the WETH contract.
    constructor(
        string memory _name,
        address _amanaVault,
        address _receiptTokenAddress,
        address _gateway,
        address _wrappedTokenGateway,
        address _wethAddress
    ) StrategyParent(_name, _amanaVault, _gateway) {
        receiptToken = IAaveReceiptToken(_receiptTokenAddress);
        aavePool = IAavePool(receiptToken.POOL());
        tokenGateway = IWrappedTokenGatewayV3(_wrappedTokenGateway);
        weth = IWETH(_wethAddress);
    }

    /// @notice Deposits funds into the Aave pool.
    /// @param amount Amount to be deposited.
    function _depositFundsIntoYieldSource(uint256 amount) internal override {
        weth.deposit{value: amount}();
        bool success = weth.approve(address(aavePool), amount);
        if (!success) revert ApprovalFailed();

        aavePool.supply(address(weth), amount, address(this), 0);
    }

    /**
     * @notice Withdraws funds from the configured yield source.
     * @param amount The amount of funds to withdraw from the yield source.
     * @return amountWithdrawn The amount of funds successfully withdrawn.
     */
    function _withdrawFundsFromYieldSource(
        uint256 amount
    ) internal override returns (uint256 amountWithdrawn) {
        amountWithdrawn = aavePool.withdraw{gas: 200000}(
            address(weth),
            amount,
            address(this)
        );
        weth.withdraw{gas: 50000}(amountWithdrawn);
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
        // uint256 strategyTotalBalance = receiptToken.balanceOf(address(this));
        uint256 amountWithdrawn = _withdrawFundsFromYieldSource(
            type(uint256).max
        );

        IStrategy(newStrategy).depositFromOldStrategy{value: amountWithdrawn}(
            amountWithdrawn,
            currentExecutionNonce,
            _crossChainTxId
        );
        emit AssetsTransferredToNewStrategy(
            newStrategy,
            amountWithdrawn,
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
