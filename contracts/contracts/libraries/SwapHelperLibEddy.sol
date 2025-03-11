// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/IZRC20.sol";
import "../interfaces/IErrors.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/ICurvePool.sol";
import "../interfaces/IUniswapV3Factory.sol";
import "../interfaces/IUniswapV3Pool.sol";

import "../CurvePoolRegistry.sol";
import "hardhat/console.sol";

library SwapHelperLibEddy {
    address constant UNISWAP_V2_FACTORY =
        0x9fd96203f7b22bCF72d9DCb40ff98302376cE09c; // mainnet and testnet
    address constant UNISWAP_V2_ROUTER =
        0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe; // mainnet and testnet
    address constant UNISWAP_V3_FACTORY =
        0x67AA6B2b715937Edc1Eb4D3b7B5d5dCD1fd93E8C; // mainnet and testnet
    address constant UNISWAP_V3_ROUTER =
        0x9b30CfbACD3504252F82263F72D6acf62bf733C2;
    uint24 constant V3_FEE_TIER_LOW = 500;
    uint24 constant V3_FEE_TIER_HIGH = 3000;

    address constant WZETA_TOKEN = 0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf; // mainnet and testnet

    address constant PRICE_ORACLE_ADDRESS =
        0x0D313486083fe6f0A1868EAeEe07D46fed92E9f9; // mainnet only

    address constant ETH_ETH_ADDRESS =
        0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891; // mainnet only
    address constant USDC_ETH_ADDRESS =
        0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a; // mainnet only
    address constant USDT_ETH_ADDRESS =
        0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7; // mainnet only

    address constant ETH_BASE_ADDRESS =
        0x1de70f3e971B62A0707dA18100392af14f7fB677; // mainnet only
    address constant USDC_BASE_ADDRESS =
        0x96152E6180E085FA57c7708e18AF8F05e37B479D; // mainnet only

    address constant BNB_BSC_ADDRESS =
        0x48f80608B672DC30DC7e3dbBd0343c5F02C738Eb; // mainnet only
    address constant USDT_BSC_ADDRESS =
        0x91d4F0D54090Df2D81e834c3c8CE71C6c865e79F; // mainnet only
    address constant USDC_BSC_ADDRESS =
        0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0; // mainnet only

    address constant POL_POLYGON_ADDRESS =
        0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501; // mainnet only
    address constant USDT_POL_ADDRESS =
        0xdbfF6471a79E5374d771922F2194eccc42210B9F; // mainnet only
    address constant USDC_POL_ADDRESS =
        0xfC9201f4116aE6b054722E10b98D904829b469c3; // mainnet only

    address constant SOL_SOL_ADDRESS =
        0x4bC32034caCcc9B7e02536945eDbC286bACbA073;
    address constant USDC_SOL_ADDRESS =
        0x8344d6f84d26f998fa070BbEA6D2E15E359e2641;
    address constant USDT_SOL_ADDRESS =
        0xEe9CC614D03e7Dbe994b514079f4914a605B4719;

    bytes32 constant ethUsdPriceFeedId =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    bytes32 constant polUsdPriceFeedId =
        0xffd11c5a1cfd42f80afb2df4d9f264c15f956d68153335374ec10722edd70472;
    bytes32 constant bnbUsdPriceFeedId =
        0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f;
    bytes32 constant zetaUsdPriceFeedId =
        0xb70656181007f487e392bf0d92e55358e9f0da5da6531c7c4ce7828aa11277fe;
    bytes32 constant solUsdPriceFeedId =
        0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d;

    address constant CURVE_POOL_REGISTRY =
        0x5524124b8F36e682f3A23D069399247806e8B627; // mainnet only

    /**
     * @notice Returns the price feed ID for a given token address.
     * @param token The address of the token.
     * @return The price feed ID associated with the token.
     */
    function getPriceFeedId(address token) internal pure returns (bytes32) {
        if (token == ETH_ETH_ADDRESS || token == ETH_BASE_ADDRESS) {
            return ethUsdPriceFeedId;
        } else if (token == POL_POLYGON_ADDRESS) {
            return polUsdPriceFeedId;
        } else if (token == BNB_BSC_ADDRESS) {
            return bnbUsdPriceFeedId;
        } else if (token == WZETA_TOKEN) {
            return zetaUsdPriceFeedId;
        } else if (token == SOL_SOL_ADDRESS) {
            return solUsdPriceFeedId;
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
        return (token == USDC_BSC_ADDRESS ||
            token == USDC_ETH_ADDRESS ||
            token == USDC_POL_ADDRESS ||
            token == USDC_BASE_ADDRESS ||
            token == USDT_BSC_ADDRESS ||
            token == USDT_ETH_ADDRESS ||
            token == USDT_POL_ADDRESS ||
            token == USDC_SOL_ADDRESS ||
            token == USDT_SOL_ADDRESS);
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
     * @param slippageBps The slippage tolerance in basis points (e.g., 50 for 0.5%).
     * @return The minimum acceptable output amount.
     */
    function calculateMinAmountOut(
        address inputToken,
        address outputToken,
        uint256 amount,
        uint16 slippageBps
    ) internal view returns (uint256) {
        console.log(inputToken);
        bytes32 inputPriceFeed = getPriceFeedId(inputToken);
        console.log(outputToken);
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
        console.log("inputPriceFeed");
        uint256 inputPrice = isStablecoin(inputToken)
            ? 1e8
            : IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(inputPriceFeed);
        console.log("outputPriceFeed");
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

    function _existsPairPool(
        address tokenA,
        address tokenB
    ) internal view returns (bool) {
        address pair = IUniswapV2Factory(UNISWAP_V2_FACTORY).getPair(
            tokenA,
            tokenB
        );
        return pair != address(0) && IUniswapV2Pair(pair).totalSupply() > 0;
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
        // UniswapV2 Direct Swap
        if (
            _existsPairPool(zrc20, USDC_ETH_ADDRESS) &&
            _existsPairPool(USDC_ETH_ADDRESS, targetZRC20)
        ) {
            path = new address[](3);
            feeTiers = new uint24[](1);
            path[0] = zrc20;
            path[1] = USDC_ETH_ADDRESS;
            path[2] = targetZRC20;
            return (path, feeTiers, "");
        }

        // UniswapV3 Indirect Swap via USDC_ETH_ADDRESS (Checks both fee tiers)
        (exists, feeTier) = _existsV3Pool(zrc20, USDC_ETH_ADDRESS);
        if (exists) {
            uint24 feeTier2;
            (exists, feeTier2) = _existsV3Pool(USDC_ETH_ADDRESS, targetZRC20);
            if (exists) {
                path = new address[](3);
                feeTiers = new uint24[](2);
                path[0] = zrc20;
                path[1] = USDC_ETH_ADDRESS;
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

        // UniswapV2 Indirect Swap via WZETA_TOKEN
        if (
            _existsPairPool(zrc20, WZETA_TOKEN) &&
            _existsPairPool(WZETA_TOKEN, targetZRC20)
        ) {
            path = new address[](3);
            feeTiers = new uint24[](1);
            path[0] = zrc20;
            path[1] = WZETA_TOKEN;
            path[2] = targetZRC20;
            return (path, feeTiers, "");
        }
        revert IErrors.InsufficientLiquidity();
    }

    function getAmountOutV2(
        uint amountIn,
        address[] memory path
    ) public view returns (uint amountOut) {
        if (amountIn == 0 || path.length < 2) {
            revert IErrors.InvalidPath();
        }

        amountOut = amountIn;

        for (uint i = 0; i < path.length - 1; i++) {
            address tokenIn = path[i];
            address tokenOut = path[i + 1];

            // Fetch the Uniswap V2 pair
            address pair = IUniswapV2Factory(UNISWAP_V2_FACTORY).getPair(
                tokenIn,
                tokenOut
            );
            if (pair == address(0)) {
                revert IErrors.InsufficientLiquidity();
            }

            // Fetch reserves
            (uint reserve0, uint reserve1, ) = IUniswapV2Pair(pair)
                .getReserves();
            (uint reserveIn, uint reserveOut) = tokenIn < tokenOut
                ? (reserve0, reserve1)
                : (reserve1, reserve0);

            if (reserveIn == 0 || reserveOut == 0) {
                revert IErrors.InsufficientLiquidity();
            }

            // Apply Uniswap V2 swap formula
            uint amountInWithFee = amountOut * 997;
            uint numerator = amountInWithFee * reserveOut;
            uint denominator = (reserveIn * 1000) + amountInWithFee;
            amountOut = numerator / denominator;
        }
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

    function getReserves(
        address tokenA,
        address tokenB
    ) internal view returns (uint reserveA, uint reserveB) {
        address pair = IUniswapV2Factory(UNISWAP_V2_FACTORY).getPair(
            tokenA,
            tokenB
        );
        if (pair == address(0)) revert IErrors.InsufficientLiquidity();
        (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(pair)
            .getReserves();
        (address token0, ) = sortTokens(tokenA, tokenB);
        (reserveA, reserveB) = tokenA == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
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
            try ICurvePool(pool).coins(i) returns (address poolToken) {
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
        amountOut = ICurvePool(curvePool).get_dy(i, j, amount);
    }

    function approveOrIncreaseAllowance(
        IZRC20 token,
        address spender,
        uint256 amount
    ) internal {
        uint256 currentAllowance = token.allowance(msg.sender, spender);

        if (currentAllowance == 0) {
            // First-time approval
            token.approve(spender, amount);
        } else {
            // Handle USDT-like tokens by forcing reset to zero first
            token.approve(spender, 0); // Reset to zero
            token.approve(spender, amount); // Set new allowance
        }
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
                return getAmountOutV2(amount, path);
            }
        }
    }
}
