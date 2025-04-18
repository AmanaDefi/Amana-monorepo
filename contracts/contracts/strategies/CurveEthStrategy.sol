// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./EthStrategyParent.sol";
import "../interfaces/ICurvePoolFixed.sol";
import "../interfaces/ISwapRouter.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/ISwapHelper.sol";
import "../interfaces/IConvexBooster.sol";
import "../interfaces/IConvexRewardPool.sol";

contract CurveEthStrategy is EthStrategyParent {
    using SafeERC20 for IERC20;

    ICurvePoolFixed public immutable receiptToken;
    IConvexBooster public immutable booster;
    IConvexRewardPool public immutable rewardPool;

    IWETH public immutable weth;
    address public immutable cvxToken;
    address public immutable crvToken;

    address public swapHelperEthereum;
    uint256 public inputTokenIndex;
    uint256 public convexPid;

    bool public stakingEnabled = false;
    uint16 public harvestSwapSlippage = 500; // 5% slippage

    constructor(
        string memory _name,
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
    ) StrategyParent(_name, _amanaVault, GATEWAY_ADDRESS, _withdrawHelper) {
        receiptToken = ICurvePoolFixed(_receiptTokenAddress);
        weth = IWETH(_inputTokenAddress);
        swapHelperEthereum = _swapHelper;
        booster = IConvexBooster(_boosterAddress);
        rewardPool = IConvexRewardPool(_rewardPoolAddress);
        crvToken = _crvToken;
        cvxToken = _cvxToken;
        inputTokenIndex = _inputTokenIndex;
        convexPid = _convexPid;
    }

    function setStakingEnabled(bool _enabled) external onlyOwner {
        stakingEnabled = _enabled;
    }

    function setHarvestSwapSlippage(uint16 _slippage) external onlyOwner {
        harvestSwapSlippage = _slippage;
    }

    function swapToWeth(
        address token,
        uint256 amountIn,
        uint16 slippageBps
    ) internal returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be greater than zero");

        SafeERC20.safeTransfer(IERC20(token), swapHelperEthereum, amountIn);
        uint16 maxDeadline = uint16(block.timestamp + 1 hours);

        amountOut = ISwapHelper(swapHelperEthereum).swap(
            token,
            amountIn,
            address(weth),
            slippageBps,
            address(this),
            maxDeadline,
            ""
        );

        return amountOut;
    }

    function claimRewards() public returns (uint256) {
        // Get the balance of CRV before claiming
        uint256 amountBefore = IERC20(crvToken).balanceOf(address(this));

        // Call Convex rewards contract to claim CRV + extras
        IConvexRewardPool(rewardPool).getReward(address(this), true);

        // Get the balance of CRV after claiming
        uint256 amountAfter = IERC20(crvToken).balanceOf(address(this));

        uint256 claimed = amountAfter - amountBefore;

        emit RewardsClaimed(address(this), crvToken, claimed);
        return claimed;
    }

    function harvest() public {
        if (!stakingEnabled) return;

        rewardPool.getReward(address(this), true);

        uint256 crvBalance = IERC20(crvToken).balanceOf(address(this));
        uint256 cvxBalance = IERC20(cvxToken).balanceOf(address(this));

        uint256 wethFromCrv = swapToWeth(
            crvToken,
            crvBalance,
            harvestSwapSlippage
        );
        uint256 wethFromCvx = swapToWeth(
            cvxToken,
            cvxBalance,
            harvestSwapSlippage
        );

        uint256 totalWeth = wethFromCrv + wethFromCvx;
        uint256[2] memory amounts;
        amounts[inputTokenIndex] = totalWeth;

        approveOrIncreaseAllowance(
            IERC20(weth),
            address(receiptToken),
            totalWeth
        );
        uint256 shares = receiptToken.add_liquidity(amounts, 0);

        if (stakingEnabled) {
            approveOrIncreaseAllowance(
                IERC20(receiptToken),
                address(booster),
                shares
            );
            booster.deposit(convexPid, shares, true);
        }

        emit RewardsHarvested(crvBalance + cvxBalance, crvBalance, wethFromCrv);
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal override {
        weth.deposit{value: amount}();

        uint256[2] memory amounts;
        amounts[inputTokenIndex] = amount;

        approveOrIncreaseAllowance(IERC20(weth), address(receiptToken), amount);
        uint256 shares = receiptToken.add_liquidity(amounts, minimumOut);

        if (stakingEnabled) {
            approveOrIncreaseAllowance(
                IERC20(receiptToken),
                address(booster),
                shares
            );
            booster.deposit(convexPid, shares, true);
        }
    }

    function _withdrawFundsFromYieldSource(
        uint256 fractionToWithdraw,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(
            fractionToWithdraw
        );

        if (stakingEnabled) {
            harvest();
            sharesToWithdraw = getStrategyWithdrawShareAmount(
                fractionToWithdraw
            );
            rewardPool.withdrawAndUnwrap(sharesToWithdraw, false);
        }

        amountWithdrawn = receiptToken.remove_liquidity_one_coin(
            sharesToWithdraw,
            int128(int256(inputTokenIndex)),
            minAmountOut
        );
        weth.withdraw(amountWithdrawn);
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

        uint256 withdrawnAmount = _withdrawFundsFromYieldSource(
            1e18,
            minAmountOut
        );
        approveOrIncreaseAllowance(weth, newStrategy, withdrawnAmount);

        IStrategy(newStrategy).depositFromOldStrategy{value: withdrawnAmount}(
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
