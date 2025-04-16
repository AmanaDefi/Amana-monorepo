// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./EthStrategyParent.sol";
import "../interfaces/ICurvePoolFixed.sol";
import "../interfaces/ICurveLiquidityGauge.sol";
import "../interfaces/ISwapRouter.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/ISwapHelper.sol";
import "../interfaces/IMinter.sol";

// curve pool 0xa4c567c662349BeC3D0fB94C4e7f85bA95E208e4
// liquidity gauge 0x4e227d29b33B77113F84bcC189a6F886755a1f24
// input token WETH 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
// input token index

/// @title ERC20_Curve_Strategy
/// @notice Strategy contract for depositing WETH into a Curve pool on Ethereum.
contract CurveEthStrategy is EthStrategyParent {
    using SafeERC20 for IERC20;

    ICurvePoolFixed public immutable receiptToken;
    ICurveLiquidityGauge public immutable gauge;

    address public swapHelperEthereum;
    IMinter constant minter =
        IMinter(0xd061D61a4d941c39E5453435B6345Dc261C2fcE0);
    IWETH public immutable weth;

    uint256 public inputTokenIndex; // inputToken's index in the Curve pool
    address public rewardsTokenAddress;

    bool public stakingEnabled = false;
    uint16 public harvestSwapSlippage = 500; // 5% slippage

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _withdrawHelper Address of the withdraw helper contract.
    /// @param _swapHelper Address of the swap helper contract.
    /// @param _receiptTokenAddress Address of the Curve pool.
    /// @param _inputTokenAddress Address of the input token (WETH).
    /// @param _liquidityGaugeAddress Address of the Curve liquidity gauge.
    constructor(
        string memory _name,
        address _amanaVault,
        address _withdrawHelper,
        address _swapHelper,
        address _receiptTokenAddress,
        address _inputTokenAddress, // weth
        address _liquidityGaugeAddress,
        address _rewardsTokenAddress,
        uint256 _inputTokenIndex
    ) StrategyParent(_name, _amanaVault, GATEWAY_ADDRESS, _withdrawHelper) {
        swapHelperEthereum = _swapHelper;
        weth = IWETH(_inputTokenAddress);
        receiptToken = ICurvePoolFixed(_receiptTokenAddress);
        gauge = ICurveLiquidityGauge(_liquidityGaugeAddress);
        rewardsTokenAddress = _rewardsTokenAddress;
        inputTokenIndex = _inputTokenIndex;
    }

    /// @notice Allows the owner to enable or disable staking.
    function setStakingEnabled(bool _enabled) external onlyOwner {
        stakingEnabled = _enabled;
    }

    /**
     * @notice Sets the slippage tolerance for harvesting rewards.
     * @dev This function allows the owner to update the slippage buffer applied when swapping harvested rewards.
     * @param _slippage The new slippage tolerance in basis points (e.g., 500 for 5%).
     */
    function setHarvestSwapSlippage(uint16 _slippage) external onlyOwner {
        harvestSwapSlippage = _slippage;
    }

    /**
     * @notice Stakes all LP tokens held by the contract into the gauge.
     * @dev This function approves the gauge to spend the contract’s LP tokens and deposits them into the gauge for staking.
     * Only callable by the contract owner.
     */
    function stakeAll() external onlyOwner {
        uint256 lpTokensHeld = receiptToken.balanceOf(address(this)); // Unstaked LP tokens
        if (lpTokensHeld > 0) {
            approveOrIncreaseAllowance(
                IERC20(receiptToken),
                address(gauge),
                lpTokensHeld
            );
            gauge.deposit(lpTokensHeld);
        }
    }

    /**
     * @notice Unstakes all LP tokens from the gauge and returns them to the contract.
     * @dev This function withdraws all staked LP tokens from the gauge.
     * Only callable by the contract owner.
     */
    function unStakeAll() external onlyOwner {
        uint256 lpTokensStaked = gauge.balanceOf(address(this)); // Staked LP tokens
        if (lpTokensStaked > 0) {
            gauge.withdraw(lpTokensStaked);
        }
    }

    /**
     * @notice Swaps COMP for WETH on Uniswap V3 (Polygon)
     * @param amountIn Amount of COMP to swap
     * @param slippageBps slippage
     * @return amountOut The amount of WETH received
     */
    function swapCrvForWeth(
        uint256 amountIn,
        uint16 slippageBps
    ) internal returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be greater than zero");

        SafeERC20.safeTransfer(
            IERC20(rewardsTokenAddress),
            swapHelperEthereum,
            amountIn
        );
        uint16 maxDeadline = uint16(block.timestamp + 1 hours); // Set a deadline for the swap

        amountOut = ISwapHelper(swapHelperEthereum).swap(
            rewardsTokenAddress,
            amountIn,
            address(weth),
            slippageBps,
            address(this),
            maxDeadline,
            "" // empty bytes param for future-proofing
        );

        return amountOut;
    }

    function claimRewards() public returns (uint256) {
        uint256 amountBefore = IERC20(rewardsTokenAddress).balanceOf(
            address(this)
        );
        minter.mint(address(gauge));
        uint256 amountAfter = IERC20(rewardsTokenAddress).balanceOf(
            address(this)
        );

        emit RewardsClaimed(
            address(this),
            rewardsTokenAddress,
            amountAfter - amountBefore
        );
        return amountAfter - amountBefore;
    }

    /// @notice Harvests CRV rewards, swaps them to WETH, and redeposits into the Curve pool.
    function harvest() public {
        if (!stakingEnabled) return; // Skip if staking is disabled

        // Step 1: Check if there are claimable CRV rewards
        minter.mint(address(gauge));

        // Step 2: Check CRV balance after claiming
        uint256 crvBalance = IERC20(rewardsTokenAddress).balanceOf(
            address(this)
        );

        if (crvBalance == 0) {
            return; // Exit function gracefully if no CRV to swap
        }

        uint256 wethReceived = swapCrvForWeth(crvBalance, harvestSwapSlippage);

        // Step 5: Reinvest the received WETH back into the Curve pool
        uint256[2] memory amounts;
        amounts[inputTokenIndex] = wethReceived; // Only deposit WETH
        approveOrIncreaseAllowance(
            IERC20(weth),
            address(receiptToken),
            wethReceived
        );
        uint256 shares = receiptToken.add_liquidity(amounts, 0); // TODO add slippage
        if (stakingEnabled) {
            approveOrIncreaseAllowance(
                IERC20(receiptToken),
                address(gauge),
                shares
            );
            gauge.deposit(shares);
        }
        emit RewardsHarvested(crvBalance, crvBalance, wethReceived);
    }

    /// @notice Deposits WETH into the Curve pool.
    /// @param amount Amount of WETH to deposit.
    /// @param minimumOut Minimum LP tokens expected.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal override {
        weth.deposit{value: amount}();
        uint256[2] memory amounts;
        amounts[inputTokenIndex] = amount; // Only deposit WETH

        approveOrIncreaseAllowance(IERC20(weth), address(receiptToken), amount);
        // IERC20(weth).approve(address(receiptToken), type(uint256).max);
        uint256 shares = receiptToken.add_liquidity(amounts, minimumOut);

        if (stakingEnabled) {
            approveOrIncreaseAllowance(
                IERC20(receiptToken),
                address(gauge),
                shares
            );
            gauge.deposit(shares);
        }
    }

    /// @notice Withdraws ETH from the Curve pool.
    /// @param fractionToWithdraw The fraction of shares to withdraw.
    /// @param minAmountOut The minimum amount of WETH to withdraw.
    /// @return amountWithdrawn The amount of WETH successfully withdrawn.
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
            gauge.withdraw(sharesToWithdraw);
        }
        amountWithdrawn = receiptToken.remove_liquidity_one_coin(
            sharesToWithdraw,
            int128(int256(inputTokenIndex)),
            minAmountOut
        );
        weth.withdraw(amountWithdrawn);
    }

    /// @notice Transfers assets to a new strategy.
    function _transferAssetsToNewStrategy(
        uint256 minAmountOut,
        uint256 minimumSharesOut,
        address newStrategy,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) internal override {
        if (IStrategy(newStrategy).amanaVault() != amanaVault) {
            revert InvalidAmanaVault();
        }
        uint256 withdrawnAmount = _withdrawFundsFromYieldSource(
            1e18, // Withdraw all
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

    /// @notice Returns the total underlying assets held in the Curve pool, including staked LP tokens.
    function totalUnderlyingAssets() public view override returns (uint256) {
        uint256 lpTokensHeld = receiptToken.balanceOf(address(this)); // Unstaked LP tokens
        uint256 lpTokensStaked = gauge.balanceOf(address(this)); // Staked LP tokens

        uint256 totalLPTokens = lpTokensHeld + lpTokensStaked; // Total LP tokens
        if (totalLPTokens == 0) {
            return 0;
        }
        return convertToAssets(totalLPTokens);
    }

    function getStrategyWithdrawShareAmount(
        uint256 fractionOfTotalShares
    ) public view override returns (uint256) {
        uint256 totalShares = stakingEnabled
            ? gauge.balanceOf(address(this))
            : receiptToken.balanceOf(address(this));
        uint256 withdrawShareAmount = (fractionOfTotalShares *
            totalShares +
            5e17) / 1e18;
        if (withdrawShareAmount > totalShares) {
            withdrawShareAmount = totalShares;
        }
        return withdrawShareAmount;
    }

    /// @notice Converts an asset amount (WETH) to Curve LP token shares.
    function convertToShares(
        uint256 assetAmount
    ) public view override returns (uint256) {
        uint256[] memory amounts = new uint256[](2);
        amounts[inputTokenIndex] = assetAmount; // Only withdraw WETH
        uint256 shares = receiptToken.calc_token_amount(amounts, false);
        return shares;
    }

    /// @notice Converts Curve LP token shares to an asset amount (WETH).
    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256) {
        uint256 assets = receiptToken.calc_withdraw_one_coin(
            shares,
            int128(int256(inputTokenIndex))
        );
        return assets;
    }

    function checkRewards() public returns (uint256) {
        uint256 claimable = gauge.claimable_tokens(address(this));
        return claimable;
    }
}
