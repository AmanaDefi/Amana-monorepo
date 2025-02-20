// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ERC20StrategyParent.sol";
import "../interfaces/ICurvePool.sol";
import "hardhat/console.sol";

// input token USDC 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
// curve pool 0x169A5f124A3663a25313Ee0F7f3Bff028728867f

/// @title ERC20_Curve_Strategy
/// @notice Strategy contract for depositing USDC into a Curve pool on Ethereum.
contract CurveERC20Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    ICurvePool public immutable receiptToken;
    uint256 public constant USDC_INDEX = 1; // USDC's index in the Curve pool

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _inputTokenAddress Address of the input token (USDC).
    /// @param _receiptTokenAddress Address of the Curve pool.
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
        receiptToken = ICurvePool(_receiptTokenAddress);
    }

    /// @notice Deposits USDC into the Curve pool.
    /// @param amount Amount of USDC to deposit.
    /// @param minimumOut Minimum LP tokens expected.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal override {
        uint256[] memory amounts = new uint256[](2);
        amounts[USDC_INDEX] = amount; // Only deposit USDC

        approveOrIncreaseAllowance(inputToken, address(receiptToken), amount);
        uint256 shares = receiptToken.add_liquidity(amounts, minimumOut);
    }

    /// @notice Withdraws USDC from the Curve pool.
    /// @param amount The amount of USDC to withdraw.
    /// @return amountWithdrawn The amount of USDC successfully withdrawn.
    function _withdrawFundsFromYieldSource(
        uint256 amount
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 shares = convertToShares(amount);
        amountWithdrawn = receiptToken.remove_liquidity_one_coin(
            shares,
            int128(int256(USDC_INDEX)),
            0 // minAmountOut
        );
    }

    /// @notice Transfers assets to a new strategy.
    function _transferAssetsToNewStrategy(
        uint256 maxStrategySharesBurnt,
        uint256 minimumSharesOut,
        address newStrategy,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) internal override {
        uint256 strategyTotalBalance = totalUnderlyingAssets();
        uint256 withdrawnAmount = _withdrawFundsFromYieldSource(
            strategyTotalBalance
        );

        uint256 sharesToBeBurnt = convertToShares(strategyTotalBalance);
        require(
            sharesToBeBurnt <= maxStrategySharesBurnt,
            "Exceeds max shares out"
        );

        approveOrIncreaseAllowance(inputToken, newStrategy, withdrawnAmount);

        IStrategy(newStrategy).depositFromOldStrategy(
            withdrawnAmount,
            minimumSharesOut,
            currentExecutionNonce,
            _crossChainTxId
        );

        emit AssetsTransferredToNewStrategy(
            newStrategy,
            withdrawnAmount,
            currentExecutionNonce,
            _crossChainTxId
        );
    }

    /// @notice Returns the total underlying assets held in Curve.
    function totalUnderlyingAssets() public view override returns (uint256) {
        uint256 shares = receiptToken.balanceOf(address(this));
        return convertToAssets(shares);
    }

    /// @notice Converts an asset amount (USDC) to Curve LP token shares.
    function convertToShares(
        uint256 assetAmount
    ) public view override returns (uint256) {
        uint256[] memory amounts = new uint256[](2);
        amounts[USDC_INDEX] = assetAmount; // Only withdraw USDC
        uint256 shares = receiptToken.calc_token_amount(amounts, false);
        return shares;
    }

    /// @notice Converts Curve LP token shares to an asset amount (USDC).
    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256) {
        uint256 assets = receiptToken.calc_withdraw_one_coin(
            shares,
            int128(int256(USDC_INDEX))
        );
        return assets;
    }
}
