// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./EthStrategyParent.sol";
import "../interfaces/ICurvePool.sol";
import "../interfaces/ICurveLiquidityGauge.sol";
import "../interfaces/IUniswapV3Router.sol";
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
    IUniswapV3Router public immutable uniswapRouter;
    IWETH public immutable weth;

    uint256 public constant WETH_INDEX = 1; // USDC's index in the Curve pool
    address public constant REWARD_TOKEN =
        0xD533a949740bb3306d119CC777fa900bA034cd52; // CRV token
    address public constant UNISWAP_ROUTER =
        0xE592427A0AEce92De3Edee1F18E0157C05861564; // Uniswap V3 Router
    bytes32 constant crvUsdPriceFeedId =
        0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f;
    bytes32 constant ethUsdPriceFeedId =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    address constant PRICE_ORACLE_ADDRESS =
        0x4305FB66699C3B2702D4d05CF36551390A4c69C6; // mainnet only

    bool public stakingEnabled = true;

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
        address _wethAddress
    ) StrategyParent(_name, _amanaVault, _gateway) {
        receiptToken = ICurvePool(_receiptTokenAddress);
        gauge = ICurveLiquidityGauge(_liquidityGaugeAddress);
        uniswapRouter = IUniswapV3Router(UNISWAP_ROUTER);
        weth = IWETH(_wethAddress);
    }

    /// @notice Allows the owner to enable or disable staking.
    function setStakingEnabled(bool _enabled) external onlyOwner {
        stakingEnabled = _enabled;
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

        IUniswapV3Router.ExactInputSingleParams memory swapParams = IUniswapV3Router
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
        uint256 totalShares = stakingEnabled
            ? gauge.balanceOf(address(this))
            : receiptToken.balanceOf(address(this));
        uint256 sharesToWithdraw = (fractionToWithdraw * totalShares + 5e17) /
            1e18;
        if (sharesToWithdraw > totalShares) {
            sharesToWithdraw = totalShares;
        }
        if (stakingEnabled) {
            harvest(0);
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
        uint256 totalShares = stakingEnabled
            ? gauge.balanceOf(address(this))
            : receiptToken.balanceOf(address(this));

        if (stakingEnabled) {
            harvest(0);
            gauge.withdraw(totalShares);
        }
        uint256 amountWithdrawn = receiptToken.remove_liquidity_one_coin(
            totalShares,
            int128(int256(WETH_INDEX)),
            minAmountOut
        );

        approveOrIncreaseAllowance(weth, newStrategy, amountWithdrawn);

        IStrategy(newStrategy).depositFromOldStrategy(
            amountWithdrawn,
            minimumSharesOut,
            currentExecutionNonce,
            _crossChainTxId
        );

        emit AssetsTransferredToNewStrategy(
            newStrategy,
            amountWithdrawn,
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
