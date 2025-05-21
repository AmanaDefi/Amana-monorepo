// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./ERC20StrategyParent.sol";

import "../interfaces/ICurvePoolDynamic.sol";
import "../interfaces/ISwapHelper.sol";
import "../interfaces/IConvexBooster.sol";
import "../interfaces/IConvexRewardPool.sol";

contract ConvexERC20Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    ICurvePoolDynamic public immutable receiptToken;
    IConvexBooster public immutable booster;
    IConvexRewardPool public immutable rewardPool;

    address public immutable cvxToken;
    address public immutable crvToken;

    uint256 public inputTokenIndex;
    uint256 public convexPid;

    constructor(
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
    )
        ERC20StrategyParent(_inputTokenAddress)
        StrategyParent(_name, _amanaVault, _gatewayAddress, _withdrawHelper)
    {
        receiptToken = ICurvePoolDynamic(_receiptTokenAddress);
        swapHelper = _swapHelper;
        booster = IConvexBooster(_boosterAddress);
        rewardPool = IConvexRewardPool(_rewardPoolAddress);
        crvToken = _crvToken;
        cvxToken = _cvxToken;
        inputTokenIndex = _inputTokenIndex;
        convexPid = _convexPid;
    }

    function claimRewards() public override returns (uint256) {
        uint256 earnedCrv = IConvexRewardPool(rewardPool).earned(address(this));
        if (earnedCrv < minClaimableReward) {
            return 0; // Skip claiming if there's too little to claim
        }
        uint256 amountBefore = IERC20(crvToken).balanceOf(address(this));
        uint256 amountAfter;
        uint256 claimed;
        try IConvexRewardPool(rewardPool).getReward(address(this), true) {
            amountAfter = IERC20(crvToken).balanceOf(address(this));
            claimed = amountAfter > amountBefore
                ? amountAfter - amountBefore
                : 0;
            emit RewardsClaimed(address(this), crvToken, claimed);
        } catch Error(string memory reason) {
            emit RewardClaimFailed(reason);
            claimed = 0;
        } catch {
            emit RewardClaimFailed("Unknown error");
            claimed = 0;
        }

        return claimed;
    }

    function _reinvestRewards() internal override {
        address mainRewardToken = rewardPool.rewardToken();
        uint256 inputAmount = swapToInputToken(
            mainRewardToken,
            IERC20(mainRewardToken).balanceOf(address(this)),
            harvestSwapSlippage
        );

        if (inputAmount > minClaimableReward) {
            uint256[] memory amounts = new uint256[](2);
            amounts[inputTokenIndex] = inputAmount;

            approveOrIncreaseAllowance(
                IERC20(inputToken),
                address(receiptToken),
                inputAmount
            );
            uint256 shares = receiptToken.add_liquidity(amounts, 0);
            approveOrIncreaseAllowance(
                IERC20(receiptToken),
                address(booster),
                shares
            );
            booster.deposit(convexPid, shares, true);
        }

        uint256 extraRewardCount = rewardPool.extraRewardsLength();
        for (uint256 i = 0; i < extraRewardCount; i++) {
            address extraRewardPool = rewardPool.extraRewards(i);
            if (extraRewardPool == address(0)) continue;

            address extraRewardToken = IConvexRewardPool(extraRewardPool)
                .rewardToken();
            uint256 balance = IERC20(extraRewardToken).balanceOf(address(this));
            if (balance == 0) continue;

            uint256 extraInput = swapToInputToken(
                extraRewardToken,
                balance,
                harvestSwapSlippage
            );

            if (extraInput > minClaimableReward) {
                uint256[] memory extraAmounts = new uint256[](2);
                extraAmounts[inputTokenIndex] = extraInput;

                approveOrIncreaseAllowance(
                    IERC20(inputToken),
                    address(receiptToken),
                    extraInput
                );
                uint256 extraShares = receiptToken.add_liquidity(
                    extraAmounts,
                    0
                );
                approveOrIncreaseAllowance(
                    IERC20(receiptToken),
                    address(booster),
                    extraShares
                );
                booster.deposit(convexPid, extraShares, true);
            }
        }
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal override {
        harvest();

        uint256[] memory amounts = new uint256[](2);
        amounts[inputTokenIndex] = amount;

        approveOrIncreaseAllowance(inputToken, address(receiptToken), amount);

        uint256 shares = receiptToken.add_liquidity(amounts, minimumOut);
        approveOrIncreaseAllowance(receiptToken, address(booster), shares);
        booster.deposit(convexPid, shares, true);
    }

    function _withdrawFundsFromYieldSource(
        uint256 fractionToWithdraw,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(
            fractionToWithdraw
        );

        harvest();
        sharesToWithdraw = getStrategyWithdrawShareAmount(fractionToWithdraw);
        rewardPool.withdrawAndUnwrap(sharesToWithdraw, false);

        amountWithdrawn = receiptToken.remove_liquidity_one_coin(
            sharesToWithdraw,
            int128(int256(inputTokenIndex)),
            minAmountOut
        );
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
    ) external override {
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
        uint256[] memory amounts = new uint256[](2);
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
