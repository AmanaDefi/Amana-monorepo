// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ICompoundVault.sol";
import "./ERC20StrategyParent.sol";
import "../interfaces/ISwapHelper.sol";
import "../interfaces/ICometRewards.sol";

// Polygon USDT receiptToken: 0xaeB318360f27748Acb200CE616E389A6C9409a07
// Polygon rewardsTokenAddress token: 0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c
// Polygon Rewards contract: 0x45939657d1CA34A8FA39A924B71D28Fe8431e581
// Polygon USDT input token:

/// @title ERC20_4626_Strategy
/// @notice Base contract for USDC strategies using Aave and ZetaChain.
/// @dev Handles USDC investments and divestments for strategies on EVM-compatible chains.
contract ERC20_Compound_Strategy_w_swap is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    ICompoundVault public receiptToken;
    ICometRewards public cometRewardsContract;

    address public rewardsTokenAddress;
    address public lendingPoolTokenAddress;

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
        lendingPoolTokenAddress = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174; // USDC.e on Polygon
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
            compBalance >
            minClaimableReward *
                10 ** (IERC20Metadata(rewardsTokenAddress).decimals() - 3)
        ) {
            uint256 usdcReceived = swapToInputToken(
                rewardsTokenAddress,
                compBalance,
                harvestSwapSlippage
            );
            if (
                usdcReceived >
                minClaimableReward *
                    10 ** (IERC20Metadata(address(inputToken)).decimals() - 3)
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
        // swap one form of USDC for another
        IERC20(inputToken).safeTransfer(swapHelper, amount);

        uint256 maxDeadline = 1 hours;
        uint16 slippage = 50;
        // Retry with increasing slippage up to 10% (1000 bps)
        uint256 amountAfterSwap;
        while (slippage <= 1000) {
            try
                ISwapHelper(swapHelper).swap(
                    address(inputToken),
                    amount,
                    lendingPoolTokenAddress,
                    slippage,
                    address(this),
                    maxDeadline,
                    ""
                )
            returns (uint256 result) {
                amountAfterSwap = result;
            } catch {
                emit SwapFailed(
                    address(inputToken),
                    amount,
                    "Swap attempt failed"
                );
            }

            slippage += 100; // increase slippage by 1% (100 bps)
        }
        approveOrIncreaseAllowance(
            IERC20(lendingPoolTokenAddress),
            address(receiptToken),
            amountAfterSwap
        );
        uint256 initialBalance = receiptToken.balanceOf(address(this));
        if (amountAfterSwap > 0) {
            receiptToken.supply(lendingPoolTokenAddress, amountAfterSwap);
        }
        uint256 finalBalance = receiptToken.balanceOf(address(this));
        if (finalBalance - initialBalance < minAmountOut) {
            revert InsufficientOut();
        }
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
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(assetAmount);
        receiptToken.withdraw(lendingPoolTokenAddress, sharesToWithdraw);
        uint256 amountOut = swapToInputToken(
            lendingPoolTokenAddress,
            sharesToWithdraw,
            harvestSwapSlippage
        );
        if (amountOut < minAmountOut) {
            revert InsufficientOut();
        }
        return amountOut;
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
}
