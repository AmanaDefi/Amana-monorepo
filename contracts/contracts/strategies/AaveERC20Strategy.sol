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

    IAavePool public aavePool;
    IAaveReceiptToken public receiptToken;

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
        uint256 initialBalance = receiptToken.balanceOf(address(this));
        aavePool.supply(address(inputToken), amount, address(this), 0);
        uint256 finalBalance = receiptToken.balanceOf(address(this));
        if (finalBalance - initialBalance < minSharesOut)
            revert InsufficientOut();
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

        amountWithdrawn = aavePool.withdraw(
            address(inputToken),
            sharesToWithdraw,
            address(this)
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
        return receiptToken.balanceOf(address(this));
    }
}
