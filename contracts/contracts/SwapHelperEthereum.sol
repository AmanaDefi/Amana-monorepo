// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IErrors.sol";
import "./interfaces/IPriceOracle.sol";
import "./interfaces/ICurvePoolDynamic.sol";
import "./interfaces/IUniswapV3Factory.sol";
import "./interfaces/IUniswapV3Pool.sol";
import "./interfaces/ISwapRouter.sol";

// import "./CurvePoolRegistry.sol";

contract SwapHelperEthereum is Ownable {
    address constant UNISWAP_V2_FACTORY =
        0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f; // Ethereum
    address constant UNISWAP_V2_ROUTER =
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D; // Ethereum
    address constant UNISWAP_V3_FACTORY =
        0x1F98431c8aD98523631AE4a59f267346ea31F984; // Ethereum
    address public constant UNISWAP_V3_ROUTER =
        0xE592427A0AEce92De3Edee1F18E0157C05861564; // Uniswap V3 Router on Ethereum

    uint24 constant V3_FEE_TIER_LOW = 500;
    uint24 constant V3_FEE_TIER_HIGH = 3000;

    address constant WETH_TOKEN = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // Ethereum

    address public constant CRV_ADDRESS =
        0xD533a949740bb3306d119CC777fa900bA034cd52; // CRV token
    address public constant CVX_ADDRESS =
        0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B; // CVX token
    address public constant USDC_ADDRESS =
        0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // USDC token
    address public constant USDT_ADDRESS =
        0xdAC17F958D2ee523a2206206994597C13D831ec7; // USDT token

    bytes32 constant crvUsdPriceFeedId =
        0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8;
    bytes32 constant cvxUsdPriceFeedId =
        0x6aac625e125ada0d2a6b98316493256ca733a5808cd34ccef79b0e28c64d1e76;
    bytes32 constant ethUsdPriceFeedId =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    address public priceOracleAddress;

    constructor(address _priceOracle) Ownable(msg.sender) {
        priceOracleAddress = _priceOracle;
    }

    function setPriceOracleAddress(address _priceOracle) external onlyOwner {
        priceOracleAddress = _priceOracle;
    }

    /**
     * @notice Returns the price feed ID for a given token address.
     * @param token The address of the token.
     * @return The price feed ID associated with the token.
     */
    function getPriceFeedId(address token) internal pure returns (bytes32) {
        if (token == WETH_TOKEN) {
            return ethUsdPriceFeedId;
        } else if (token == CRV_ADDRESS) {
            return crvUsdPriceFeedId;
        } else if (token == CVX_ADDRESS) {
            return cvxUsdPriceFeedId;
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
        return (token == USDC_ADDRESS || token == USDT_ADDRESS);
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
     * @notice Calculates the maximum acceptable input amount to receive a desired output amount.
     * @param inputToken The address of the input token.
     * @param outputToken The address of the output token.
     * @param desiredOutputAmount The desired output amount in token units.
     * @param slippageBps The slippage tolerance in basis points (e.g., 50 for 0.5%).
     * @return The maximum acceptable input amount.
     */
    function calculateMaxAmountIn(
        address inputToken,
        address outputToken,
        uint256 desiredOutputAmount,
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

        // Get token decimals
        uint256 inputDecimals = getTokenDecimals(inputToken);
        uint256 outputDecimals = getTokenDecimals(outputToken);

        // Convert desired output to USD
        uint256 desiredOutputInUsd = (desiredOutputAmount * outputPrice) /
            (10 ** outputDecimals);

        // Convert USD to input token amount
        uint256 rawAmountIn = (desiredOutputInUsd * (10 ** inputDecimals)) /
            inputPrice;

        // Apply slippage buffer (increase the amount in)
        return rawAmountIn + ((rawAmountIn * slippageBps) / 10000);
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

    function getPathV2(
        address inputToken,
        address outputToken
    ) public view returns (address[] memory path) {
        if (inputToken == outputToken) {
            revert IErrors.InvalidAddress();
        }

        // UniswapV2 Direct Swap
        if (_existsPairPool(inputToken, outputToken)) {
            path = new address[](2);
            path[0] = inputToken;
            path[1] = outputToken;
            return (path);
        }

        // UniswapV2 Indirect Swap via WETH_TOKEN
        if (
            _existsPairPool(inputToken, WETH_TOKEN) &&
            _existsPairPool(WETH_TOKEN, outputToken)
        ) {
            path = new address[](3);
            path[0] = inputToken;
            path[1] = WETH_TOKEN;
            path[2] = outputToken;
            return (path);
        }
        return path;
    }

    function getPathV3(
        address inputToken,
        address outputToken
    )
        public
        view
        returns (
            address[] memory path,
            uint24[] memory feeTiers,
            bytes memory encodedPath
        )
    {
        if (inputToken == outputToken) {
            revert IErrors.InvalidAddress();
        }
        bool exists;
        uint24 feeTier;

        // UniswapV3 Direct Swap (Checks both fee tiers, prioritizes 0.05%)
        (exists, feeTier) = _existsV3Pool(inputToken, outputToken);
        if (exists) {
            path = new address[](2);
            feeTiers = new uint24[](1);
            path[0] = inputToken;
            path[1] = outputToken;
            feeTiers[0] = feeTier;
            encodedPath = abi.encodePacked(path[0], feeTiers[0], path[1]);
            return (path, feeTiers, encodedPath);
        }

        // UniswapV3 Indirect Swap via WETH_TOKEN (Checks both fee tiers)
        (exists, feeTier) = _existsV3Pool(inputToken, WETH_TOKEN);
        if (exists) {
            uint24 feeTier2;
            (exists, feeTier2) = _existsV3Pool(WETH_TOKEN, outputToken);
            if (exists) {
                path = new address[](3);
                feeTiers = new uint24[](2);
                path[0] = inputToken;
                path[1] = WETH_TOKEN;
                path[2] = outputToken;
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

        return (path, feeTiers, encodedPath);
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
        curvePool = 0xB576491F1E6e5E62f1d8F26062Ee822B40B0E0d4;
        // Find token indexes in the pool using getTokenIndex()
        if (curvePool != address(0)) {
            i = getTokenIndex(inputToken, curvePool);
            j = getTokenIndex(outputToken, curvePool);
        } else {
            i = 0;
            j = 0;
        }
    }

    function swap(
        address inputToken,
        uint256 amount,
        address outputToken,
        uint16 slippageBps,
        address strategy,
        uint16 maxDeadline,
        bytes calldata data
    ) external returns (uint256 amountOut) {
        require(
            IERC20(inputToken).balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );

        uint256 minimumOut = calculateMinAmountOut(
            inputToken,
            outputToken,
            amount,
            slippageBps
        );
        if (inputToken == CVX_ADDRESS) {
            (address curvePool, uint256 i, uint256 j) = getCurvePool(
                inputToken,
                outputToken
            );
            // Approve Curve pool to spend tokens
            IERC20(inputToken).approve(curvePool, amount);
            uint256 amountOutCurve = ICurvePoolDynamic(curvePool).exchange(
                i,
                j,
                amount,
                minimumOut
            );
            // Transfer output token (e.g. WETH) back to the vault or strategy
            IERC20(outputToken).transfer(strategy, amountOutCurve);
            return amountOutCurve;
        }

        (
            address[] memory path,
            uint24[] memory feeTiers,
            bytes memory encodedPath
        ) = getPathV3(inputToken, outputToken);

        if (encodedPath.length > 0) {
            // Uniswap V3 Swap
            IERC20(inputToken).approve(UNISWAP_V3_ROUTER, amount);
            ISwapRouter.ExactInputParams memory params = ISwapRouter
                .ExactInputParams({
                    path: encodedPath,
                    recipient: strategy,
                    deadline: block.timestamp + maxDeadline,
                    amountIn: amount,
                    amountOutMinimum: minimumOut
                });

            amountOut = ISwapRouter(UNISWAP_V3_ROUTER).exactInput(params);
        } else {
            // Uniswap V2 Swap
            path = getPathV2(inputToken, outputToken);
            IERC20(inputToken).approve(UNISWAP_V2_ROUTER, amount);
            uint256[] memory amounts = IUniswapV2Router02(UNISWAP_V2_ROUTER)
                .swapExactTokensForTokens(
                    amount,
                    minimumOut,
                    path,
                    strategy,
                    block.timestamp + maxDeadline
                );
            amountOut = amounts[amounts.length - 1];
        }
    }

    function swapExactOut(
        uint256 totalAmountAvailable,
        address inputToken,
        uint256 amountOut,
        address outputToken,
        uint16 slippageBps,
        address strategy,
        uint16 maxDeadline,
        bytes calldata data
    ) external returns (uint256 amountIn) {
        uint256 maxAmountIn = calculateMaxAmountIn(
            inputToken,
            outputToken,
            amountOut,
            slippageBps
        );
        require(
            IERC20(inputToken).balanceOf(address(this)) >= maxAmountIn,
            "Insufficient balance"
        );
        (
            address[] memory path,
            uint24[] memory feeTiers,
            bytes memory encodedPath
        ) = getPathV3(outputToken, inputToken);
        if (encodedPath.length > 0) {
            // Uniswap V3 Swap (tokens for exact tokens out)
            IERC20(inputToken).approve(UNISWAP_V3_ROUTER, maxAmountIn);

            ISwapRouter.ExactOutputParams memory params = ISwapRouter
                .ExactOutputParams({
                    path: encodedPath,
                    recipient: strategy,
                    deadline: block.timestamp,
                    amountOut: amountOut,
                    amountInMaximum: maxAmountIn
                });

            amountIn = ISwapRouter(UNISWAP_V3_ROUTER).exactOutput(params);
        } else {
            // Uniswap V2 Swap (tokens for exact tokens out)
            path = getPathV2(inputToken, outputToken);
            IERC20(inputToken).approve(UNISWAP_V2_ROUTER, maxAmountIn);
            uint256[] memory amounts = IUniswapV2Router02(UNISWAP_V2_ROUTER)
                .swapTokensForExactTokens(
                    amountOut,
                    maxAmountIn,
                    path,
                    strategy,
                    block.timestamp + maxDeadline
                );
            amountIn = amounts[0];
        }
        IERC20(inputToken).transfer(strategy, totalAmountAvailable - amountIn);

        return amountIn;
    }
}
