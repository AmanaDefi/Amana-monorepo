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

    address public swapHelperEthereum;
    uint256 public inputTokenIndex;
    uint256 public convexPid;

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
    )
        ERC20StrategyParent(_inputTokenAddress)
        StrategyParent(_name, _amanaVault, GATEWAY_ADDRESS, _withdrawHelper)
    {
        receiptToken = ICurvePoolDynamic(_receiptTokenAddress);
        swapHelperEthereum = _swapHelper;
        booster = IConvexBooster(_boosterAddress);
        rewardPool = IConvexRewardPool(_rewardPoolAddress);
        crvToken = _crvToken;
        cvxToken = _cvxToken;
        inputTokenIndex = _inputTokenIndex;
        convexPid = _convexPid;
    }

    function setHarvestSwapSlippage(uint16 _slippage) external onlyOwner {
        harvestSwapSlippage = _slippage;
    }

    function setSwapHelperEthereum(address _swapHelper) external onlyOwner {
        swapHelperEthereum = _swapHelper;
    }

    function swapToInputToken(
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
            address(inputToken),
            slippageBps,
            address(this),
            maxDeadline,
            ""
        );

        require(
            amountOut > 0,
            "Swap failed: Amount out must be greater than zero"
        );

        return amountOut;
    }

    function claimRewards() public returns (uint256) {
        uint256 earnedCrv = IConvexRewardPool(rewardPool).earned(address(this));
        if (earnedCrv < 1e15) {
            return 0; // Skip claiming if there's too little to claim
        }
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
        claimRewards();
        _reinvestRewards();
    }

    function _reinvestRewards() internal {
        uint256 crvBalance = IERC20(crvToken).balanceOf(address(this));
        uint256 cvxBalance = IERC20(cvxToken).balanceOf(address(this));
        if (crvBalance == 0 && cvxBalance == 0) return;
        uint256 inputTokenFromCrv;
        uint256 inputTokenFromCvx;
        if (crvBalance > 0) {
            inputTokenFromCrv = swapToInputToken(
                crvToken,
                crvBalance,
                harvestSwapSlippage
            );
        }
        if (cvxBalance > 0) {
            inputTokenFromCvx = swapToInputToken(
                cvxToken,
                cvxBalance,
                harvestSwapSlippage
            );
        }
        uint256 totalWeth = inputTokenFromCrv + inputTokenFromCvx;

        uint256[] memory amounts = new uint256[](2);
        amounts[inputTokenIndex] = totalWeth;

        approveOrIncreaseAllowance(
            IERC20(inputToken),
            address(receiptToken),
            totalWeth
        );
        uint256 shares = receiptToken.add_liquidity(amounts, 0);
        approveOrIncreaseAllowance(
            IERC20(receiptToken),
            address(booster),
            shares
        );
        booster.deposit(convexPid, shares, true);

        emit RewardsHarvested(
            crvBalance + cvxBalance,
            crvBalance,
            inputTokenFromCrv
        );
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
        uint256 withdrawnAmount = IERC20(rewardPool.stakingToken()).balanceOf(
            address(this)
        );
        approveOrIncreaseAllowance(
            IERC20(rewardPool.stakingToken()),
            address(rewardPool),
            withdrawnAmount
        );
        rewardPool.stakeFor(newStrategy, withdrawnAmount);
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
        uint256,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) external override {
        if (oldStrategy == address(0)) revert OldStrategyNotSet();
        if (msg.sender != oldStrategy) revert NotAuthorized();
        executionNonce = currentExecutionNonce + 1;
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

    function checkRewards() public view returns (uint256) {
        return rewardPool.earned(address(this));
    }
}
