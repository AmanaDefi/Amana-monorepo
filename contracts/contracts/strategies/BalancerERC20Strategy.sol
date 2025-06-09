// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "./ERC20StrategyParent.sol";

import "../interfaces/ISwapHelper.sol";
import "../interfaces/IBalancerLiquidityGauge.sol";
import "../interfaces/IBalancerCompositeLiquidityRouter.sol";
import "../interfaces/IBalancerRouter.sol";
import "../interfaces/IPermit2.sol";
import "../interfaces/I4626Vault.sol";
import "../interfaces/IBalancerStablePool.sol";

import "hardhat/console.sol";

contract BalancerERC20Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    IBalancerCompositeLiquidityRouter public compositeLiquidityRouter;
    IBalancerRouter public liquidityRouter;
    IBalancerLiquidityGauge public liquidityGauge;

    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    address public receiptToken;
    uint256 public inputTokenIndex;

    function initialize(
        string memory _name,
        address _gatewayAddress,
        address _amanaVault,
        address _withdrawHelper,
        address _swapHelper,
        address _receiptTokenAddress, // receiptTokenAddress
        address _inputTokenAddress, // inputToken
        address _liquidityGaugeAddress,
        address /* _rewardsTokenAddress — not needed */,
        uint256 _inputTokenIndex
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
        liquidityRouter = IBalancerRouter(
            0x3f170631ed9821Ca51A59D996aB095162438DC10
        );
        compositeLiquidityRouter = IBalancerCompositeLiquidityRouter(
            0x9dA18982a33FD0c7051B19F0d7C76F2d5E7e017c // this is on Base, I can always change it later
        );
        liquidityGauge = IBalancerLiquidityGauge(_liquidityGaugeAddress);

        receiptToken = _receiptTokenAddress;
        inputTokenIndex = _inputTokenIndex;
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minBptOut
    ) internal override {
        permit2ApproveIfNeeded(
            address(inputToken),
            address(compositeLiquidityRouter),
            amount
        );

        uint256 numTokensInPool = 2;
        uint256[] memory exactAmountsIn = new uint256[](numTokensInPool);
        bool[] memory wrapUnderlying = new bool[](numTokensInPool);

        // Assuming inputTokenIndex is 1 for ERC4626 vault wrapping USDC
        exactAmountsIn[inputTokenIndex] = amount;
        wrapUnderlying[inputTokenIndex] = true;

        bytes memory userData = ""; // or some encoded value if needed

        uint256 bptReceived = compositeLiquidityRouter
            .addLiquidityUnbalancedToERC4626Pool(
                receiptToken,
                wrapUnderlying,
                exactAmountsIn,
                minBptOut,
                false,
                userData
            );

        IERC20(receiptToken).safeIncreaseAllowance(
            address(liquidityGauge),
            bptReceived
        );
        liquidityGauge.deposit(bptReceived);
    }

    function _withdrawFundsFromYieldSource(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        harvest();

        uint256 totalStaked = liquidityGauge.balanceOf(address(this));
        uint256 sharesToWithdraw = convertToShares(assetAmount);

        if (totalStaked > 0 && totalStaked - sharesToWithdraw <= 1e3) {
            sharesToWithdraw = totalStaked;
        }
        liquidityGauge.withdraw(sharesToWithdraw);

        IERC20(receiptToken).approve(
            address(liquidityRouter),
            type(uint256).max
        );

        address[] memory poolTokens = IBalancerStablePool(receiptToken)
            .getTokens();
        address tokenToWithdraw = poolTokens[inputTokenIndex];

        uint256 amountOutFromGauge = liquidityRouter
            .removeLiquiditySingleTokenExactIn(
                receiptToken, // pool (BPT)
                sharesToWithdraw, // exact BPT in
                tokenToWithdraw, // token you want to receive - change this to the wrapped version of the token?
                1, // minimum acceptable output
                true, // wethIsEth
                "" // userData (can be empty unless needed)
            );
        uint256 finalAmountOut = I4626Vault(tokenToWithdraw).redeem(
            amountOutFromGauge,
            address(this),
            address(this)
        );
        require(finalAmountOut >= minAmountOut, "Insufficient output amount");
        amountWithdrawn = finalAmountOut;
    }

    function claimRewards() public override returns (uint256 totalClaimed) {
        try liquidityGauge.claim_rewards() {
            try liquidityGauge.reward_count() returns (uint256 count) {
                for (uint256 i = 0; i < count; i++) {
                    address token = liquidityGauge.reward_tokens(i);
                    if (token == address(0)) continue;

                    uint256 balance = IERC20(token).balanceOf(address(this));
                    if (balance > 0) {
                        emit RewardsClaimed(address(this), token, balance);
                        totalClaimed += balance;
                    }
                }
            } catch {
                emit RewardClaimFailed("Could not read reward_count");
            }
        } catch {
            emit RewardClaimFailed("claim_rewards() failed");
        }
    }

    function _reinvestRewards() internal override {
        uint256 totalConverted;
        try liquidityGauge.reward_count() returns (uint256 count) {
            for (uint256 i = 0; i < count; i++) {
                address reward = liquidityGauge.reward_tokens(i);
                if (reward == address(0)) continue;

                uint256 balance = IERC20(reward).balanceOf(address(this));
                if (
                    balance <
                    minClaimableReward *
                        10 ** (IERC20Metadata(reward).decimals() - 3)
                ) continue;

                uint256 converted = swapToInputToken(
                    reward,
                    balance,
                    harvestSwapSlippage
                );
                if (converted > 0) {
                    emit RewardsHarvested(reward, balance, converted);
                    totalConverted += converted;
                }
            }
        } catch {
            emit RewardClaimFailed("Failed to iterate reward_count");
        }

        if (
            totalConverted >
            minClaimableReward *
                10 ** (IERC20Metadata(address(inputToken)).decimals() - 3)
        ) {
            _depositFundsIntoYieldSource(totalConverted, 0);
        }
    }

    function _transferAssetsToNewStrategy() internal override {
        BufferedTx memory txn = pendingByNonce[lastProcessedNonce + 1];

        if (IStrategy(txn.newStrategy).amanaVault() != amanaVault)
            revert InvalidAmanaVault();

        harvest();

        // Withdraw all BPT from the liquidity gauge
        uint256 stakedAmount = liquidityGauge.balanceOf(address(this));
        liquidityGauge.withdraw(stakedAmount);

        // Transfer the LP tokens to the new strategy
        IERC20(receiptToken).transfer(txn.newStrategy, stakedAmount);

        IStrategy(txn.newStrategy).depositFromOldStrategy(
            stakedAmount,
            txn.minimumOut,
            lastProcessedNonce + 1
        );

        emit AssetsTransferredToNewStrategy(
            txn.newStrategy,
            stakedAmount,
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

        // Stake LP tokens in the Balancer gauge
        IERC20(receiptToken).approve(address(liquidityGauge), amount);
        liquidityGauge.deposit(amount);

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
        uint256 staked = liquidityGauge.balanceOf(address(this));
        uint256 held = IERC20(receiptToken).balanceOf(address(this));
        uint256 total = staked + held;
        return total > 0 ? convertToAssets(total) : 0;
    }

    function getStrategyWithdrawShareAmount(
        uint256 fraction
    ) public view override returns (uint256) {
        uint256 totalShares = liquidityGauge.balanceOf(address(this));
        return (fraction * totalShares + 5e17) / 1e18;
    }

    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256) {
        uint256 rate = IBalancerStablePool(receiptToken).getRate(); // BPT rate, 18 decimals
        uint8 inputTokenDecimals = IERC20Metadata(address(inputToken))
            .decimals();

        uint256 assets = (shares * rate) / 1e18;

        if (inputTokenDecimals < 18) {
            assets = assets / (10 ** (18 - inputTokenDecimals));
        } else if (inputTokenDecimals > 18) {
            assets = assets * (10 ** (inputTokenDecimals - 18));
        }

        return assets;
    }

    function convertToShares(
        uint256 assets
    ) public view override returns (uint256) {
        uint256 rate = IBalancerStablePool(receiptToken).getRate(); // BPT rate, 18 decimals
        uint8 inputTokenDecimals = IERC20Metadata(address(inputToken))
            .decimals();

        if (inputTokenDecimals < 18) {
            assets = assets * (10 ** (18 - inputTokenDecimals));
        } else if (inputTokenDecimals > 18) {
            assets = assets / (10 ** (inputTokenDecimals - 18));
        }

        uint256 shares = (assets * 1e18) / rate;
        return shares;
    }

    function permit2ApproveIfNeeded(
        address token,
        address spender,
        uint256 amount
    ) internal {
        // Step 1: Approve Permit2 to pull tokens
        uint256 permit2Allowance = IERC20(token).allowance(
            address(this),
            PERMIT2
        );
        if (permit2Allowance < amount) {
            IERC20(token).approve(PERMIT2, type(uint256).max);
        }

        // Step 2: Approve Router via Permit2
        (uint160 result, ) = IPermit2(PERMIT2).allowance(
            address(this),
            token,
            spender
        );
        uint256 routerAllowance = uint256(result);

        if (routerAllowance < amount) {
            IPermit2(PERMIT2).approve(
                token,
                spender,
                type(uint160).max,
                type(uint48).max
            );
        }
    }
}
