// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./EthStrategyParent.sol";
import "../interfaces/ICurvePool.sol";
import "../interfaces/ICurveLiquidityGauge.sol";
import "../interfaces/ISwapRouter.sol";
import "../interfaces/IPriceOracle.sol";

// curve pool 0x0f2f4d68308db60d36268a602ef273421a227021
// liquidity gauge 0x8b859fb47b6377a84b61d3891774de462560742c
// reward token CRV 0xD533a949740bb3306d119CC777fa900bA034cd52
// input token WETH 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2

/// @title ERC20_Curve_Strategy
/// @notice Strategy contract for depositing USDC into a Curve pool on Ethereum.
contract CurveEthStrategy is EthStrategyParent {
    using SafeERC20 for IERC20;

    ICurvePool public immutable receiptToken;
    ICurveLiquidityGauge public immutable gauge;
    ISwapRouter public immutable uniswapRouter;
    IWETH public immutable weth;

    uint256 public constant WETH_INDEX = 0; // USDC's index in the Curve pool
    address public constant REWARD_TOKEN =
        0xD533a949740bb3306d119CC777fa900bA034cd52; // CRV token
    address public constant UNISWAP_ROUTER =
        0xE592427A0AEce92De3Edee1F18E0157C05861564; // Uniswap V3 Router
    bytes32 constant crvUsdPriceFeedId =
        0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8;
    bytes32 constant ethUsdPriceFeedId =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    address constant PRICE_ORACLE_ADDRESS =
        0xFFcB9E833403c311f99d4f2E32Cdf61d4Eb0695f; // on ethereum mainnet

    bool public stakingEnabled = false;
    uint32 public harvestSlippage = 500; // 5% slippage

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _wethAddress Address of the input token (USDC).
    /// @param _receiptTokenAddress Address of the Curve pool.
    /// @param _gateway Address of the ZetaChain Gateway.
    constructor(
        string memory _name,
        address _amanaVault,
        address _receiptTokenAddress,
        address _liquidityGaugeAddress,
        address _gateway,
        address _wethAddress,
        address _withdrawHelper
    ) StrategyParent(_name, _amanaVault, _gateway, _withdrawHelper) {
        receiptToken = ICurvePool(_receiptTokenAddress);
        gauge = ICurveLiquidityGauge(_liquidityGaugeAddress);
        uniswapRouter = ISwapRouter(UNISWAP_ROUTER);
        weth = IWETH(_wethAddress);
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
    function setHarvestSlippage(uint32 _slippage) external onlyOwner {
        harvestSlippage = _slippage;
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

    function fetchCrvEthPrice() public view returns (uint256) {
        uint256 crvUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
            crvUsdPriceFeedId
        );
        uint256 ethUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
            ethUsdPriceFeedId
        );

        require(ethUsdPrice > 0, "Invalid ETH price");

        return (crvUsdPrice * 1e18) / ethUsdPrice;
    }

    /// @notice Deposits USDC into the Curve pool.
    /// @param amount Amount of USDC to deposit.
    /// @param minimumOut Minimum LP tokens expected.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal override {
        weth.deposit{value: amount}();

        uint256[] memory amounts = new uint256[](2);
        amounts[WETH_INDEX] = amount; // Only deposit WETH

        approveOrIncreaseAllowance(IERC20(weth), address(receiptToken), amount);
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

    /// @notice Harvests CRV rewards, swaps them to WETH, and redeposits into the Curve pool.
    function harvest(uint256 minUSDCOut) public {
        if (!stakingEnabled) return; // Skip if staking is disabled

        // Step 1: Check if there are claimable CRV rewards
        uint256 claimableCRV = gauge.claimable_reward(
            address(this),
            REWARD_TOKEN
        );

        if (claimableCRV > 0) {
            // Claim rewards only if there are claimable rewards
            gauge.claim_rewards();
        }

        // Step 2: Check CRV balance after claiming
        uint256 crvBalance = IERC20(REWARD_TOKEN).balanceOf(address(this));
        if (crvBalance == 0) {
            return; // Exit function gracefully if no CRV to swap
        }

        // Step 3: Approve Uniswap to spend CRV
        approveOrIncreaseAllowance(
            IERC20(REWARD_TOKEN),
            address(uniswapRouter),
            crvBalance
        );

        // Step 4: Swap CRV for USDC on Uniswap V3 (using 0.05% fee tier)
        address[] memory path = new address[](2);
        path[0] = REWARD_TOKEN;
        path[1] = address(weth);

        ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: REWARD_TOKEN,
                tokenOut: address(weth),
                fee: 500, // 0.05% pool fee
                recipient: address(this),
                deadline: block.timestamp + 60,
                amountIn: crvBalance,
                amountOutMinimum: minUSDCOut,
                sqrtPriceLimitX96: 0
            });

        uint256 wethReceived = uniswapRouter.exactInputSingle(swapParams);
        require(wethReceived >= minUSDCOut, "Insufficient USDC from swap");

        // Step 5: Reinvest the received WETH back into the Curve pool
        uint256[] memory amounts = new uint256[](2);
        amounts[WETH_INDEX] = wethReceived; // Only deposit USDC
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
    }

    /// @notice Withdraws ETH from the Curve pool.
    /// @param fractionToWithdraw The fraction of shares to withdraw.
    /// @param minAmountOut The minimum amount of USDC to withdraw.
    /// @return amountWithdrawn The amount of USDC successfully withdrawn.
    function _withdrawFundsFromYieldSource(
        uint256 fractionToWithdraw,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(
            fractionToWithdraw
        );
        if (stakingEnabled) {
            uint256 crvPrice = fetchCrvUsdPrice(); // CRV/USD price (1e18 precision)
            uint256 ethPrice = fetchEthUsdPrice(); // ETH/USD price (1e18 precision)
            uint256 crvBalance = IERC20(REWARD_TOKEN).balanceOf(address(this));

            // Convert CRV to ETH
            uint256 minWethOut = (crvBalance *
                crvPrice *
                (10000 - harvestSlippage)) / (10000 * ethPrice * 1e18); // Apply 5% slippage buffer

            harvest(minWethOut);
            gauge.withdraw(sharesToWithdraw);
        }
        amountWithdrawn = receiptToken.remove_liquidity_one_coin(
            sharesToWithdraw,
            int128(int256(WETH_INDEX)),
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
        uint256 withdrawnAmount = _withdrawFundsFromYieldSource(
            1e18, // Withdraw all
            minAmountOut
        );

        approveOrIncreaseAllowance(weth, newStrategy, withdrawnAmount);

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

    function fetchCrvUsdPrice() public view returns (uint256) {
        return IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(crvUsdPriceFeedId);
    }

    function fetchEthUsdPrice() public view returns (uint256) {
        return IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(ethUsdPriceFeedId);
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

    /// @notice Converts an asset amount (USDC) to Curve LP token shares.
    function convertToShares(
        uint256 assetAmount
    ) public view override returns (uint256) {
        uint256[] memory amounts = new uint256[](2);
        amounts[WETH_INDEX] = assetAmount; // Only withdraw USDC
        uint256 shares = receiptToken.calc_token_amount(amounts, false);
        return shares;
    }

    /// @notice Converts Curve LP token shares to an asset amount (USDC).
    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256) {
        uint256 assets = receiptToken.calc_withdraw_one_coin(
            shares,
            int128(int256(WETH_INDEX))
        );
        return assets;
    }

    function checkRewards() public view returns (uint256) {
        uint256 claimable = gauge.claimable_reward(msg.sender, REWARD_TOKEN);
        return claimable;
    }
}
