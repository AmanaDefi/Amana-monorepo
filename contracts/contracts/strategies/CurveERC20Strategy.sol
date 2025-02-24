// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ERC20StrategyParent.sol";
import "../interfaces/ICurvePool.sol";
import "../interfaces/ICurveLiquidityGauge.sol";
import "../interfaces/IUniswapV3Router.sol";
import "../interfaces/IPriceOracle.sol";

// input token USDC 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
// curve pool 0x169A5f124A3663a25313Ee0F7f3Bff028728867f
// liquidity gauge 0x4F80f85FF3bf92643d8C0Afd5bC107051A661185
// reward token CRV 0xD533a949740bb3306d119CC777fa900bA034cd52

/// @title ERC20_Curve_Strategy
/// @notice Strategy contract for depositing USDC into a Curve pool on Ethereum.
contract CurveERC20Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    ICurvePool public immutable receiptToken;
    ICurveLiquidityGauge public immutable gauge;
    IUniswapV3Router public immutable uniswapRouter;

    uint256 public constant USDC_INDEX = 1; // USDC's index in the Curve pool
    address public constant REWARD_TOKEN =
        0xD533a949740bb3306d119CC777fa900bA034cd52; // CRV token
    address public constant UNISWAP_ROUTER =
        0xE592427A0AEce92De3Edee1F18E0157C05861564; // Uniswap V3 Router
    bytes32 constant crvUsdPriceFeedId =
        0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8;
    address constant PRICE_ORACLE_ADDRESS =
        0x4305FB66699C3B2702D4d05CF36551390A4c69C6; // TODO - deploy and add

    bool public stakingEnabled = false;

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _inputTokenAddress Address of the input token (USDC).
    /// @param _receiptTokenAddress Address of the Curve pool.
    /// @param _gateway Address of the ZetaChain Gateway.
    constructor(
        string memory _name,
        address _amanaVault,
        address _inputTokenAddress,
        address _receiptTokenAddress,
        address _liquidityGaugeAddress,
        address _gateway
    )
        StrategyParent(_name, _amanaVault, _gateway)
        ERC20StrategyParent(_inputTokenAddress)
    {
        receiptToken = ICurvePool(_receiptTokenAddress);
        gauge = ICurveLiquidityGauge(_liquidityGaugeAddress);
        uniswapRouter = IUniswapV3Router(UNISWAP_ROUTER);
    }

    /// @notice Allows the owner to enable or disable staking.
    function setStakingEnabled(bool _enabled) external onlyOwner {
        stakingEnabled = _enabled;
    }

    /// @notice Deposits USDC into the Curve pool.
    /// @param amount Amount of USDC to deposit.
    /// @param minimumOut Minimum LP tokens expected.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal override {
        uint256[] memory amounts = new uint256[](2);
        amounts[USDC_INDEX] = amount; // Only deposit USDC

        approveOrIncreaseAllowance(inputToken, address(receiptToken), amount);
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

    /// @notice Harvests CRV rewards, swaps them to USDC, and redeposits into the Curve pool.
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
        path[1] = address(inputToken);

        IUniswapV3Router.ExactInputSingleParams memory swapParams = IUniswapV3Router
            .ExactInputSingleParams({
                tokenIn: REWARD_TOKEN,
                tokenOut: address(inputToken),
                fee: 500, // 0.05% pool fee
                recipient: address(this),
                deadline: block.timestamp + 60,
                amountIn: crvBalance,
                amountOutMinimum: minUSDCOut,
                sqrtPriceLimitX96: 0
            });

        uint256 usdcReceived = uniswapRouter.exactInputSingle(swapParams);
        require(usdcReceived >= minUSDCOut, "Insufficient USDC from swap");

        // Step 5: Reinvest the received USDC back into the Curve pool
        _depositFundsIntoYieldSource(usdcReceived, 0);
    }

    /// @notice Withdraws USDC from the Curve pool.
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
            // uint256 crvPrice = fetchCrvUsdPrice(); // Fetch CRV price in USD (assumed to be 1e18 precision)
            // uint256 crvBalance = IERC20(REWARD_TOKEN).balanceOf(address(this));

            // uint256 minUsdcOut = (crvBalance * crvPrice * 1000) / (1050 * 1e18); // Apply 5% slippage buffer
            harvest(0);
            gauge.withdraw(sharesToWithdraw);
        }
        amountWithdrawn = receiptToken.remove_liquidity_one_coin(
            sharesToWithdraw,
            int128(int256(USDC_INDEX)),
            minAmountOut
        );
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

        approveOrIncreaseAllowance(inputToken, newStrategy, withdrawnAmount);

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
        amounts[USDC_INDEX] = assetAmount; // Only withdraw USDC
        uint256 shares = receiptToken.calc_token_amount(amounts, false);
        return shares;
    }

    /// @notice Converts Curve LP token shares to an asset amount (USDC).
    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256) {
        uint256 assets = receiptToken.calc_withdraw_one_coin(
            shares,
            int128(int256(USDC_INDEX))
        );
        return assets;
    }

    function checkRewards() public view returns (uint256) {
        uint256 claimable = gauge.claimable_reward(msg.sender, REWARD_TOKEN);
        return claimable;
    }
}
