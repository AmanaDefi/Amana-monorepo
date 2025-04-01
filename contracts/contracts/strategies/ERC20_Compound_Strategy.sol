// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ICompoundVault.sol";
import "../interfaces/ISwapRouter.sol";
import "./ERC20StrategyParent.sol";

// Polygon USDT receiptToken: 0xaeB318360f27748Acb200CE616E389A6C9409a07
// Polygon COMP token: 0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c
// Polygon Rewards contract: 0x45939657d1CA34A8FA39A924B71D28Fe8431e581
// Polygon USDT input token:

interface ICometRewards {
    function claim(
        address receiptToken,
        address src,
        bool shouldAccrue
    ) external;
}

/// @title ERC20_4626_Strategy
/// @notice Base contract for USDC strategies using Aave and ZetaChain.
/// @dev Handles USDC investments and divestments for strategies on EVM-compatible chains.
contract ERC20_Compound_Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    ICompoundVault public immutable receiptToken;
    ICometRewards public immutable compoundRewards;
    ISwapRouter public immutable swapRouter;

    address public constant COMP = 0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c; // COMP on Polygon
    address public constant UNISWAP_V3_ROUTER =
        0xE592427A0AEce92De3Edee1F18E0157C05861564; // Uniswap V3 Router on Polygon
    address public constant COMET_REWARDS =
        0x45939657d1CA34A8FA39A924B71D28Fe8431e581; // TODO get correct one

    event RewardsHarvested(
        uint256 rewardsClaimed,
        uint256 rewardsSwapped,
        uint256 usdcReinvested
    );

    /// @notice Initializes the strategy contract.
    constructor(
        string memory _name,
        address _amanaVault,
        address _inputTokenAddress,
        address _receiptTokenAddress,
        address _gateway,
        address _withdrawHelper
    )
        StrategyParent(_name, _amanaVault, _gateway, _withdrawHelper)
        ERC20StrategyParent(_inputTokenAddress)
    {
        receiptToken = ICompoundVault(_receiptTokenAddress);
        compoundRewards = ICometRewards(COMET_REWARDS);
        swapRouter = ISwapRouter(UNISWAP_V3_ROUTER);
    }

    /// @notice Claims COMP rewards from Compound
    function claimRewards() public returns (uint256) {
        compoundRewards.claim(address(receiptToken), address(this), true);

        uint256 compBalance = IERC20(COMP).balanceOf(address(this));
        require(compBalance > 0, "No COMP rewards to claim");

        return compBalance;
    }

    /**
     * @notice Swaps COMP for USDC on Uniswap V3 (Polygon)
     * @param amountIn Amount of COMP to swap
     * @param minUsdcOut Minimum USDC expected (slippage protection)
     * @return amountOut The amount of USDC received
     */
    function swapCompForUsdc(
        uint256 amountIn,
        uint256 minUsdcOut
    ) internal returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be greater than zero");

        // Approve Uniswap V3 Router to spend COMP
        IERC20(COMP).safeIncreaseAllowance(UNISWAP_V3_ROUTER, amountIn);

        // Create swap parameters
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: COMP,
                tokenOut: address(inputToken),
                fee: 500, // 0.05% fee tier
                recipient: address(this),
                deadline: block.timestamp + 60, // 1-minute deadline
                amountIn: amountIn,
                amountOutMinimum: minUsdcOut,
                sqrtPriceLimitX96: 0 // No price limit
            });

        // Execute swap
        amountOut = swapRouter.exactInputSingle(params);

        require(amountOut >= minUsdcOut, "Insufficient output");
    }

    /// @notice Harvests COMP rewards and reinvests them into Compound
    function harvest() public {
        uint256 compBalance = claimRewards();
        uint256 usdcReceived = swapCompForUsdc(compBalance, 0);

        // Reinvest USDC into Compound
        _depositFundsIntoYieldSource(usdcReceived, 0);
        emit RewardsHarvested(compBalance, compBalance, usdcReceived);
    }

    /// @notice Deposits funds into the yield source.
    /// @param amount Amount to be deposited.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minAmountOut
    ) internal override {
        approveOrIncreaseAllowance(inputToken, address(receiptToken), amount);
        uint256 initialBalance = receiptToken.balanceOf(address(this));
        receiptToken.supply(address(inputToken), amount);
        uint256 finalBalance = receiptToken.balanceOf(address(this));
        if (finalBalance - initialBalance < minAmountOut) {
            revert InsufficientOut();
        }
        // shares out = amount deposited, so no need to check minimumOut
    }

    /**
     * @notice Withdraws funds from the configured yield source.
     * @param fractionToWithdraw The amount of funds to withdraw from the yield source.
     * @param minAmountOut The minimum amount of funds to withdraw.
     * @return amountWithdrawn The amount of funds successfully withdrawn.
     */
    function _withdrawFundsFromYieldSource(
        uint256 fractionToWithdraw,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(
            fractionToWithdraw
        );
        receiptToken.withdraw(address(inputToken), sharesToWithdraw);
        if (sharesToWithdraw < minAmountOut) {
            revert InsufficientOut();
        }
        return sharesToWithdraw;
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
        uint256 withdrawnAmount = _withdrawFundsFromYieldSource(
            1e18, // Withdraw all
            minAmountOut
        );

        // Claim & swap COMP before transferring funds
        uint256 compBalance = claimRewards();
        if (compBalance > 0) {
            withdrawnAmount += swapCompForUsdc(compBalance, minAmountOut);
        }

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

    /// @notice Gets the total assets held in the strategy.
    /// @return Total assets as an unsigned integer.
    function totalUnderlyingAssets() public view override returns (uint256) {
        return receiptToken.balanceOf(address(this));
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
}
