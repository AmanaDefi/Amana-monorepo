// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./ERC20StrategyParent.sol";

import "../interfaces/ICurveStableSwapNG.sol";
import "../interfaces/ISwapHelper.sol";
import "../interfaces/IConvexBooster.sol";
import "../interfaces/IConvexRewardPool.sol";

contract ConvexERC20StrategyStableSwapNG is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    ICurveStableSwapNG public receiptToken;
    IConvexBooster public booster;
    IConvexRewardPool public rewardPool;

    address public cvxToken;
    address public crvToken;

    uint256 public inputTokenIndex;
    uint256 public convexPid;

    address public constant WETH_TOKEN =
        0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // WETH address on Ethereum mainnet
    address public constant WBTC_ADDRESS =
        0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599; // WBTC address on Ethereum mainnet
    address public constant CBBTC_ADDRESS =
        0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf; // cbbtc address on Ethereum mainnet
    address public constant USDC_ADDRESS =
        0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // USDC address on Ethereum mainnet

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

        receiptToken = ICurveStableSwapNG(_receiptTokenAddress);
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
        if (
            earnedCrv <
            minClaimableReward * 10 ** (IERC20Metadata(crvToken).decimals() - 3)
        ) {
            return 0; // Skip claiming if there's too little to claim
        }
        uint256 amountCRVBefore = IERC20(crvToken).balanceOf(address(this));
        uint256 amountCVXBefore = IERC20(cvxToken).balanceOf(address(this));
        uint256 amountCRVAfter;
        uint256 amountCVXAfter;
        uint256 claimedCRV;
        uint256 claimedCVX;
        try IConvexRewardPool(rewardPool).getReward(address(this), true) {
            amountCRVAfter = IERC20(crvToken).balanceOf(address(this));
            claimedCRV = amountCRVAfter > amountCRVBefore
                ? amountCRVAfter - amountCRVBefore
                : 0;

            amountCVXAfter = IERC20(cvxToken).balanceOf(address(this));
            claimedCVX = amountCVXAfter > amountCVXBefore
                ? amountCVXAfter - amountCVXBefore
                : 0;
            emit RewardsClaimed(address(this), crvToken, claimedCRV);
            emit RewardsClaimed(address(this), cvxToken, claimedCVX);
        } catch Error(string memory reason) {
            emit RewardClaimFailed(reason);
            claimedCRV = 0;
            claimedCVX = 0;
        } catch {
            emit RewardClaimFailed("Unknown error");
            claimedCRV = 0;
            claimedCVX = 0;
        }

        return claimedCRV;
    }

    function _reinvestRewards() internal override {
        address mainRewardToken = rewardPool.rewardToken();
        uint256 inputAmount = _swapCRVToInputToken(
            mainRewardToken,
            IERC20(mainRewardToken).balanceOf(address(this)),
            harvestSwapSlippage
        );
        uint256 amountCVX = IERC20(cvxToken).balanceOf(address(this));
        if (amountCVX > 0) {
            inputAmount += _swapCVXToInputToken(
                cvxToken,
                amountCVX,
                harvestSwapSlippage
            );
        }
        if (
            inputAmount >
            minClaimableReward *
                10 ** (IERC20Metadata(address(inputToken)).decimals() - 6)
        ) {
            uint256[] memory amounts = new uint256[](3);
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

            uint256 extraInput = _swapCVXToInputToken(
                extraRewardToken,
                balance,
                harvestSwapSlippage
            );

            if (
                extraInput >
                minClaimableReward *
                    10 ** (IERC20Metadata(address(inputToken)).decimals() - 6)
            ) {
                uint256[] memory extraAmounts = new uint256[](3);
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

    function _swapCRVToInputToken(
        address token,
        uint256 amountIn,
        uint16 initialSlippageBps
    ) internal returns (uint256 amountOut) {
        if (address(inputToken) == CBBTC_ADDRESS) {
            return _swapCRVToCBBTC(token, amountIn, initialSlippageBps);
        } else {
            return swapToInputToken(token, amountIn, initialSlippageBps);
        }
    }

    function _swapCRVToUSDC(
        address token,
        uint256 amountIn,
        uint16 initialSlippageBps
    ) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;

        IERC20(token).safeTransfer(swapHelper, amountIn);

        address[11] memory route = [
            token, // CRV token
            0x4eBdF703948ddCEA3B11f675B4D1Fba9d2414A14, // TriCRV
            WETH_TOKEN,
            0x7F86Bf177Dd4F3494b841a37e810A34dD56c829B, // tricryptoUSDC
            WBTC_ADDRESS,
            0x839d6bDeDFF886404A6d7a788ef241e4e28F4802, // cbBTC/wBTC pool
            address(inputToken), // cbbtc
            address(0),
            address(0),
            address(0),
            address(0)
        ];

        address[5] memory pools = [
            0x4eBdF703948ddCEA3B11f675B4D1Fba9d2414A14, // TriCRV
            0x7F86Bf177Dd4F3494b841a37e810A34dD56c829B, // tricryptoYSDC
            0x839d6bDeDFF886404A6d7a788ef241e4e28F4802, // cbBTC/wBTC
            address(0),
            address(0)
        ];

        uint256[5][5] memory swapParams = [
            [uint256(2), 1, 1, 3, 3], // crv -> eth
            [uint256(2), 1, 1, 3, 3], // eth -> wbtc
            [uint256(1), 0, 1, 1, 2], // wbtc -> cbbtc
            [uint256(0), 0, 0, 0, 0],
            [uint256(0), 0, 0, 0, 0]
        ];

        uint16 slippage = initialSlippageBps;

        while (slippage <= 1000) {
            try
                ISwapHelper(swapHelper).swapTokensViaCurveNG(
                    route,
                    swapParams,
                    pools,
                    amountIn,
                    slippage
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

    function _swapCRVToCBBTC(
        address token,
        uint256 amountIn,
        uint16 initialSlippageBps
    ) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;

        IERC20(token).safeTransfer(swapHelper, amountIn);

        address[11] memory route = [
            token, // CRV token
            0x4eBdF703948ddCEA3B11f675B4D1Fba9d2414A14, // TriCRV
            WETH_TOKEN,
            0x7F86Bf177Dd4F3494b841a37e810A34dD56c829B, // tricrypto
            WBTC_ADDRESS,
            0x839d6bDeDFF886404A6d7a788ef241e4e28F4802, // cbBTC/wBTC pool
            address(inputToken), // cbbtc
            address(0),
            address(0),
            address(0),
            address(0)
        ];

        address[5] memory pools = [
            0x4eBdF703948ddCEA3B11f675B4D1Fba9d2414A14, // TriCRV
            0x7F86Bf177Dd4F3494b841a37e810A34dD56c829B, // tricrypto
            0x839d6bDeDFF886404A6d7a788ef241e4e28F4802, // cbBTC/wBTC
            address(0),
            address(0)
        ];

        uint256[5][5] memory swapParams = [
            [uint256(2), 1, 1, 3, 3], // crv -> eth
            [uint256(2), 1, 1, 3, 3], // eth -> wbtc
            [uint256(1), 0, 1, 1, 2], // wbtc -> cbbtc
            [uint256(0), 0, 0, 0, 0],
            [uint256(0), 0, 0, 0, 0]
        ];

        uint16 slippage = initialSlippageBps;

        while (slippage <= 1000) {
            try
                ISwapHelper(swapHelper).swapTokensViaCurveNG(
                    route,
                    swapParams,
                    pools,
                    amountIn,
                    slippage
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

    function _swapCVXToInputToken(
        address token,
        uint256 amountIn,
        uint16 initialSlippageBps
    ) internal returns (uint256 amountOut) {
        if (address(inputToken) == CBBTC_ADDRESS) {
            return _swapCVXToCBBTC(token, amountIn, initialSlippageBps);
        } else {
            return swapToInputToken(token, amountIn, initialSlippageBps);
        }
    }

    function _swapCVXToCBBTC(
        address token,
        uint256 amountIn,
        uint16 initialSlippageBps
    ) internal returns (uint256 amountOut) {
        if (amountIn == 0) return 0;

        IERC20(token).safeTransfer(swapHelper, amountIn);

        address[11] memory route = [
            cvxToken,
            0xB576491F1E6e5E62f1d8F26062Ee822B40B0E0d4, // cvxeth
            WETH_TOKEN,
            0x7F86Bf177Dd4F3494b841a37e810A34dD56c829B, // tricrypto
            WBTC_ADDRESS,
            0x839d6bDeDFF886404A6d7a788ef241e4e28F4802, // cbBTC/wBTC pool
            address(inputToken), // cbbtc
            address(0),
            address(0),
            address(0),
            address(0)
        ];

        address[5] memory pools = [
            0xB576491F1E6e5E62f1d8F26062Ee822B40B0E0d4, // cvxeth
            0x7F86Bf177Dd4F3494b841a37e810A34dD56c829B, // tricrypto
            0x839d6bDeDFF886404A6d7a788ef241e4e28F4802, // cbBTC/wBTC
            address(0),
            address(0)
        ];

        uint256[5][5] memory swapParams = [
            [uint256(1), 0, 1, 2, 2], // cvx -> wweth
            [uint256(2), 1, 1, 3, 3], // weth -> wbtc
            [uint256(1), 0, 1, 1, 2], // wbtc -> cbbtc
            [uint256(0), 0, 0, 0, 0],
            [uint256(0), 0, 0, 0, 0]
        ];

        uint16 slippage = initialSlippageBps;
        // Retry with increasing slippage up to 10% (1000 bps)

        while (slippage <= 1000) {
            try
                ISwapHelper(swapHelper).swapTokensViaCurveNG(
                    route,
                    swapParams,
                    pools,
                    amountIn,
                    slippage // calculate minimum out based on slippage?
                )
            returns (uint256 result) {
                emit RewardsHarvested(token, amountIn, amountOut);
                return result;
            } catch {
                emit SwapFailed(token, amountIn, "Swap attempt failed");
            }

            slippage += 100; // increase slippage by 1% (100 bps)
        }

        // Swap failed even after max attempts
        return 0;
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal override {
        uint256[] memory amounts = new uint256[](3);
        amounts[inputTokenIndex] = amount;

        approveOrIncreaseAllowance(inputToken, address(receiptToken), amount);

        uint256 shares = receiptToken.add_liquidity(amounts, minimumOut);

        approveOrIncreaseAllowance(receiptToken, address(booster), shares);
        booster.deposit(convexPid, shares, true);
    }

    function _withdrawFundsFromYieldSource(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(assetAmount);
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
        if (totalShares > 0 && totalShares - sharesToWithdraw <= 1e12) {
            sharesToWithdraw = totalShares;
        }

        return sharesToWithdraw;
    }

    function convertToShares(
        uint256 assetAmount
    ) public view override returns (uint256) {
        uint256[] memory amounts = new uint256[](3);
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
