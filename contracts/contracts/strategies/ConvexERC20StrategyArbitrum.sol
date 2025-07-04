// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./ERC20StrategyParent.sol";

import "../interfaces/ICurvePoolDynamic.sol";
import "../interfaces/ISwapHelper.sol";
import "../interfaces/IConvexBoosterArbitrum.sol";
import "../interfaces/IConvexRewardPoolArbitrum.sol";

contract ConvexERC20StrategyArbitrum is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    ICurvePoolDynamic public receiptToken;
    IConvexBoosterArbitrum public booster;
    IConvexRewardPoolArbitrum public rewardPool;

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
            _withdrawHelper,
            _inputTokenAddress,
            _receiptTokenAddress
        );

        receiptToken = ICurvePoolDynamic(_receiptTokenAddress);
        swapHelper = _swapHelper;
        booster = IConvexBoosterArbitrum(_boosterAddress);
        rewardPool = IConvexRewardPoolArbitrum(_rewardPoolAddress);
        crvToken = _crvToken;
        cvxToken = _cvxToken;
        inputTokenIndex = _inputTokenIndex;
        convexPid = _convexPid;
    }

    function claimRewards() public override returns (uint256 totalClaimed) {
        try rewardPool.getReward(address(this), address(this)) {
            // Claimed, now count rewards
            try rewardPool.rewardLength() returns (uint256 length) {
                for (uint256 i = 0; i < length; i++) {
                    (address rewardToken, , ) = rewardPool.rewards(i);
                    if (rewardToken == address(0)) continue;

                    uint256 balance = IERC20(rewardToken).balanceOf(
                        address(this)
                    );
                    if (balance > 0) {
                        emit RewardsClaimed(
                            address(this),
                            rewardToken,
                            balance
                        );
                        totalClaimed += balance;
                    }
                }
            } catch {
                emit RewardClaimFailed("Could not read rewardLength()");
            }
        } catch Error(string memory reason) {
            emit RewardClaimFailed(reason);
        } catch {
            emit RewardClaimFailed("Unknown error");
        }

        return totalClaimed;
    }

    function _reinvestRewards() internal override {
        uint256 totalConverted;
        try rewardPool.rewardLength() returns (uint256 length) {
            for (uint256 i = 0; i < length; i++) {
                (address rewardToken, , ) = rewardPool.rewards(i);
                if (rewardToken == address(0)) continue;

                uint256 balance = IERC20(rewardToken).balanceOf(address(this));
                if (
                    balance <
                    minClaimableReward *
                        10 **
                            (IERC20Metadata(address(rewardToken)).decimals() -
                                3)
                ) continue;

                uint256 converted = swapToInputToken(
                    rewardToken,
                    balance,
                    harvestSwapSlippage
                );

                if (converted > 0) {
                    emit RewardsHarvested(rewardToken, balance, converted);
                    totalConverted += converted;
                }
            }
        } catch {
            emit RewardClaimFailed("Failed during rewardLength iteration");
        }

        if (
            totalConverted >
            minClaimableReward *
                10 ** (IERC20Metadata(address(inputToken)).decimals() - 3)
        ) {
            uint256[] memory amounts = new uint256[](2);
            amounts[inputTokenIndex] = totalConverted;

            approveOrIncreaseAllowance(
                inputToken,
                address(receiptToken),
                totalConverted
            );
            uint256 shares = receiptToken.add_liquidity(amounts, 0);
            approveOrIncreaseAllowance(receiptToken, address(booster), shares);
            booster.deposit(convexPid, shares);
        }
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal override {
        uint256[] memory amounts = new uint256[](2);
        amounts[inputTokenIndex] = amount;

        approveOrIncreaseAllowance(inputToken, address(receiptToken), amount);
        uint256 shares = receiptToken.add_liquidity(amounts, minimumOut);
        approveOrIncreaseAllowance(receiptToken, address(booster), shares);
        booster.deposit(convexPid, shares);
    }

    function _withdrawFundsFromYieldSource(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        harvest();

        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(assetAmount);
        rewardPool.withdraw(sharesToWithdraw, false);
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
        (address lpToken, , , , ) = booster.poolInfo(convexPid);
        uint256 withdrawnAmount = IERC20(lpToken).balanceOf(address(this));

        IERC20(lpToken).transfer(txn.newStrategy, withdrawnAmount);
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
        uint256 minimumSharesOut,
        uint256 currentExecutionNonce
    ) external override {
        if (oldStrategy == address(0)) revert OldStrategyNotSet();
        if (msg.sender != oldStrategy) revert NotAuthorized();

        lastProcessedNonce = currentExecutionNonce;

        // Stake the LP tokens into Convex (Arbitrum)
        IERC20(receiptToken).approve(address(booster), amount);
        booster.deposit(convexPid, amount); // This stakes on Arbitrum

        _sendInvestConfirmation(
            0,
            totalUnderlyingAssets(),
            currentExecutionNonce
        );

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
        uint256 assetAmount
    ) public view override returns (uint256) {
        uint256 totalShares = rewardPool.balanceOf(address(this));
        uint256 sharesToWithdraw = convertToShares(assetAmount);
        if (sharesToWithdraw > totalShares) {
            sharesToWithdraw = totalShares;
        }
        if (totalShares > 0 && totalShares - sharesToWithdraw <= 1e3) {
            sharesToWithdraw = totalShares;
        }
        return sharesToWithdraw;
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

    // function checkRewards() public view returns (uint256) {
    //     return rewardPool.earned(address(this));
    // }
}
