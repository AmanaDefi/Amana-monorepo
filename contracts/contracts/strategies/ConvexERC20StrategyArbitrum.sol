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

    ICurvePoolDynamic public immutable receiptToken;
    IConvexBoosterArbitrum public immutable booster;
    IConvexRewardPoolArbitrum public immutable rewardPool;

    address public immutable cvxToken;
    address public immutable crvToken;

    address public swapHelperArbitrum;
    uint256 public inputTokenIndex;
    uint256 public convexPid;

    uint16 public harvestSwapSlippage = 500; // 5% slippage

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
        swapHelperArbitrum = _swapHelper;
        booster = IConvexBoosterArbitrum(_boosterAddress);
        rewardPool = IConvexRewardPoolArbitrum(_rewardPoolAddress);
        crvToken = _crvToken;
        cvxToken = _cvxToken;
        inputTokenIndex = _inputTokenIndex;
        convexPid = _convexPid;
    }

    function setHarvestSwapSlippage(uint16 _slippage) external onlyOwner {
        harvestSwapSlippage = _slippage;
    }

    function setSwapHelper(address _swapHelper) external onlyOwner {
        swapHelperArbitrum = _swapHelper;
    }

    function swapToInputToken(
        address token,
        uint256 amountIn,
        uint16 slippageBps
    ) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;

        SafeERC20.safeTransfer(IERC20(token), swapHelperArbitrum, amountIn);
        uint16 maxDeadline = uint16(block.timestamp + 1 hours);

        try
            ISwapHelper(swapHelperArbitrum).swap(
                token,
                amountIn,
                address(inputToken),
                slippageBps,
                address(this),
                maxDeadline,
                ""
            )
        returns (uint256 result) {
            amountOut = result;
        } catch Error(string memory reason) {
            emit SwapFailed(token, amountIn, reason);
            amountOut = 0;
        } catch {
            emit SwapFailed(token, amountIn, "Unknown error");
            amountOut = 0;
        }

        return amountOut; // might be zero
    }

    function claimRewards() public returns (uint256 totalClaimed) {
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

    function harvest() public {
        claimRewards();
        _reinvestRewards();
    }

    function _reinvestRewards() internal {
        uint256 totalConverted;
        try rewardPool.rewardLength() returns (uint256 length) {
            for (uint256 i = 0; i < length; i++) {
                (address rewardToken, , ) = rewardPool.rewards(i);
                if (rewardToken == address(0)) continue;

                uint256 balance = IERC20(rewardToken).balanceOf(address(this));
                if (balance == 0) continue;

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

        if (totalConverted > 0) {
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
        harvest();

        uint256[] memory amounts = new uint256[](2);
        amounts[inputTokenIndex] = amount;

        approveOrIncreaseAllowance(inputToken, address(receiptToken), amount);
        uint256 shares = receiptToken.add_liquidity(amounts, minimumOut);
        approveOrIncreaseAllowance(receiptToken, address(booster), shares);
        booster.deposit(convexPid, shares);
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
        rewardPool.withdraw(sharesToWithdraw, false);

        amountWithdrawn = receiptToken.remove_liquidity_one_coin(
            sharesToWithdraw,
            int128(int256(inputTokenIndex)),
            minAmountOut
        );
    }

    function _transferAssetsToNewStrategy(
        uint256 minAmountOut,
        uint256 minimumSharesOut,
        address newStrategy,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) internal override {
        if (IStrategy(newStrategy).amanaVault() != amanaVault)
            revert InvalidAmanaVault();
        harvest();
        rewardPool.withdrawAll(false);
        (address lpToken, , , , ) = booster.poolInfo(convexPid);
        uint256 withdrawnAmount = IERC20(lpToken).balanceOf(address(this));

        IERC20(lpToken).transfer(newStrategy, withdrawnAmount);
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

    /**
     * @dev Handles deposits from an old strategy into this strategy during a strategy switch.
     *      This function ensures the deposit comes from the old strategy, updates the execution nonce, and invests the funds.
     * @param currentExecutionNonce The current execution nonce from the old strategy.
     * @param _crossChainTxId The cross-chain transaction ID associated with this deposit.
     */
    function depositFromOldStrategy(
        uint256 amount,
        uint256 minimumSharesOut,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) external override {
        if (oldStrategy == address(0)) revert OldStrategyNotSet();
        if (msg.sender != oldStrategy) revert NotAuthorized();

        executionNonce = currentExecutionNonce + 1;

        // Stake the LP tokens into Convex (Arbitrum)
        IERC20(receiptToken).approve(address(booster), amount);
        booster.deposit(convexPid, amount); // This stakes on Arbitrum

        _sendInvestConfirmation(
            address(0),
            amount,
            totalUnderlyingAssets(),
            currentExecutionNonce,
            _crossChainTxId
        );

        emit AssetsReceivedFromOldStrategy(
            oldStrategy,
            amount,
            currentExecutionNonce,
            _crossChainTxId
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

    // function checkRewards() public view returns (uint256) {
    //     return rewardPool.earned(address(this));
    // }
}
