// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./EthStrategyParent.sol";

import "../interfaces/ICurveTricryptoPool.sol";
import "../interfaces/ISwapHelper.sol";
import "../interfaces/IConvexBoosterArbitrum.sol";
import "../interfaces/IConvexRewardPoolArbitrum.sol";

contract ConvexEthStrategyArbitrum is EthStrategyParent {
    using SafeERC20 for IERC20;

    ICurveTricryptoPool public receiptToken;
    IConvexBoosterArbitrum public booster;
    IConvexRewardPoolArbitrum public rewardPool;

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
            _withdrawHelper,
            address(0),
            _receiptTokenAddress
        );

        receiptToken = ICurveTricryptoPool(_receiptTokenAddress);
        weth = IWETH(_inputTokenAddress);
        swapHelper = _swapHelper;
        booster = IConvexBoosterArbitrum(_boosterAddress);
        rewardPool = IConvexRewardPoolArbitrum(_rewardPoolAddress);
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
            uint256[3] memory amounts;
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
        // harvest(); // TO DO put this back in?
        weth.deposit{value: amount}();

        uint256[3] memory amounts;
        amounts[inputTokenIndex] = amount;

        approveOrIncreaseAllowance(IERC20(weth), address(receiptToken), amount);

        uint256 shares = receiptToken.add_liquidity(amounts, minimumOut);

        approveOrIncreaseAllowance(receiptToken, address(booster), shares);
        booster.deposit(convexPid, shares);
        console.log(
            "ConvexEthStrategyArbitrum: Deposited %s shares into booster",
            shares
        );
    }

    function _withdrawFundsFromYieldSource(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        // harvest();
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(assetAmount);
        console.log(
            "ConvexEthStrategyArbitrum: Withdrawing %s shares from rewardPool",
            sharesToWithdraw
        );
        // harvest(); // TO DO remove this from the withdraw flow, rather do it manually - but it might still get called in the Convex contract?
        rewardPool.withdraw(sharesToWithdraw, false);
        console.log(
            "ConvexEthStrategyArbitrum: Withdrew %s shares from rewardPool",
            sharesToWithdraw
        );
        amountWithdrawn = receiptToken.remove_liquidity_one_coin(
            sharesToWithdraw,
            inputTokenIndex,
            minAmountOut
        );
        console.log(
            "ConvexEthStrategyArbitrum: Withdrew %s amount from receiptToken",
            amountWithdrawn
        );
        weth.withdraw(amountWithdrawn);
        console.log(
            "ConvexEthStrategyArbitrum: Withdrew %s amount from WETH",
            amountWithdrawn
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
        uint256,
        uint256 currentExecutionNonce
    ) external payable override {
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
        uint256[3] memory amounts;
        amounts[inputTokenIndex] = assetAmount;
        return receiptToken.calc_token_amount(amounts, false);
    }

    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256) {
        if (shares == 0) return 0;
        return receiptToken.calc_withdraw_one_coin(shares, inputTokenIndex);
    }

    // function checkRewards() public view returns (uint256) {
    //     return rewardPool.earned(address(this));
    // }
}
