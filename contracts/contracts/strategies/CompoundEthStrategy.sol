// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ICompoundVault.sol";
import "../interfaces/ISwapHelper.sol";
import "../interfaces/ICometRewards.sol";
import "../interfaces/IWETH.sol";
import "./EthStrategyParent.sol";

// BASE WETH receiptToken: 0x46e6b214b524310239732D51387075E0e70970bf
// BASE rewardsTokenAddress token: 0x9e1028F5F1D5eDE59748FFceE5532509976840E0
// BASE Rewards contract: 0x123964802e6ABabBE1Bc9547D72Ef1B69B00A6b1
// BASE WETH input token: 0x4200000000000000000000000000000000000006

/// @title CompoundEthStrategy
/// @notice Base contract for ETH strategies using Compound and ZetaChain.
/// @dev Handles ETH investments and divestments for strategies on EVM-compatible chains.
contract CompoundEthStrategy is EthStrategyParent {
    using SafeERC20 for IERC20;

    IWETH public weth;
    ICompoundVault public receiptToken;
    ICometRewards public cometRewardsContract;

    address public rewardsTokenAddress;

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _gateway Address of the ZetaChain Gateway.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _withdrawHelper Address of the withdraw helper contract.
    /// @param _swapHelper Address of the swap helper contract.
    /// @param _receiptTokenAddress Address of the Compound vault.
    /// @param _wethAddress Address of the WETH contract.
    /// @param _rewardsContractAddress Address of the Comet rewards contract.
    /// @param _rewardsTokenAddress Address of the rewards token.
    function initialize(
        string memory _name,
        address _gateway,
        address _amanaVault,
        address _withdrawHelper,
        address _swapHelper,
        address _receiptTokenAddress,
        address _wethAddress,
        address _rewardsContractAddress,
        address _rewardsTokenAddress,
        uint256 /* unused */
    ) external initializer {
        __StrategyParent_init(
            _name,
            _amanaVault,
            _gateway,
            _withdrawHelper,
            address(0),
            _receiptTokenAddress
        );

        weth = IWETH(_wethAddress);
        inputToken = IWETH(_wethAddress);
        receiptToken = ICompoundVault(_receiptTokenAddress);
        cometRewardsContract = ICometRewards(_rewardsContractAddress);
        rewardsTokenAddress = _rewardsTokenAddress;
        swapHelper = _swapHelper;
    }

    /// @notice Deposits funds into the Compound vault.
    /// @param amount Amount to be deposited.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 /* unused */
    ) internal override {
        weth.deposit{value: amount}();
        approveOrIncreaseAllowance(IERC20(weth), address(receiptToken), amount);
        receiptToken.supply(address(weth), amount);
        // shares out = amount deposited, so no need to check minimumOut
    }

    /**
     * @notice Withdraws funds from the configured yield source.
     * @param fractionToWithdraw The fraction of shares to withdraw from the yield source.
     * @param minAmountOut The minimum amount of funds to withdraw.
     * @return sharesToWithdraw The amount of shares successfully withdrawn.
     */
    function _withdrawFundsFromYieldSource(
        uint256 fractionToWithdraw,
        uint256 minAmountOut
    ) internal override returns (uint256 sharesToWithdraw) {
        harvest(); // Harvest rewards before withdrawing
        sharesToWithdraw = getStrategyWithdrawShareAmount(fractionToWithdraw);
        receiptToken.withdraw(address(weth), sharesToWithdraw);
        weth.withdraw(sharesToWithdraw);
        if (sharesToWithdraw < minAmountOut) {
            revert InsufficientOut();
        }
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
                approveOrIncreaseAllowance(IERC20(weth), address(receiptToken), usdcReceived);
                receiptToken.supply(address(weth), usdcReceived);
                emit RewardsHarvested(
                    rewardsTokenAddress,
                    compBalance,
                    usdcReceived
                );
            }
        }
    }

    function swapToInputToken(
        address token,
        uint256 amountIn,
        uint16 initialSlippageBps
    ) internal virtual returns (uint256 amountOut) {
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
