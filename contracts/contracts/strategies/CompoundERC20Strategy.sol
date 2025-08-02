// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ICompoundVault.sol";
import "./ERC20StrategyParent.sol";
import "../interfaces/ISwapHelper.sol";
import "../interfaces/ICometRewards.sol";

// BASE USDC receiptToken: 0xb125E6687d4313864e53df431d5425969c15Eb2F
// BASE rewardsTokenAddress: 0x9e1028F5F1D5eDE59748FFceE5532509976840E0
// BASE Rewards contract: 0x123964802e6ABabBE1Bc9547D72Ef1B69B00A6b1
// BASE USDC base token: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

/// @title CompoundERC20Strategy
/// @notice Base contract for Compound strategies using ERC20 tokens.
/// @dev Handles Compound investments and divestments for strategies on EVM-compatible chains.
contract CompoundERC20Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    ICompoundVault public receiptToken;
    ICometRewards public cometRewardsContract;

    address public rewardsTokenAddress;

    /// @notice Initializes the strategy contract.
    function initialize(
        string memory _name,
        address _gatewayAddress,
        address _amanaVault,
        address _withdrawHelper,
        address _swapHelper,
        address _receiptTokenAddress,
        address _inputTokenAddress,
        address _rewardsContractAddress,
        address _rewardsTokenAddress,
        uint256 /* unused */
    ) external initializer {
        __StrategyParent_init(
            _name,
            _amanaVault,
            _gatewayAddress,
            _withdrawHelper,
            _inputTokenAddress,
            _receiptTokenAddress
        );

        swapHelper = _swapHelper;
        receiptToken = ICompoundVault(_receiptTokenAddress);
        cometRewardsContract = ICometRewards(_rewardsContractAddress);
        rewardsTokenAddress = _rewardsTokenAddress;
    }

    /// @notice Claims rewards from Compound
    function claimRewards() public override returns (uint256) {
        uint256 compBalanceBefore = IERC20(rewardsTokenAddress).balanceOf(
            address(this)
        );
        try
            cometRewardsContract.claim(
                address(receiptToken),
                address(this),
                true
            )
        {
            uint256 compBalanceAfter = IERC20(rewardsTokenAddress).balanceOf(
                address(this)
            );
            uint256 claimed = compBalanceAfter - compBalanceBefore;
            emit RewardsClaimed(address(this), rewardsTokenAddress, claimed);
            return claimed;
        } catch {
            return 0;
        }
    }

    function _reinvestRewards() internal override {
        uint256 compBalance = IERC20(rewardsTokenAddress).balanceOf(
            address(this)
        );
        if (
            compBalance > 0
            // minClaimableReward *
            //     10 ** (IERC20Metadata(rewardsTokenAddress).decimals() - 3)
        ) {
            uint256 usdcReceived = swapToInputToken(
                rewardsTokenAddress,
                compBalance,
                harvestSwapSlippage
            );
            if (
                usdcReceived > 0
                // minClaimableReward *
                //     10 ** (IERC20Metadata(address(inputToken)).decimals() - 3)
            ) {
                _depositFundsIntoYieldSource(usdcReceived, 0);
                emit RewardsHarvested(
                    rewardsTokenAddress,
                    compBalance,
                    usdcReceived
                );
            }
        }
    }

    /// @notice Deposits funds into the yield source.
    /// @param amount Amount to be deposited.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minAmountOut
    ) internal override {
        approveOrIncreaseAllowance(inputToken, address(receiptToken), amount);
        uint256 initialBalance = receiptToken.balanceOf(address(this));
        if (amount > 0) {
            receiptToken.supply(address(inputToken), amount);
        }
        uint256 finalBalance = receiptToken.balanceOf(address(this));
        if (finalBalance - initialBalance < minAmountOut) {
            revert InsufficientOut();
        }
        // shares out = amount deposited, so no need to check minimumOut
    }

    /**
     * @notice Withdraws funds from the configured yield source.
     * @param assetAmount The amount of funds to withdraw from the yield source.
     * @param minAmountOut The minimum amount of funds to withdraw.
     * @return amountWithdrawn The amount of funds successfully withdrawn.
     */
    function _withdrawFundsFromYieldSource(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        harvest(); // Harvest rewards before withdrawing
        uint256 initialBalance = inputToken.balanceOf(address(this)); // take initial balance after harvest
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(assetAmount);
        receiptToken.withdraw(address(inputToken), sharesToWithdraw);
        uint256 finalBalance = inputToken.balanceOf(address(this));
        amountWithdrawn = finalBalance - initialBalance;
        if (amountWithdrawn < minAmountOut) {
            revert InsufficientOut();
        }
        return sharesToWithdraw;
    }

    /// @notice Gets the total assets held in the strategy.
    /// @return Total assets as an unsigned integer.
    function totalUnderlyingAssets() public view override returns (uint256) {
        return receiptToken.balanceOf(address(this));
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

    function checkRewards() public returns (uint256) {
        ICometRewards.RewardOwed memory reward = cometRewardsContract
            .getRewardOwed(address(receiptToken), address(this));
        return reward.owed;
    }

    function swapToInputToken(
        address token,
        uint256 amountIn,
        uint16 initialSlippageBps
    ) internal override returns (uint256 amountOut) {
        if (amountIn == 0) return 0;

        IERC20(token).safeTransfer(swapHelper, amountIn);

        uint256 maxDeadline = 1 hours;
        uint16 slippage = initialSlippageBps;
        // Retry with increasing slippage up to 10% (1000 bps)
        while (slippage <= 1000) {
            try
                ISwapHelper(swapHelper).swapViaUniswap(
                    token,
                    amountIn,
                    address(inputToken),
                    slippage,
                    address(this),
                    maxDeadline,
                    ""
                )
            returns (uint256 result) {
                emit RewardsHarvested(token, amountIn, result);
                return result;
            } catch {
                emit SwapFailed(token, amountIn, "Swap attempt failed");
            }

            slippage += 100; // increase slippage by 1% (100 bps)
        }

        // Swap failed even after max attempts
        return 0;
    }
}
