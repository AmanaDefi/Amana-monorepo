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

// Wrapped Token Gateway (Polygon): 0xF5f61a1ab3488fCB6d86451846bcFa9cdc108eB0
// APolWMATIC: 0x6d80113e533a2C0fe82EaBD35f1875DcEA89Ea97
// Aave Pool (Polygon): 0x794a61358D6845594F94dc1DB02A252b5b4814aD
// Polygon WMATIC: 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270

/// @title AaveEthStrategy
/// @notice Base contract for Ethereum-based strategies using Aave and ZetaChain.
/// @dev Handles ETH investments and divestments for strategies on EVM-compatible chains.
contract AaveEthStrategy is EthStrategyParent {
    using SafeERC20 for IERC20;

    IWETH public weth;
    IAavePool public aavePool;
    IAaveReceiptToken public receiptToken;
    IWrappedTokenGatewayV3 public tokenGateway;

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _receiptTokenAddress Address of the Aave receipt token.
    /// @param _gateway Address of the ZetaChain Gateway.
    /// @param _wrappedTokenGateway Address of the Wrapped Token Gateway.
    /// @param _wethAddress Address of the WETH contract.
    function initialize(
        string memory _name,
        address _amanaVault,
        address _receiptTokenAddress,
        address _gateway,
        address _wrappedTokenGateway,
        address _wethAddress,
        address _withdrawHelper
    ) external initializer {
        __StrategyParent_init(_name, _amanaVault, _gateway, _withdrawHelper);

        receiptToken = IAaveReceiptToken(_receiptTokenAddress);
        aavePool = IAavePool(receiptToken.POOL());
        tokenGateway = IWrappedTokenGatewayV3(_wrappedTokenGateway);
        weth = IWETH(_wethAddress);
    }

    /// @notice Deposits funds into the Aave pool.
    /// @param amount Amount to be deposited.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256
    ) internal override {
        weth.deposit{value: amount}();
        approveOrIncreaseAllowance(IERC20(weth), address(aavePool), amount);

        aavePool.supply(address(weth), amount, address(this), 0);
        // shares out = amount deposited, so no need to check minimumOut
    }

    /**
     * @notice Withdraws funds from the configured yield source.
     * @param fractionToWithdraw The fraction of shares to withdraw from the yield source.
     * @return amountWithdrawn The amount of funds successfully withdrawn.
     */
    function _withdrawFundsFromYieldSource(
        uint256 fractionToWithdraw,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(
            fractionToWithdraw
        );
        amountWithdrawn = aavePool.withdraw{gas: 200000}(
            address(weth),
            sharesToWithdraw,
            address(this)
        );
        weth.withdraw{gas: 50000}(amountWithdrawn);
        if (amountWithdrawn < minAmountOut) {
            revert InsufficientOut();
        }
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
        return receiptToken.balanceOf(address(this));
    }

    function claimRewards() public override returns (uint256) {
        return 0;
    }

    function _reinvestRewards() internal override {
        // No reinvestment logic yet
    }
}
