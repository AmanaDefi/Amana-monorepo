// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "./SwapHelperParent.sol";

import "./interfaces/IZRC20.sol";

import "./interfaces/IAlgebraFactory.sol";
import "./interfaces/IAlgebraPool.sol";

import "./CurvePoolRegistry.sol";

contract SwapHelperZetachain is SwapHelperParent {
    enum SwapType {
        None,
        Beam,
        Eddy
    }

    address constant ALGEBRA_FACTORY_BEAM =
        0x28b5244B6CA7Cb07f2f7F40edE944c07C2395603; // mainnet and testnet
    address constant SWAPROUTER_BEAM =
        0x84A5509Dce0b68C73B89e67454C30912293c7ea0;

    uint24 constant V3_FEE_TIER_LOW = 500;
    uint24 constant V3_FEE_TIER_HIGH = 3000;

    address constant WZETA_TOKEN = 0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf; // mainnet and testnet

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

    address constant USDC_ARB_ADDRESS =
        0x0327f0660525b15Cdb8f1f5FBF0dD7Cd5Ba182aD;
    address constant USDT_ARB_ADDRESS =
        0x0ca762FA958194795320635c11fF0C45C6412958;
    address constant ETH_ARB_ADDRESS =
        0xA614Aebf7924A3Eb4D066aDCA5595E4980407f1d;

    address constant USDT_AVAX_ADDRESS =
        0x2Db395976CDb9eeFCc8920F4F2f0736f1D575794;
    address constant AVAX_AVAX_ADDRESS =
        0xE8d7796535F1cd63F0fe8D631E68eACe6839869B;
    address constant USDC_AVAX_ADDRESS =
        0xa52Ad01A1d62b408fFe06C2467439251da61E4a9;

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
    bytes32 constant avaxUsdPriceFeedId =
        0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7;

    function initialize(address _priceOracle) external initializer {
        __SwapHelperParent_init(
            _priceOracle,
            0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe, // ← Uniswap V2 Eddy Router
            0x9fd96203f7b22bCF72d9DCb40ff98302376cE09c, // ← Uniswap V2 Eddy Factory
            0x9b30CfbACD3504252F82263F72D6acf62bf733C2, // ← Uniswap V3 Eddy Router
            0x67AA6B2b715937Edc1Eb4D3b7B5d5dCD1fd93E8C, // ← Uniswap V3 Eddy Factory
            0x5524124b8F36e682f3A23D069399247806e8B627, // ← Curve Registry
            WZETA_TOKEN // ← passed into the parent as the intermediate token
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
        if (
            token == ETH_ETH_ADDRESS ||
            token == ETH_BASE_ADDRESS ||
            token == ETH_ARB_ADDRESS
        ) {
            return ethUsdPriceFeedId;
        } else if (token == POL_POLYGON_ADDRESS) {
            return polUsdPriceFeedId;
        } else if (token == BNB_BSC_ADDRESS) {
            return bnbUsdPriceFeedId;
        } else if (token == WZETA_TOKEN) {
            return zetaUsdPriceFeedId;
        } else if (token == SOL_SOL_ADDRESS) {
            return solUsdPriceFeedId;
        } else if (token == AVAX_AVAX_ADDRESS) {
            return avaxUsdPriceFeedId;
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
        return (token == USDC_BSC_ADDRESS ||
            token == USDC_ETH_ADDRESS ||
            token == USDC_POL_ADDRESS ||
            token == USDC_BASE_ADDRESS ||
            token == USDT_BSC_ADDRESS ||
            token == USDT_ETH_ADDRESS ||
            token == USDT_POL_ADDRESS ||
            token == USDC_SOL_ADDRESS ||
            token == USDT_SOL_ADDRESS ||
            token == USDC_ARB_ADDRESS ||
            token == USDT_ARB_ADDRESS ||
            token == USDC_AVAX_ADDRESS ||
            token == USDT_AVAX_ADDRESS);
    }

    function getEquivalentInputAmount(
        address inputToken,
        address gasToken,
        uint256 gasFee
    ) external view returns (uint256 inputAmount) {
        bytes32 inputPriceFeed = getPriceFeedId(inputToken);
        bytes32 gasPriceFeed = getPriceFeedId(gasToken);

        require(
            inputPriceFeed != bytes32(0) || isStablecoin(inputToken),
            "Invalid input token"
        );
        require(
            gasPriceFeed != bytes32(0) || isStablecoin(gasToken),
            "Invalid gas token"
        );

        uint256 inputPrice = isStablecoin(inputToken)
            ? 1e8
            : IPriceOracle(priceOracleAddress).fetchPrice(inputPriceFeed);
        uint256 gasPrice = isStablecoin(gasToken)
            ? 1e8
            : IPriceOracle(priceOracleAddress).fetchPrice(gasPriceFeed);

        require(inputPrice > 0 && gasPrice > 0, "Invalid price data");

        uint256 inputDecimals = getTokenDecimals(inputToken);
        uint256 gasDecimals = getTokenDecimals(gasToken);

        // Convert gasFee (in gasToken units) to USD
        uint256 gasFeeInUsd = (gasFee * gasPrice) / (10 ** gasDecimals);

        // Convert USD to inputToken amount
        inputAmount = (gasFeeInUsd * (10 ** inputDecimals)) / inputPrice;
        inputAmount = (inputAmount * 10050) / 10000; // 0.5% buffer
    }

    function _existsV3PoolEddy(
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

    function _existsV3PoolBeam(
        address tokenA,
        address tokenB
    ) internal view returns (bool exists) {
        address pool = IAlgebraFactory(ALGEBRA_FACTORY_BEAM).poolByPair(
            tokenA,
            tokenB
        );
        if (pool != address(0) && IAlgebraPool(pool).liquidity() > 0) {
            return true; // Prioritize 0.05% fee pool
        }
        return false; // No valid V3 pool found
    }

    function getPathV3BeamOrEddy(
        address zrc20,
        address targetZRC20
    )
        public
        view
        returns (
            address[] memory path,
            uint24[] memory feeTiers,
            bytes memory encodedPath,
            SwapType swapType
        )
    {
        if (zrc20 == targetZRC20) {
            revert IErrors.InvalidAddress();
        }
        bool exists;
        uint24 feeTier;

        // UniswapV3 Direct Swap on Beam
        exists = _existsV3PoolBeam(zrc20, targetZRC20);
        if (exists) {
            path = new address[](2);
            path[0] = zrc20;
            path[1] = targetZRC20;
            encodedPath = abi.encodePacked(path[0], path[1]);
            return (path, feeTiers, encodedPath, SwapType.Beam);
        }

        // UniswapV3 Direct Swap on Eddy (Checks both fee tiers, prioritizes 0.05%)
        (exists, feeTier) = _existsV3PoolEddy(zrc20, targetZRC20);
        if (exists) {
            path = new address[](2);
            feeTiers = new uint24[](1);
            path[0] = zrc20;
            path[1] = targetZRC20;
            feeTiers[0] = feeTier;
            encodedPath = abi.encodePacked(path[0], feeTiers[0], path[1]);
            return (path, feeTiers, encodedPath, SwapType.Eddy);
        }

        // UniswapV3 Indirect Swap on Beam via USDC_ETH_ADDRESS
        exists = _existsV3PoolBeam(zrc20, USDC_ETH_ADDRESS);
        if (exists) {
            exists = _existsV3PoolBeam(USDC_ETH_ADDRESS, targetZRC20);
            if (exists) {
                path = new address[](3);
                path[0] = zrc20;
                path[1] = USDC_ETH_ADDRESS;
                path[2] = targetZRC20;
                encodedPath = abi.encodePacked(path[0], path[1], path[2]);

                return (path, feeTiers, encodedPath, SwapType.Beam);
            }
        }

        // UniswapV3 Indirect Swap on Eddy via USDC_ETH_ADDRESS (Checks both fee tiers)
        (exists, feeTier) = _existsV3PoolEddy(zrc20, USDC_ETH_ADDRESS);
        if (exists) {
            uint24 feeTier2;
            (exists, feeTier2) = _existsV3PoolEddy(
                USDC_ETH_ADDRESS,
                targetZRC20
            );
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
                return (path, feeTiers, encodedPath, SwapType.Eddy);
            }
        }

        return (path, feeTiers, encodedPath, SwapType.None);
    }

    function getPathV3Eddy(
        address zrc20,
        address targetZRC20
    )
        public
        view
        returns (
            address[] memory path,
            uint24[] memory feeTiers,
            bytes memory encodedPath,
            SwapType swapType
        )
    {
        if (zrc20 == targetZRC20) {
            revert IErrors.InvalidAddress();
        }
        bool exists;
        uint24 feeTier;

        // UniswapV3 Direct Swap on Eddy (Checks both fee tiers, prioritizes 0.05%)
        (exists, feeTier) = _existsV3PoolEddy(zrc20, targetZRC20);
        if (exists) {
            path = new address[](2);
            feeTiers = new uint24[](1);
            path[0] = zrc20;
            path[1] = targetZRC20;
            feeTiers[0] = feeTier;
            encodedPath = abi.encodePacked(path[0], feeTiers[0], path[1]);
            return (path, feeTiers, encodedPath, SwapType.Eddy);
        }

        // UniswapV3 Indirect Swap on Eddy via USDC_ETH_ADDRESS (Checks both fee tiers)
        (exists, feeTier) = _existsV3PoolEddy(zrc20, USDC_ETH_ADDRESS);
        if (exists) {
            uint24 feeTier2;
            (exists, feeTier2) = _existsV3PoolEddy(
                USDC_ETH_ADDRESS,
                targetZRC20
            );
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
                return (path, feeTiers, encodedPath, SwapType.Eddy);
            }
        }

        return (path, feeTiers, encodedPath, SwapType.None);
    }

    // /**
    //  * @notice Finds the Curve pool for a token pair and calculates the expected amount out.
    //  * @param inputToken The token being swapped from.
    //  * @param outputToken The token being swapped to.
    //  * @return curvePool The address of the curve pool to use.
    //  */
    // function getCurvePool(
    //     address inputToken,
    //     address outputToken
    // ) public view override returns (address curvePool, uint256 i, uint256 j) {
    //     CurvePoolRegistry registry = CurvePoolRegistry(CURVE_REGISTRY);
    //     curvePool = registry.getBestPool(inputToken, outputToken);
    //     // Find token indexes in the pool using getTokenIndex()
    //     if (curvePool != address(0)) {
    //         i = getTokenIndex(inputToken, curvePool);
    //         j = getTokenIndex(outputToken, curvePool);
    //     } else {
    //         i = 0;
    //         j = 0;
    //     }
    // }

    // /**
    //  * @notice Finds the Curve pool for a token pair and calculates the expected amount out.
    //  * @param inputToken The token being swapped from.
    //  * @param outputToken The token being swapped to.
    //  * @param amount The input amount in token units.
    //  * @return amountOut The expected amount out from the Curve pool.
    //  */
    // function getCurveAmountOut(
    //     address curvePool,
    //     address inputToken,
    //     address outputToken,
    //     uint256 amount
    // ) public view returns (uint256 amountOut) {
    //     // Find token indexes in the pool using getTokenIndex()
    //     uint256 i = getTokenIndex(inputToken, curvePool);
    //     uint256 j = getTokenIndex(outputToken, curvePool);

    //     // Fetch amount out from Curve pool
    //     amountOut = ICurvePoolDynamic(curvePool).get_dy(i, j, amount);
    // }

    // function approveOrIncreaseAllowance(
    //     IERC20 token,
    //     address spender,
    //     uint256 amount
    // ) internal {
    //     bytes memory approveCalldata = abi.encodeWithSelector(
    //         IERC20.approve.selector,
    //         spender,
    //         amount
    //     );

    //     (bool success, ) = address(token).call(approveCalldata);
    //     if (success) return;

    //     // If initial approve failed, try resetting to zero first
    //     bytes memory resetCalldata = abi.encodeWithSelector(
    //         IERC20.approve.selector,
    //         spender,
    //         0
    //     );
    //     (bool resetSuccess, ) = address(token).call(resetCalldata);
    //     require(resetSuccess, "Reset to 0 failed");

    //     (bool secondApproveSuccess, ) = address(token).call(approveCalldata);
    //     require(secondApproveSuccess, "Second approve failed");
    // }

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
    //             bytes memory encodedPath,
    //             SwapType swapType
    //         ) = getPathV3BeamOrEddy(inputToken, outputToken);
    //         if (encodedPath.length > 0) {
    //             return getAmountOutV3(amount, path, feeTiers);
    //         } else {
    //             path = getPathV2(inputToken, outputToken);
    //             return getAmountOutV2(amount, path);
    //         }
    //     }
    // }

    function swap(
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint16 slippageBps,
        address vault,
        uint256 maxDeadline,
        bytes calldata swapData
    ) external override returns (uint256 amountOut) {
        require(
            IERC20(zrc20).balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );

        uint256 minimumOut = calculateMinAmountOut(
            zrc20,
            targetZRC20,
            amount,
            slippageBps
        );
        bytes memory path;
        address router;

        if (swapData.length > 0) {
            // Force Beam with provided path
            path = swapData;
            router = SWAPROUTER_BEAM;
        } else {
            // Try Beam or Eddy via getPath
            (
                ,
                ,
                bytes memory encodedPath,
                SwapType swapType
            ) = getPathV3BeamOrEddy(zrc20, targetZRC20);

            if (encodedPath.length > 0) {
                path = encodedPath;
                router = (swapType == SwapType.Beam)
                    ? SWAPROUTER_BEAM
                    : UNISWAP_V3_ROUTER;
            }
        }

        // If we’ve got a valid path and router, execute V3 swap
        if (path.length > 0 && router != address(0)) {
            IZRC20(zrc20).approve(router, amount);

            ISwapRouter.ExactInputParams memory params = ISwapRouter
                .ExactInputParams({
                    path: path,
                    recipient: vault,
                    // deadline: block.timestamp + maxDeadline,
                    amountIn: amount,
                    amountOutMinimum: minimumOut
                });

            return ISwapRouter(router).exactInput(params);
        }

        // Fallback to Eddy V2
        address[] memory v2Path = getPathV2(
            zrc20,
            targetZRC20,
            UNISWAP_V2_FACTORY
        );
        IZRC20(zrc20).approve(UNISWAP_V2_ROUTER, amount);

        uint256[] memory amounts = IUniswapV2Router02(UNISWAP_V2_ROUTER)
            .swapExactTokensForTokens(
                amount,
                minimumOut,
                v2Path,
                vault,
                block.timestamp + maxDeadline
            );

        return amounts[amounts.length - 1];
    }

    function swapExactOut(
        uint256 totalAmountAvailable,
        address zrc20,
        uint256 amountOut,
        address targetZRC20,
        uint16 slippageBps,
        address vault,
        uint16 maxDeadline,
        bytes calldata data
    ) external override returns (uint256 amountIn) {
        uint256 maxAmountIn = calculateMaxAmountIn(
            zrc20,
            targetZRC20,
            amountOut,
            slippageBps
        );
        require(
            IERC20(zrc20).balanceOf(address(this)) >= maxAmountIn,
            "Insufficient balance"
        );

        (
            address[] memory path,
            uint24[] memory feeTiers,
            bytes memory encodedPath,
            SwapType swapType
        ) = getPathV3BeamOrEddy(targetZRC20, zrc20); // Note: reversed order for exactOutput

        if (swapType == SwapType.Eddy) {
            // Eddy: Uniswap V3-style exactOutput swap
            IZRC20(zrc20).approve(UNISWAP_V3_ROUTER, maxAmountIn);

            ISwapRouter.ExactOutputParams memory params = ISwapRouter
                .ExactOutputParams({
                    path: encodedPath,
                    recipient: vault,
                    // deadline: block.timestamp + maxDeadline,
                    amountOut: amountOut,
                    amountInMaximum: maxAmountIn
                });

            amountIn = ISwapRouter(UNISWAP_V3_ROUTER).exactOutput(params);
        } else if (swapType == SwapType.Beam) {
            // Beam: Algebra V3-style exactOutput swap
            IZRC20(zrc20).approve(SWAPROUTER_BEAM, maxAmountIn);
            ISwapRouter.ExactOutputParams memory params = ISwapRouter
                .ExactOutputParams({
                    path: encodedPath,
                    recipient: vault,
                    // deadline: block.timestamp + maxDeadline,
                    amountOut: amountOut,
                    amountInMaximum: maxAmountIn
                });

            amountIn = ISwapRouter(SWAPROUTER_BEAM).exactOutput(params);
        } else {
            // Fallback: Uniswap V2-style exactOutput swap
            path = getPathV2(zrc20, targetZRC20, UNISWAP_V2_FACTORY);

            IZRC20(zrc20).approve(UNISWAP_V2_ROUTER, maxAmountIn);

            uint256[] memory amounts = IUniswapV2Router02(UNISWAP_V2_ROUTER)
                .swapTokensForExactTokens(
                    amountOut,
                    maxAmountIn,
                    path,
                    vault,
                    block.timestamp + maxDeadline
                );

            amountIn = amounts[0];
        }

        // Refund the leftover input tokens to the vault
        if (totalAmountAvailable > amountIn) {
            IERC20(zrc20).transfer(vault, totalAmountAvailable - amountIn);
        }

        return amountIn;
    }
}
