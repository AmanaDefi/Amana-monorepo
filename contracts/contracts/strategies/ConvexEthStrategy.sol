// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./EthStrategyParent.sol";

import "../interfaces/ICurvePoolFixed.sol";
import "../interfaces/ISwapHelper.sol";
import "../interfaces/IConvexBooster.sol";
import "../interfaces/IConvexRewardPool.sol";

contract ConvexEthStrategy is EthStrategyParent {
    using SafeERC20 for IERC20;

    ICurvePoolFixed public receiptToken;
    IConvexBooster public booster;
    IConvexRewardPool public rewardPool;

    IWETH public weth;
    address public cvxToken;
    address public crvToken;

    uint256 public inputTokenIndex;
    uint256 public convexPid;

    function initialize(
        string memory _name,
        address _gatewayAddress,
        address _amanaVault,
        address _withdrawHelper,
        address _swapHelper,
        address _receiptTokenAddress,
        address _inputTokenAddress,
        address _rewardPoolAddress,
        address _crvToken,
        uint256 _inputTokenIndex,
        uint256 _convexPid,
        address _boosterAddress,
        address _cvxToken
    ) external initializer {
        __StrategyParent_init(
            _name,
            _amanaVault,
            _gatewayAddress,
            _withdrawHelper
        );

        receiptToken = ICurvePoolFixed(_receiptTokenAddress);
        weth = IWETH(_inputTokenAddress);
        swapHelper = _swapHelper;
        booster = IConvexBooster(_boosterAddress);
        rewardPool = IConvexRewardPool(_rewardPoolAddress);
        crvToken = _crvToken;
        cvxToken = _cvxToken;
        inputTokenIndex = _inputTokenIndex;
        convexPid = _convexPid;
    }

    function swapToInputToken(
        address token,
        uint256 amountIn,
        uint16 initialSlippageBps
    ) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;

        IERC20(token).safeTransfer(swapHelper, amountIn);

        uint16 maxDeadline = uint16(block.timestamp + 1 hours);
        uint16 slippage = initialSlippageBps;

        // Retry with increasing slippage up to 10% (1000 bps)
        while (slippage <= 1000) {
            try
                ISwapHelper(swapHelper).swap(
                    token,
                    amountIn,
                    address(weth),
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

    function claimRewards() public override returns (uint256 totalClaimed) {
        // Track balances before
        uint256 crvBefore = IERC20(crvToken).balanceOf(address(this));
        uint256 cvxBefore = IERC20(cvxToken).balanceOf(address(this));

        try IConvexRewardPool(rewardPool).getReward(address(this), true) {
            // Track balances after
            uint256 crvAfter = IERC20(crvToken).balanceOf(address(this));
            uint256 cvxAfter = IERC20(cvxToken).balanceOf(address(this));

            uint256 claimedCrv = crvAfter > crvBefore
                ? crvAfter - crvBefore
                : 0;
            uint256 claimedCvx = cvxAfter > cvxBefore
                ? cvxAfter - cvxBefore
                : 0;

            if (claimedCrv > 0) {
                emit RewardsClaimed(address(this), crvToken, claimedCrv);
            }
            if (claimedCvx > 0) {
                emit RewardsClaimed(address(this), cvxToken, claimedCvx);
            }

            totalClaimed = claimedCrv + claimedCvx;
        } catch Error(string memory reason) {
            emit RewardClaimFailed(reason);
        } catch {
            emit RewardClaimFailed("Unknown error");
        }

        return totalClaimed;
    }

    function _reinvestRewards() internal override {
        _handleRewardReinvestment(crvToken);
        _handleRewardReinvestment(cvxToken);
    }

    function _handleRewardReinvestment(address rewardToken) internal {
        uint256 rewardBalance = IERC20(rewardToken).balanceOf(address(this));
        if (rewardBalance < minClaimableReward) return; // skip small amounts

        uint256 receivedInputToken = swapToInputToken(
            rewardToken,
            rewardBalance,
            harvestSwapSlippage
        );

        if (receivedInputToken == 0) return;

        emit RewardsHarvested(rewardToken, rewardBalance, receivedInputToken);

        uint256[2] memory amounts;
        amounts[inputTokenIndex] = receivedInputToken;

        approveOrIncreaseAllowance(
            weth,
            address(receiptToken),
            receivedInputToken
        );

        try receiptToken.add_liquidity(amounts, 0) returns (uint256 shares) {
            approveOrIncreaseAllowance(receiptToken, address(booster), shares);
            booster.deposit(convexPid, shares, true);
        } catch Error(string memory reason) {
            emit SwapFailed(rewardToken, receivedInputToken, reason);
        } catch {
            emit SwapFailed(
                rewardToken,
                receivedInputToken,
                "Curve add_liquidity failed"
            );
        }
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal override {
        harvest(); // TO DO remove this from the deposit flow, rather do it manually
        weth.deposit{value: amount}();

        uint256[2] memory amounts;
        amounts[inputTokenIndex] = amount;

        approveOrIncreaseAllowance(IERC20(weth), address(receiptToken), amount);
        uint256 shares = receiptToken.add_liquidity(amounts, minimumOut);

        approveOrIncreaseAllowance(
            IERC20(receiptToken),
            address(booster),
            shares
        );
        booster.deposit(convexPid, shares, true);
    }

    function _withdrawFundsFromYieldSource(
        uint256 fractionToWithdraw,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(
            fractionToWithdraw
        );

        harvest(); // TO DO remove this from the withdraw flow, rather do it manually - but it might still get called in the Convex contract?
        sharesToWithdraw = getStrategyWithdrawShareAmount(fractionToWithdraw);
        rewardPool.withdrawAndUnwrap(sharesToWithdraw, false);

        amountWithdrawn = receiptToken.remove_liquidity_one_coin(
            sharesToWithdraw,
            int128(int256(inputTokenIndex)),
            minAmountOut
        );
        weth.withdraw(amountWithdrawn);
    }

    function _transferAssetsToNewStrategy() internal override {
        BufferedTx memory txn = pendingByNonce[lastProcessedNonce + 1];
        if (IStrategy(txn.newStrategy).amanaVault() != amanaVault)
            revert InvalidAmanaVault();
        harvest();

        rewardPool.withdrawAll(false);
        uint256 withdrawnAmount = IERC20(rewardPool.stakingToken()).balanceOf(
            address(this)
        );
        approveOrIncreaseAllowance(
            IERC20(rewardPool.stakingToken()),
            address(rewardPool),
            withdrawnAmount
        );
        rewardPool.stakeFor(txn.newStrategy, withdrawnAmount);
        IStrategy(txn.newStrategy).depositFromOldStrategy(
            withdrawnAmount,
            txn.minimumOut,
            lastProcessedNonce + 1
        );
        emit AssetsTransferredToNewStrategy(
            txn.newStrategy,
            withdrawnAmount,
            lastProcessedNonce + 1
        );
    }

    /**
     * @dev Handles deposits from an old strategy into this strategy during a strategy switch.
     *      This function ensures the deposit comes from the old strategy, updates the execution nonce, and invests the funds.
     * @param currentExecutionNonce The current execution nonce from the old strategy.
     */
    function depositFromOldStrategy(
        uint256 amount,
        uint256,
        uint256 currentExecutionNonce
    ) external payable override {
        if (oldStrategy == address(0)) revert OldStrategyNotSet();
        if (msg.sender != oldStrategy) revert NotAuthorized();
        lastProcessedNonce = currentExecutionNonce;
        _sendInvestConfirmation(totalUnderlyingAssets(), currentExecutionNonce);
        emit AssetsReceivedFromOldStrategy(
            oldStrategy,
            amount,
            currentExecutionNonce
        );
        oldStrategy = address(0);
    }

    function totalUnderlyingAssets() public view override returns (uint256) {
        uint256 lpTokensStaked = rewardPool.balanceOf(address(this));
        uint256 lpTokensHeld = receiptToken.balanceOf(address(this));
        uint256 totalLPTokens = lpTokensHeld + lpTokensStaked;
        return totalLPTokens == 0 ? 0 : convertToAssets(totalLPTokens);
    }

    function getStrategyWithdrawShareAmount(
        uint256 fractionOfTotalShares
    ) public view override returns (uint256) {
        uint256 totalShares = rewardPool.balanceOf(address(this));
        uint256 withdrawShareAmount = (fractionOfTotalShares *
            totalShares +
            5e17) / 1e18;
        return
            withdrawShareAmount > totalShares
                ? totalShares
                : withdrawShareAmount;
    }

    function convertToShares(
        uint256 assetAmount
    ) public view override returns (uint256) {
        uint256[2] memory amounts;
        amounts[inputTokenIndex] = assetAmount;
        return receiptToken.calc_token_amount(amounts, false);
    }

    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256) {
        if (shares == 0) return 0;
        return
            receiptToken.calc_withdraw_one_coin(
                shares,
                int128(int256(inputTokenIndex))
            );
    }

    function checkRewards() public view returns (uint256) {
        return rewardPool.earned(address(this));
    }
}
