// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

import "./interfaces/IErrors.sol";
import "./interfaces/IPriceOracle.sol";
import "./interfaces/IUniswapV3Factory.sol";
import "./interfaces/IUniswapV3Pool.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/IErrors.sol";
import "./interfaces/IPriceOracle.sol";
import "./interfaces/ICurveRegistry.sol";

import "./interfaces/ICurvePoolDynamic.sol";
import "./CurvePoolRegistry.sol";

abstract contract SwapHelperParent is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    IErrors
{
    address public priceOracleAddress;
    address public UNISWAP_V2_ROUTER;
    address public UNISWAP_V2_FACTORY;
    address public UNISWAP_V3_ROUTER;
    address public UNISWAP_V3_FACTORY;
    address public CURVE_REGISTRY;

    address public intermediateToken;

    function __SwapHelperParent_init(
        address _priceOracle,
        address _v2Router,
        address _v2Factory,
        address _v3Router,
        address _v3Factory,
        address _curveRegistry,
        address _intermediateToken
    ) internal onlyInitializing {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        priceOracleAddress = _priceOracle;
        UNISWAP_V2_ROUTER = _v2Router;
        UNISWAP_V2_FACTORY = _v2Factory;
        UNISWAP_V3_ROUTER = _v3Router;
        UNISWAP_V3_FACTORY = _v3Factory;
        CURVE_REGISTRY = _curveRegistry;
        intermediateToken = _intermediateToken;
    }

    function setPriceOracleAddress(address _priceOracle) external onlyOwner {
        priceOracleAddress = _priceOracle;
    }

    function getPriceFeedId(
        address token
    ) internal view virtual returns (bytes32);

    function isStablecoin(address token) internal view virtual returns (bool);

    /**
     * @notice Fetches the token's decimal places from its contract.
     * @dev Assumes 18 decimals for native tokens (ETH, BNB, POL, WZETA).
     * @param token The address of the token.
     * @return The number of decimal places.
     */
    function getTokenDecimals(address token) internal view returns (uint8) {
        return IERC20Metadata(token).decimals();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

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
            : IPriceOracle(priceOracleAddress).fetchPrice(inputPriceFeed);
        uint256 outputPrice = isStablecoin(outputToken)
            ? 1e8
            : IPriceOracle(priceOracleAddress).fetchPrice(outputPriceFeed);
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
            : IPriceOracle(priceOracleAddress).fetchPrice(inputPriceFeed);
        uint256 outputPrice = isStablecoin(outputToken)
            ? 1e8
            : IPriceOracle(priceOracleAddress).fetchPrice(outputPriceFeed);

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
        address tokenB,
        address factoryAddress
    ) internal view returns (bool) {
        address pair = IUniswapV2Factory(factoryAddress).getPair(
            tokenA,
            tokenB
        );
        return pair != address(0) && IUniswapV2Pair(pair).totalSupply() > 0;
    }

    function _getBestV3Pool(
        address tokenA,
        address tokenB,
        address factoryAddress
    ) internal view returns (bool exists, uint24 bestFeeTier) {
        uint24[4] memory tiers = [
            uint24(100),
            uint24(500),
            uint24(3000),
            uint24(10000)
        ];
        uint128 highestLiquidity = 0;
        bestFeeTier = 0;
        exists = false;

        for (uint256 i = 0; i < tiers.length; i++) {
            address pool = IUniswapV3Factory(factoryAddress).getPool(
                tokenA,
                tokenB,
                tiers[i]
            );

            if (pool != address(0)) {
                uint128 liquidity = IUniswapV3Pool(pool).liquidity();
                if (liquidity > highestLiquidity) {
                    highestLiquidity = liquidity;
                    bestFeeTier = tiers[i];
                    exists = true;
                }
            }
        }
        return (exists, bestFeeTier);
    }

    function getPathV2(
        address inputToken,
        address outputToken,
        address factoryAddress
    ) public view returns (address[] memory path) {
        if (inputToken == outputToken) {
            revert IErrors.InvalidAddress();
        }

        // UniswapV2 Direct Swap
        if (_existsPairPool(inputToken, outputToken, factoryAddress)) {
            path = new address[](2);
            path[0] = inputToken;
            path[1] = outputToken;
            return (path);
        }

        // UniswapV2 Indirect Swap via intermediateToken
        if (
            _existsPairPool(inputToken, intermediateToken, factoryAddress) &&
            _existsPairPool(intermediateToken, outputToken, factoryAddress)
        ) {
            path = new address[](3);
            path[0] = inputToken;
            path[1] = intermediateToken;
            path[2] = outputToken;
            return (path);
        }
        return path;
    }

    function getPathV3(
        address inputToken,
        address outputToken,
        address factoryAddress
    )
        public
        view
        virtual
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
        (exists, feeTier) = _getBestV3Pool(
            inputToken,
            outputToken,
            factoryAddress
        );
        if (exists) {
            path = new address[](2);
            feeTiers = new uint24[](1);
            path[0] = inputToken;
            path[1] = outputToken;
            feeTiers[0] = feeTier;
            encodedPath = abi.encodePacked(path[0], feeTiers[0], path[1]);
            return (path, feeTiers, encodedPath);
        }

        // UniswapV3 Indirect Swap via intermediateToken (Checks both fee tiers)
        (exists, feeTier) = _getBestV3Pool(
            inputToken,
            intermediateToken,
            factoryAddress
        );
        if (exists) {
            uint24 feeTier2;
            (exists, feeTier2) = _getBestV3Pool(
                intermediateToken,
                outputToken,
                factoryAddress
            );
            if (exists) {
                path = new address[](3);
                feeTiers = new uint24[](2);
                path[0] = inputToken;
                path[1] = intermediateToken;
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
    ) public view returns (uint amountOut) {
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
    ) public view virtual returns (address curvePool, uint256 i, uint256 j) {
        curvePool = ICurveRegistry(CURVE_REGISTRY).find_pool_for_coins(
            inputToken,
            outputToken
        );
        // curvePool = 0xB576491F1E6e5E62f1d8F26062Ee822B40B0E0d4;
        // Find token indexes in the pool using getTokenIndex()
        if (curvePool != address(0)) {
            i = getTokenIndex(inputToken, curvePool);
            j = getTokenIndex(outputToken, curvePool);
        } else {
            revert("Curve: No pool found for token pair");
        }
    }

    function swap(
        address inputToken,
        uint256 amount,
        address outputToken,
        uint16 slippageBps,
        address receiver,
        uint256 maxDeadline,
        bytes calldata swapData
    ) external virtual returns (uint256 amountOut) {
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
        bytes memory encodedPath;

        if (swapData.length == 0) {
            (, , encodedPath) = getPathV3(
                inputToken,
                outputToken,
                UNISWAP_V3_FACTORY
            );
        } else {
            encodedPath = swapData;
        }

        if (encodedPath.length > 0) {
            // Uniswap V3 Swap
            IERC20(inputToken).approve(UNISWAP_V3_ROUTER, amount);
            try
                ISwapRouter(UNISWAP_V3_ROUTER).exactInput(
                    ISwapRouter.ExactInputParams({
                        path: encodedPath,
                        recipient: receiver,
                        deadline: block.timestamp + maxDeadline,
                        amountIn: amount,
                        amountOutMinimum: minimumOut
                    })
                )
            returns (uint256 out) {
                amountOut = out;
                return amountOut;
            } catch {
                return 0;
            }
        }

        // Uniswap V2 fallback
        address[] memory path = getPathV2(
            inputToken,
            outputToken,
            UNISWAP_V2_FACTORY
        );
        if (path.length < 2) {
            // No valid path found
            return 0;
        }
        IERC20(inputToken).approve(UNISWAP_V2_ROUTER, amount);

        try
            IUniswapV2Router02(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
                amount,
                minimumOut,
                path,
                receiver,
                block.timestamp + maxDeadline
            )
        returns (uint256[] memory amounts) {
            amountOut = amounts[amounts.length - 1];
            return amountOut;
        } catch {
            return 0;
        }
    }

    function swapExactOut(
        uint256 totalAmountAvailable,
        address inputToken,
        uint256 amountOut,
        address outputToken,
        uint16 slippageBps,
        address receiver,
        uint16 maxDeadline,
        bytes calldata data
    ) external virtual returns (uint256 amountIn) {
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
            address[] memory pathV3,
            uint24[] memory feeTiers,
            bytes memory encodedPath
        ) = getPathV3(outputToken, inputToken, UNISWAP_V3_FACTORY);

        if (encodedPath.length > 0) {
            // Try Uniswap V3 swap
            IERC20(inputToken).approve(UNISWAP_V3_ROUTER, maxAmountIn);

            try
                ISwapRouter(UNISWAP_V3_ROUTER).exactOutput(
                    ISwapRouter.ExactOutputParams({
                        path: encodedPath,
                        recipient: receiver,
                        deadline: block.timestamp,
                        amountOut: amountOut,
                        amountInMaximum: maxAmountIn
                    })
                )
            returns (uint256 usedAmountIn) {
                amountIn = usedAmountIn;
            } catch {
                return 0;
            }
        } else {
            // Try Uniswap V2 swap
            address[] memory path = getPathV2(
                inputToken,
                outputToken,
                UNISWAP_V2_FACTORY
            );
            if (path.length < 2) {
                return 0; // No valid path
            }
            IERC20(inputToken).approve(UNISWAP_V2_ROUTER, maxAmountIn);

            try
                IUniswapV2Router02(UNISWAP_V2_ROUTER).swapTokensForExactTokens(
                    amountOut,
                    maxAmountIn,
                    path,
                    receiver,
                    block.timestamp + maxDeadline
                )
            returns (uint256[] memory amounts) {
                amountIn = amounts[0];
            } catch {
                return 0;
            }
        }

        // Transfer any excess input token to receiver (only if swap succeeded)
        if (amountIn > 0 && totalAmountAvailable > amountIn) {
            IERC20(inputToken).transfer(
                receiver,
                totalAmountAvailable - amountIn
            );
        }

        return amountIn;
    }

    /// @notice Safely approves an allowance for a spender.
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
}
