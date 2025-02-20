// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ERC20StrategyParent.sol";

/// @title ERC20_Curve_Strategy
/// @notice Strategy contract for depositing USDC into a Curve pool on Ethereum.
contract ERC20_Curve_Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    address public immutable curvePool;
    uint256 public constant USDC_INDEX = 1; // USDC's index in the Curve pool

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _inputTokenAddress Address of the input token (USDC).
    /// @param _curvePool Address of the Curve pool.
    /// @param _gateway Address of the ZetaChain Gateway.
    constructor(
        string memory _name,
        address _amanaVault,
        address _inputTokenAddress,
        address _curvePool,
        address _gateway
    )
        StrategyParent(_name, _amanaVault, _gateway)
        ERC20StrategyParent(_inputTokenAddress)
    {
        curvePool = _curvePool;
    }

    /// @notice Deposits USDC into the Curve pool.
    /// @param amount Amount of USDC to deposit.
    /// @param minimumOut Minimum LP tokens expected.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal override {
        uint256;
        amounts[USDC_INDEX] = amount; // Only deposit USDC

        // Approve Curve pool to spend USDC
        approveOrIncreaseAllowance(inputToken, curvePool, amount);

        // Deposit into Curve pool
        (bool success, ) = curvePool.call(
            abi.encodeWithSignature(
                "add_liquidity(uint256[],uint256)",
                amounts,
                minimumOut
            )
        );

        require(success, "Curve deposit failed");
    }

    /// @notice Withdraws USDC from the Curve pool.
    /// @param amount The amount of USDC to withdraw.
    /// @return amountWithdrawn The amount of USDC successfully withdrawn.
    function _withdrawFundsFromYieldSource(
        uint256 amount
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 shares = convertToShares(amount);

        // Withdraw USDC from Curve pool
        (bool success, ) = curvePool.call(
            abi.encodeWithSignature(
                "remove_liquidity_one_coin(uint256,int128,uint256)",
                shares,
                int128(int256(USDC_INDEX)),
                amount
            )
        );

        require(success, "Curve withdrawal failed");

        return amount;
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
        _withdrawFundsFromYieldSource(strategyTotalBalance);

        uint256 sharesToBeBurnt = convertToShares(strategyTotalBalance);
        require(
            sharesToBeBurnt <= maxStrategySharesBurnt,
            "Exceeds max shares out"
        );

        approveOrIncreaseAllowance(
            inputToken,
            newStrategy,
            strategyTotalBalance
        );

        IStrategy(newStrategy).depositFromOldStrategy(
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

    /// @notice Returns the total underlying assets held in Curve.
    function totalUnderlyingAssets() public view override returns (uint256) {
        return IERC20(curvePool).balanceOf(address(this));
    }

    /// @notice Converts an asset amount to Curve LP token shares.
    function convertToShares(
        uint256 assetAmount
    ) public view override returns (uint256) {
        uint256 totalSupply = IERC20(curvePool).totalSupply();
        uint256 totalAssets = totalUnderlyingAssets();
        return (assetAmount * totalSupply) / totalAssets;
    }

    /// @notice Converts Curve LP token shares to an asset amount.
    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256) {
        uint256 totalSupply = IERC20(curvePool).totalSupply();
        uint256 totalAssets = totalUnderlyingAssets();
        return (shares * totalAssets) / totalSupply;
    }
}
