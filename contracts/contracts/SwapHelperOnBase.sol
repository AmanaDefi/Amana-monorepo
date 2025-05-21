// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "./interfaces/IZRC20.sol";
import "./interfaces/IErrors.sol";
import "./interfaces/IPriceOracle.sol";
import "./interfaces/ICurvePoolDynamic.sol";
import "./interfaces/IUniswapV3Factory.sol";
import "./interfaces/IUniswapV3Pool.sol";
import "./interfaces/ISwapRouter.sol";

import "./CurvePoolRegistry.sol";

// PriceOracle address: 0x7C136bC8A5Ce2245C3357bc4A7B97C1A9A2b480c

contract SwapHelperOnBase {
    address constant WELL = 0xA88594D404727625A9437C3f886C7643872296AE;
    address constant MORPHO = 0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842;
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant UNISWAP_V3_ROUTER =
        0x2626664c2603336E57B271c5C0b26F421741e481;
    address constant UNISWAP_V3_FACTORY =
        0x33128a8fC17869897dcE68Ed026d694621f6FDfD; // mainnet and testnet

    bytes32 constant wellUsdPriceFeedId =
        0x3cf6bab8bf8041dc8ee2a3edebe16b5f9f4ff3cce46006aeb15c885ba4779d0b;
    bytes32 constant morphoUsdPriceFeedId =
        0x5b2a4c542d4a74dd11784079ef337c0403685e3114ba0d9909b5c7a7e06fdc42;
    bytes32 constant ethUsdPriceFeedId =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    uint24 constant V3_FEE_TIER_LOW = 500;
    uint24 constant V3_FEE_TIER_HIGH = 3000;

    address constant WETH_ADDRESS = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619; // mainnet and testnet

    address constant CURVE_POOL_REGISTRY =
        0x5524124b8F36e682f3A23D069399247806e8B627; // mainnet only

    address public immutable PRICE_ORACLE_ADDRESS;

    constructor(address _priceOracle) {
        PRICE_ORACLE_ADDRESS = _priceOracle;
    }

    /**
     * @notice Returns the price feed ID for a given token address.
     * @param token The address of the token.
     * @return The price feed ID associated with the token.
     */
    function getPriceFeedId(address token) internal pure returns (bytes32) {
        if (token == WELL) {
            return wellUsdPriceFeedId;
        } else if (token == MORPHO) {
            return morphoUsdPriceFeedId;
        } else {
            return bytes32(0); // Return zero bytes if no price feed exists
        }
    }

    /**
     * @notice Checks if a token is a USD stablecoin.
     * @param token The address of the token.
     * @return True if the token is a stablecoin, false otherwise.
     */
    function isStablecoin(address token) internal pure returns (bool) {
        return (token == USDC);
    }

    /**
     * @notice Fetches the token's decimal places from its contract.
     * @dev Assumes 18 decimals for native tokens (ETH, BNB, POL, WZETA).
     * @param token The address of the token.
     * @return The number of decimal places.
     */
    function getTokenDecimals(address token) internal view returns (uint8) {
        return IERC20Metadata(token).decimals();
    }

    /**
     * @notice Calculates the minimum output amount based on input token, output token, and slippage.
     * @param inputToken The address of the input token.
     * @param outputToken The address of the output token.
     * @param amount The input amount in token units.
     * @return The minimum acceptable output amount.
     */
    function calculateMinAmountOut(
        address inputToken,
        address outputToken,
        uint256 amount,
        uint16 slippageBps
    ) internal view returns (uint256) {
        bytes32 inputPriceFeed = getPriceFeedId(inputToken);
        bytes32 outputPriceFeed = getPriceFeedId(outputToken);

        require(
            inputPriceFeed != bytes32(0) || isStablecoin(inputToken),
            "Invalid input token"
        );
        require(
            outputPriceFeed != bytes32(0) || isStablecoin(outputToken),
            "Invalid output token"
        );

        // Assume 1 USD = 1 USDC/USDT if it's a stablecoin
        uint256 inputPrice = isStablecoin(inputToken)
            ? 1e8
            : IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(inputPriceFeed);
        uint256 outputPrice = isStablecoin(outputToken)
            ? 1e8
            : IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(outputPriceFeed);

        require(inputPrice > 0 && outputPrice > 0, "Invalid price data");

        // Get token decimals dynamically
        uint256 inputDecimals = getTokenDecimals(inputToken);
        uint256 outputDecimals = getTokenDecimals(outputToken);

        // Convert input amount to USD value
        uint256 amountInUsd = (amount * inputPrice) / (10 ** inputDecimals);

        // Convert USD value to output token amount
        uint256 amountOut = (amountInUsd * (10 ** outputDecimals)) /
            outputPrice;

        // Apply slippage
        return amountOut - ((amountOut * slippageBps) / 10000);
    }

    /**
     * @notice Sorts two token addresses in ascending order.
     * @dev Ensures consistent order for token pairs in Uniswap and other protocols.
     * @param tokenA The first token address.
     * @param tokenB The second token address.
     * @return token0 The address of the token that comes first.
     * @return token1 The address of the token that comes second.
     * @custom:reverts CantBeIdenticalAddresses if the two token addresses are identical.
     * @custom:reverts CantBeZeroAddress if one of the token addresses is the zero address.
     */
    function sortTokens(
        address tokenA,
        address tokenB
    ) internal pure returns (address token0, address token1) {
        if (tokenA == tokenB) revert IErrors.InvalidAddress();
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        if (token0 == address(0)) revert IErrors.InvalidAddress();
    }

    function _existsV3Pool(
        address tokenA,
        address tokenB
    ) internal view returns (bool exists, uint24 feeTier) {
        address poolLow = IUniswapV3Factory(UNISWAP_V3_FACTORY).getPool(
            tokenA,
            tokenB,
            V3_FEE_TIER_LOW
        );
        if (poolLow != address(0) && IUniswapV3Pool(poolLow).liquidity() > 0) {
            return (true, V3_FEE_TIER_LOW); // Prioritize 0.05% fee pool
        }

        address poolHigh = IUniswapV3Factory(UNISWAP_V3_FACTORY).getPool(
            tokenA,
            tokenB,
            V3_FEE_TIER_HIGH
        );
        if (
            poolHigh != address(0) && IUniswapV3Pool(poolHigh).liquidity() > 0
        ) {
            return (true, V3_FEE_TIER_HIGH); // Fallback to 0.3% fee pool
        }

        return (false, 0); // No valid V3 pool found
    }

    function getPath(
        address zrc20,
        address targetZRC20
    )
        public
        view
        returns (
            address[] memory path,
            uint24[] memory feeTiers,
            bytes memory encodedPath
        )
    {
        if (zrc20 == targetZRC20) {
            revert IErrors.InvalidAddress();
        }
        bool exists;
        uint24 feeTier;

        // UniswapV3 Direct Swap (Checks both fee tiers, prioritizes 0.05%)
        (exists, feeTier) = _existsV3Pool(zrc20, targetZRC20);
        if (exists) {
            path = new address[](2);
            feeTiers = new uint24[](1);
            path[0] = zrc20;
            path[1] = targetZRC20;
            feeTiers[0] = feeTier;
            encodedPath = abi.encodePacked(path[0], feeTiers[0], path[1]);
            return (path, feeTiers, encodedPath);
        }

        // UniswapV3 Indirect Swap via WETH_ADDRESS (Checks both fee tiers)
        (exists, feeTier) = _existsV3Pool(zrc20, WETH_ADDRESS);
        if (exists) {
            uint24 feeTier2;
            (exists, feeTier2) = _existsV3Pool(WETH_ADDRESS, targetZRC20);
            if (exists) {
                path = new address[](3);
                feeTiers = new uint24[](2);
                path[0] = zrc20;
                path[1] = WETH_ADDRESS;
                path[2] = targetZRC20;
                feeTiers[0] = feeTier;
                feeTiers[1] = feeTier2;
                encodedPath = abi.encodePacked(path[0]);
                for (uint256 k = 0; k < feeTiers.length; k++) {
                    encodedPath = abi.encodePacked(
                        encodedPath,
                        feeTiers[k],
                        path[k + 1]
                    );
                }
                return (path, feeTiers, encodedPath);
            }
        }
        revert IErrors.InsufficientLiquidity();
    }

    function getAmountOutV3(
        uint amountIn,
        address[] memory path,
        uint24[] memory feeTiers
    ) internal view returns (uint amountOut) {
        if (
            amountIn == 0 ||
            path.length < 2 ||
            path.length - 1 != feeTiers.length
        ) {
            revert IErrors.InvalidPath();
        }

        amountOut = amountIn;

        for (uint i = 0; i < path.length - 1; i++) {
            address tokenIn = path[i];
            address tokenOut = path[i + 1];
            uint24 feeTier = feeTiers[i];

            // Fetch Uniswap V3 pool address
            address pool = IUniswapV3Factory(UNISWAP_V3_FACTORY).getPool(
                tokenIn,
                tokenOut,
                feeTier
            );
            if (pool == address(0)) {
                revert IErrors.InsufficientLiquidity();
            }

            // Fetch slot0 to get sqrtPriceX96
            (uint160 sqrtPriceX96, , , , , , ) = IUniswapV3Pool(pool).slot0();
            uint128 liquidity = IUniswapV3Pool(pool).liquidity();
            if (liquidity == 0) {
                revert IErrors.InsufficientLiquidity();
            }

            // Calculate amountOut using Uniswap V3 price formula
            uint256 priceX96 = (uint256(sqrtPriceX96) * uint256(sqrtPriceX96)) /
                (1 << 96);
            amountOut = (amountOut * priceX96) / (1 << 96);
        }
    }

    /**
     * @notice Finds the index of a token in a Curve pool.
     * @param token The token to find in the pool.
     * @param pool The Curve pool address.
     * @return index The token index in the pool.
     */
    function getTokenIndex(
        address token,
        address pool
    ) public view returns (uint256) {
        // Assume Curve pools have at most 8 tokens
        for (uint256 i = 0; i < 8; i++) {
            try ICurvePoolDynamic(pool).coins(i) returns (address poolToken) {
                if (poolToken == token) {
                    return i;
                }
            } catch {
                break; // Stop if out of range
            }
        }
        revert("Token not found in Curve pool");
    }

    /**
     * @notice Finds the Curve pool for a token pair and calculates the expected amount out.
     * @param inputToken The token being swapped from.
     * @param outputToken The token being swapped to.
     * @return curvePool The address of the curve pool to use.
     */
    function getCurvePool(
        address inputToken,
        address outputToken
    ) public view returns (address curvePool, uint256 i, uint256 j) {
        CurvePoolRegistry registry = CurvePoolRegistry(CURVE_POOL_REGISTRY);
        curvePool = registry.getBestPool(inputToken, outputToken);
        // Find token indexes in the pool using getTokenIndex()
        if (curvePool != address(0)) {
            i = getTokenIndex(inputToken, curvePool);
            j = getTokenIndex(outputToken, curvePool);
        } else {
            i = 0;
            j = 0;
        }
    }

    /**
     * @notice Finds the Curve pool for a token pair and calculates the expected amount out.
     * @param inputToken The token being swapped from.
     * @param outputToken The token being swapped to.
     * @param amount The input amount in token units.
     * @return amountOut The expected amount out from the Curve pool.
     */
    function getCurveAmountOut(
        address curvePool,
        address inputToken,
        address outputToken,
        uint256 amount
    ) public view returns (uint256 amountOut) {
        // Find token indexes in the pool using getTokenIndex()
        uint256 i = getTokenIndex(inputToken, curvePool);
        uint256 j = getTokenIndex(outputToken, curvePool);

        // Fetch amount out from Curve pool
        amountOut = ICurvePoolDynamic(curvePool).get_dy(i, j, amount);
    }

    function approveOrIncreaseAllowance(
        IERC20 token,
        address spender,
        uint256 amount
    ) internal {
        bytes memory approveCalldata = abi.encodeWithSelector(
            IERC20.approve.selector,
            spender,
            amount
        );

        (bool success, ) = address(token).call(approveCalldata);
        if (success) return;

        // If initial approve failed, try resetting to zero first
        bytes memory resetCalldata = abi.encodeWithSelector(
            IERC20.approve.selector,
            spender,
            0
        );
        (bool resetSuccess, ) = address(token).call(resetCalldata);
        require(resetSuccess, "Reset to 0 failed");

        (bool secondApproveSuccess, ) = address(token).call(approveCalldata);
        require(secondApproveSuccess, "Second approve failed");
    }

    function getAmountOutCurveOrUniswap(
        address inputToken,
        address outputToken,
        uint256 amount
    ) public view returns (uint256) {
        (address curvePool, , ) = getCurvePool(inputToken, outputToken);
        if (curvePool != address(0)) {
            return
                getCurveAmountOut(curvePool, inputToken, outputToken, amount);
        } else {
            (
                address[] memory path,
                uint24[] memory feeTiers,
                bytes memory encodedPath
            ) = getPath(inputToken, outputToken);

            if (encodedPath.length > 0) {
                return getAmountOutV3(amount, path, feeTiers);
            } else {
                revert IErrors.InsufficientLiquidity();
            }
        }
    }

    function swap(
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint16 slippageBps,
        address vault,
        uint16 maxDeadline,
        bytes memory data
    ) external returns (uint256 amountOut) {
        amountOut = 0;
        // uint256 minimumOut = calculateMinAmountOut(
        //     zrc20,
        //     targetZRC20,
        //     amount,
        //     slippageBps
        // );
        // (address curvePool, uint256 i, uint256 j) = getCurvePool(
        //     zrc20,
        //     targetZRC20
        // );
        // if (curvePool != address(0)) {
        //     // Approve Curve pool to spend tokens
        //     IZRC20(zrc20).approve(curvePool, amount);
        //     return ICurvePoolDynamic(curvePool).exchange(i, j, amount, minimumOut);
        // } else {
        // (
        //     address[] memory path,
        //     uint24[] memory feeTiers,
        //     bytes memory encodedPath
        // ) = getPath(zrc20, targetZRC20);
        // if (encodedPath.length > 0) {
        //     // Uniswap V3 Swap
        //     IZRC20(zrc20).approve(UNISWAP_V3_ROUTER, amount);
        //     ISwapRouter.ExactInputParams memory params = ISwapRouter
        //         .ExactInputParams({
        //             path: encodedPath,
        //             recipient: vault,
        //             deadline: block.timestamp + maxDeadline,
        //             amountIn: amount,
        //             amountOutMinimum: minimumOut
        //         });

        //     amountOut = ISwapRouter(UNISWAP_V3_ROUTER).exactInput(params);
        // }
        // }
    }
}
