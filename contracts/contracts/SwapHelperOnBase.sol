// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "./SwapHelperParent.sol";

import "./interfaces/ICurvePoolDynamic.sol";
import "./interfaces/IAerodromePoolFactory.sol";
import "./interfaces/IAerodromeRouter.sol";
import "./interfaces/IBalancerRouter.sol";
import "./interfaces/I4626Vault.sol";
import "./CurvePoolRegistry.sol";

// PriceOracle address: 0x7C136bC8A5Ce2245C3357bc4A7B97C1A9A2b480c

contract SwapHelperOnBase is SwapHelperParent {
    address constant WELL = 0xA88594D404727625A9437C3f886C7643872296AE;
    address constant MORPHO = 0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842;
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant axlOP = 0x994ac01750047B9d35431a7Ae4Ed312ee955E030;
    address constant yUSD = 0x4772D2e014F9fC3a820C444e3313968e9a5C8121;
    address constant COMP = 0x9e1028F5F1D5eDE59748FFceE5532509976840E0;

    bytes32 constant wellUsdPriceFeedId =
        0x3cf6bab8bf8041dc8ee2a3edebe16b5f9f4ff3cce46006aeb15c885ba4779d0b;
    bytes32 constant morphoUsdPriceFeedId =
        0x5b2a4c542d4a74dd11784079ef337c0403685e3114ba0d9909b5c7a7e06fdc42;
    bytes32 constant ethUsdPriceFeedId =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    bytes32 constant opUsdPriceFeedId =
        0x385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf;
    bytes32 constant compUsdPriceFeedId =
        0x4a8e42861cabc5ecb50996f92e7cfa2bce3fd0a2423b0c44c9b423fb2bd25478;

    uint24 constant V3_FEE_TIER_LOW = 500;
    uint24 constant V3_FEE_TIER_HIGH = 3000;

    address constant WETH_ADDRESS = 0x4200000000000000000000000000000000000006;

    address constant AERODROME_ROUTER =
        0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43; // Aerodrome Router on Base
    address constant AERODROME_FACTORY =
        0x420DD381b31aEf6683db6B902084cB0FFECe40Da; // Aerodrome PoolFactory on Base
    address constant BALANCER_ROUTER =
        0x3f170631ed9821Ca51A59D996aB095162438DC10; // Balancer Vault on Base
    address constant BALANCER_VAULT =
        0xbA1333333333a1BA1108E8412f11850A5C319bA9; // Balancer Vault on Base

    function initialize(address _priceOracle) external initializer {
        __SwapHelperParent_init(
            _priceOracle,
            address(0), // ← Uniswap V2 Router on Base
            address(0), // ← Uniswap V2 Factory on Base
            0x2626664c2603336E57B271c5C0b26F421741e481, // ← Uniswap V3 Router on Base
            0x33128a8fC17869897dcE68Ed026d694621f6FDfD, // ← Uniswap V3 Factory on Base
            0x5524124b8F36e682f3A23D069399247806e8B627, // ← Curve Registry on Base
            WETH_ADDRESS // ← passed into the parent as the intermediate token
        );
    }

    /**
     * @notice Returns the price feed ID for a given token address.
     * @param token The address of the token.
     * @return The price feed ID associated with the token.
     */
    function getPriceFeedId(
        address token
    ) internal pure override returns (bytes32) {
        if (token == WELL) {
            return wellUsdPriceFeedId;
        } else if (token == MORPHO) {
            return morphoUsdPriceFeedId;
        } else if (token == axlOP) {
            return opUsdPriceFeedId;
        } else if (token == WETH_ADDRESS) {
            return ethUsdPriceFeedId;
        } else if (token == COMP) {
            return compUsdPriceFeedId;
        } else {
            return bytes32(0); // Return zero bytes if no price feed exists
        }
    }

    /**
     * @notice Checks if a token is a USD stablecoin.
     * @param token The address of the token.
     * @return True if the token is a stablecoin, false otherwise.
     */
    function isStablecoin(address token) internal pure override returns (bool) {
        return (token == USDC || token == yUSD);
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
    ) public view override returns (address curvePool, uint256 i, uint256 j) {
        CurvePoolRegistry registry = CurvePoolRegistry(CURVE_REGISTRY);
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

    function _existsAerodromePairPool(
        address tokenA,
        address tokenB,
        bool isStable,
        address factoryAddress
    ) internal view returns (bool) {
        address pair = IAerodromePoolFactory(factoryAddress).getPool(
            tokenA,
            tokenB,
            isStable
        );
        return pair != address(0) && IUniswapV2Pair(pair).totalSupply() > 0;
    }

    function getPathAerodrome(
        address inputToken,
        address outputToken,
        address factoryAddress,
        address intermediateToken,
        bool isStable
    ) public view returns (address[] memory path) {
        if (inputToken == outputToken) {
            revert IErrors.InvalidAddress();
        }
        // Check for direct pool
        if (
            _existsAerodromePairPool(
                inputToken,
                outputToken,
                isStable,
                factoryAddress
            )
        ) {
            path = new address[](2);
            path[0] = inputToken;
            path[1] = outputToken;
            return path;
        }

        // Check for two-hop path via intermediateToken
        bool existsPair1 = _existsAerodromePairPool(
            inputToken,
            intermediateToken,
            isStable,
            factoryAddress
        );
        bool existsPair2 = _existsAerodromePairPool(
            intermediateToken,
            outputToken,
            isStable,
            factoryAddress
        );

        if (existsPair1 && existsPair2) {
            path = new address[](3);
            path[0] = inputToken;
            path[1] = intermediateToken;
            path[2] = outputToken;
            return path;
        }

        // No valid path found
        return new address[](0);
    }

    function swap(
        address inputToken,
        uint256 amount,
        address outputToken,
        uint16 slippageBps,
        address receiver,
        uint256 maxDeadline,
        bytes calldata
    ) external override returns (uint256 amountOut) {
        require(
            IERC20(inputToken).balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );

        bool isStable = isStablecoin(inputToken) && isStablecoin(outputToken);
        uint256 minimumOut = calculateMinAmountOut(
            inputToken,
            outputToken,
            amount,
            slippageBps
        );

        address[] memory path = getPathAerodrome(
            inputToken,
            outputToken,
            AERODROME_FACTORY,
            WETH_ADDRESS, // Using WETH as the intermediate token
            isStable // Assuming we want to swap through non-stable pools
        );

        if (path.length < 2) {
            // No valid path found
            return 0;
        }
        IERC20(inputToken).approve(AERODROME_ROUTER, amount);
        IAerodromeRouter.Route[] memory routes = new IAerodromeRouter.Route[](
            path.length - 1
        );
        for (uint256 i = 0; i < path.length - 1; i++) {
            routes[i] = IAerodromeRouter.Route({
                from: path[i],
                to: path[i + 1],
                stable: isStable,
                factory: AERODROME_FACTORY
            });
        }
        uint256[] memory amounts = IAerodromeRouter(AERODROME_ROUTER)
            .swapExactTokensForTokens(
                amount,
                minimumOut,
                routes,
                receiver,
                block.timestamp + maxDeadline
            );
        amountOut = amounts[amounts.length - 1];
        return amountOut;
    }

    function swapViaUniswap(
        address inputToken,
        uint256 amount,
        address outputToken,
        uint16 slippageBps,
        address receiver,
        uint256 maxDeadline,
        bytes calldata
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
        (address[] memory path, uint24[] memory feeTiers, bytes memory encodedPath) = getPathV3(inputToken, outputToken, UNISWAP_V3_FACTORY);
        
        if (encodedPath.length > 0) {
            IERC20(inputToken).approve(UNISWAP_V3_ROUTER, amount);
            ISwapRouter.ExactInputParams memory params = ISwapRouter
                .ExactInputParams({
                    path: encodedPath,
                    recipient: receiver,
                    // deadline: block.timestamp + maxDeadline,
                    amountIn: amount,
                    amountOutMinimum: minimumOut
                });
            amountOut = ISwapRouter(UNISWAP_V3_ROUTER).exactInput(params);
        } else {
             // Uniswap V2 Swap
            path = getPathV2(inputToken, outputToken, UNISWAP_V2_FACTORY);
            if (path.length < 2) return 0;

            IERC20(inputToken).approve(UNISWAP_V2_ROUTER, amount);

            uint256[] memory amounts = IUniswapV2Router02(UNISWAP_V2_ROUTER)
                .swapExactTokensForTokens(
                    amount,
                    minimumOut,
                    path,
                    receiver,
                    block.timestamp + maxDeadline
                );

            return amounts[amounts.length - 1];
        }
        
    }

    function swapViaBalancerPool(
        address inputToken,
        address wrappedInputToken,
        address outputToken,
        uint256 amount,
        uint256 minimumOut,
        address receiver,
        uint256 maxDeadline,
        address pool
    ) external returns (uint256 amountOut) {
        require(
            IERC20(inputToken).balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );

        // IERC20(inputToken).approve(wrappedInputToken, amount);
        // uint256 wrappedAmount = I4626Vault(wrappedInputToken).deposit(
        //     amount,
        //     address(this)
        // );
        // console.log("Wrapped amount: %s", wrappedAmount);
        IERC20(inputToken).approve(
            address(BALANCER_VAULT), // Balancer docs say to approve the vault, not the router
            amount
        );
        // uint256 queryAmountOut = IBalancerRouter(BALANCER_ROUTER)
        //     .querySwapSingleTokenExactIn(
        //         pool,
        //         IERC20(wrappedInputToken),
        //         IERC20(outputToken),
        //         wrappedAmount,
        //         address(this),
        //         "0x"
        //     );
        // console.log("Balancer query swap amount out: %s", queryAmountOut);

        amountOut = IBalancerRouter(BALANCER_ROUTER).swapSingleTokenExactIn(
            pool,
            IERC20(inputToken),
            IERC20(outputToken),
            amount,
            1,
            99999999,
            false,
            "0x"
        );
    }

    // function getAmountOutCurveOrUniswap(
    //     address inputToken,
    //     address outputToken,
    //     uint256 amount
    // ) public view returns (uint256) {
    //     (address curvePool, , ) = getCurvePool(inputToken, outputToken);
    //     if (curvePool != address(0)) {
    //         return
    //             getCurveAmountOut(curvePool, inputToken, outputToken, amount);
    //     } else {
    //         (
    //             address[] memory path,
    //             uint24[] memory feeTiers,
    //             bytes memory encodedPath
    //         ) = getPath(inputToken, outputToken);

    //         if (encodedPath.length > 0) {
    //             return getAmountOutV3(amount, path, feeTiers);
    //         } else {
    //             revert IErrors.InsufficientLiquidity();
    //         }
    //     }
    // }
}
