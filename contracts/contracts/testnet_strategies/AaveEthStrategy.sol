// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IAavePool.sol";
import "../interfaces/IAaveReceiptToken.sol";
import "../interfaces/IWrappedTokenGatewayV3.sol";
import "../interfaces/IWETH.sol";
import "./EthStrategyParent.sol";

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
        if (!success) {
            revert ApprovalFailed();
        }
        aavePool.supply(address(weth), amount, address(this), 0);
    }

    function _withdrawFundsFromYieldSource(uint256 amount) internal override {
        aavePool.withdraw{gas: 200000}(address(weth), amount, address(this));
        weth.withdraw{gas: 50000}(amount);
    }

    /// @notice Gets the total assets held in the strategy.
    /// @return Total assets as an unsigned integer.
    function totalUnderlyingAssets() public view override returns (uint256) {
        return receiptToken.balanceOf(address(this));
    }
}
