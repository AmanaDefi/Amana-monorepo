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
contract ERC20_Compound_Strategy is ERC20StrategyParent {
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
            _inputTokenAddress
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
        if (compBalance > minClaimableReward) {
            uint256 usdcReceived = swapToInputToken(
                rewardsTokenAddress,
                compBalance,
                harvestSwapSlippage
            );
            if (usdcReceived > 0) {
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
     * @param fractionToWithdraw The amount of funds to withdraw from the yield source.
     * @param minAmountOut The minimum amount of funds to withdraw.
     * @return amountWithdrawn The amount of funds successfully withdrawn.
     */
    function _withdrawFundsFromYieldSource(
        uint256 fractionToWithdraw,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        harvest(); // Harvest rewards before withdrawing
        uint256 initialBalance = inputToken.balanceOf(address(this)); // take initial balance after harvest
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(
            fractionToWithdraw
        );
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

    function checkRewards() public returns (uint256) {
        ICometRewards.RewardOwed memory reward = cometRewardsContract
            .getRewardOwed(address(receiptToken), address(this));
        return reward.owed;
    }
}
