// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "./SwapHelperParent.sol";

import "./interfaces/ICurvePoolDynamic.sol";
import "./interfaces/ICurveRegistry.sol";
import "./interfaces/ICurveRouterNG.sol";
import "./interfaces/IV4SwapRouter.sol";
import "./interfaces/IUniversalRouter.sol";
import "./interfaces/IPermit2.sol";
import "hardhat/console.sol";

contract SwapHelperEthereum is SwapHelperParent {
    address public constant ROUTER_NG =
        0x16C6521Dff6baB339122a0FE25a9116693265353; // Curve Router NG on Ethereum

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

    address constant UNIVERSAL_ROUTER =
        0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af; // Uniswap Universal Router address on Ethereum
    IPermit2 constant permit2 =
        IPermit2(0x000000000022D473030F116dDEE9F6B43aC78BA3); // Permit2 address on Ethereum

    address public constant sUSN_ADDRESS =
        0xE24a3DC889621612422A64E6388927901608B91D;
    bytes32 constant susnUsdPriceFeedId =
        0x4fad14ab0b3793942fa6b796f40b263f0bb67815685625f9061f804cc4f7968f;

    function initialize(address _priceOracle) external initializer {
        __SwapHelperParent_init(
            _priceOracle,
            0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D, // Uniswap V2 Router
            0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f, // Uniswap V2 Factory
            0xE592427A0AEce92De3Edee1F18E0157C05861564, // Uniswap V3 Router
            0x1F98431c8aD98523631AE4a59f267346ea31F984, // Uniswap V3 Factory
            0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC, // Curve Registry
            WETH_TOKEN // ← passed into the parent as the intermediate token
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
        if (token == WETH_TOKEN) {
            return ethUsdPriceFeedId;
        } else if (token == CRV_ADDRESS) {
            return crvUsdPriceFeedId;
        } else if (token == CVX_ADDRESS) {
            return cvxUsdPriceFeedId;
        } else if (token == sUSN_ADDRESS) {
            console.log("Getting sUSN price");
            return susnUsdPriceFeedId;
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
        return (token == USDC_ADDRESS || token == USDT_ADDRESS); // TODO - this is just interim - change when we can get sUSN price feed
    }

    function _swapCVXtoUSDC(
        uint256 amount,
        uint256 minOut
    ) internal returns (uint256 amountOut) {
        address[11] memory route = [
            CVX_ADDRESS, // CVX
            0xB576491F1E6e5E62f1d8F26062Ee822B40B0E0d4, // CVX/WETH pool
            WETH_TOKEN, // WETH
            0x7F86Bf177Dd4F3494b841a37e810A34dD56c829B, // Tricrypto pool
            USDC_ADDRESS, // USDC
            address(0),
            address(0),
            address(0),
            address(0),
            address(0),
            address(0)
        ];

        uint256[5][5] memory swapParams = [
            [uint256(1), 0, 1, 2, 2],
            [uint256(2), 0, 1, 3, 3],
            [uint256(0), 0, 0, 0, 0],
            [uint256(0), 0, 0, 0, 0],
            [uint256(0), 0, 0, 0, 0]
        ];

        address[5] memory pools = [
            0xB576491F1E6e5E62f1d8F26062Ee822B40B0E0d4,
            0x7F86Bf177Dd4F3494b841a37e810A34dD56c829B,
            address(0),
            address(0),
            address(0)
        ];

        IERC20(CVX_ADDRESS).approve(ROUTER_NG, amount);

        try
            ICurveRouterNG(ROUTER_NG).exchange(
                route,
                swapParams,
                amount,
                minOut,
                pools,
                msg.sender
            )
        returns (uint256 out) {
            amountOut = out;
        } catch {
            amountOut = 0;
        }

        return amountOut;
    }

    function getPathV3SpecificIntermediateToken(
        address inputToken,
        address intToken,
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

        // UniswapV3 Indirect Swap via intToken (Checks both fee tiers)
        (exists, feeTier) = _getBestV3Pool(
            inputToken,
            intToken,
            factoryAddress
        );
        if (exists) {
            uint24 feeTier2;
            (exists, feeTier2) = _getBestV3Pool(
                intToken,
                outputToken,
                factoryAddress
            );
            if (exists) {
                path = new address[](3);
                feeTiers = new uint24[](2);
                path[0] = inputToken;
                path[1] = intToken;
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

    function getPathV3SpecificIntermediateTokens(
        address inputToken,
        address intToken1,
        address intToken2,
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
        if (
            inputToken == outputToken ||
            inputToken == address(0) ||
            intToken1 == address(0) ||
            intToken2 == address(0) ||
            outputToken == address(0)
        ) {
            revert IErrors.InvalidAddress();
        }

        bool exists;
        uint24 fee1;
        uint24 fee2;
        uint24 fee3;

        // Check path: input → intToken1
        (exists, fee1) = _getBestV3Pool(inputToken, intToken1, factoryAddress);
        if (!exists) return (path, feeTiers, encodedPath);

        // Check path: intToken1 → intToken2
        (exists, fee2) = _getBestV3Pool(intToken1, intToken2, factoryAddress);
        if (!exists) return (path, feeTiers, encodedPath);

        // Check path: intToken2 → output
        (exists, fee3) = _getBestV3Pool(intToken2, outputToken, factoryAddress);
        if (!exists) return (path, feeTiers, encodedPath);

        // If all pools exist, build path
        path = new address[](4);
        feeTiers = new uint24[](3);

        path[0] = inputToken;
        path[1] = intToken1;
        path[2] = intToken2;
        path[3] = outputToken;

        feeTiers[0] = fee1;
        feeTiers[1] = fee2;
        feeTiers[2] = fee3;

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

    function swap(
        address inputToken,
        uint256 amount,
        address outputToken,
        uint16 slippageBps,
        address strategy,
        uint256 maxDeadline,
        bytes calldata data
    ) external override returns (uint256 amountOut) {
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
            uint256 amountOutCurve = 0;

            if (outputToken == WETH_TOKEN) {
                address curvePool = 0xB576491F1E6e5E62f1d8F26062Ee822B40B0E0d4;
                uint256 i = getTokenIndex(inputToken, curvePool);
                uint256 j = getTokenIndex(outputToken, curvePool);
                IERC20(inputToken).approve(curvePool, amount);

                try
                    ICurvePoolDynamic(curvePool).exchange(
                        i,
                        j,
                        amount,
                        minimumOut
                    )
                returns (uint256 out) {
                    amountOutCurve = out;
                    IERC20(outputToken).transfer(strategy, amountOutCurve);
                    return amountOutCurve;
                } catch {
                    return 0;
                }
            } else if (outputToken == USDC_ADDRESS) {
                amountOutCurve = _swapCVXtoUSDC(amount, minimumOut);
            }
        }

        (
            address[] memory path,
            uint24[] memory feeTiers,
            bytes memory encodedPath
        ) = getPathV3(inputToken, outputToken, UNISWAP_V3_FACTORY);

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

            try ISwapRouter(UNISWAP_V3_ROUTER).exactInput(params) returns (
                uint256 out
            ) {
                return out;
            } catch {
                return 0;
            }
        } else {
            // Uniswap V2 Swap
            path = getPathV2(inputToken, outputToken, UNISWAP_V2_FACTORY);
            if (path.length < 2) return 0;

            IERC20(inputToken).approve(UNISWAP_V2_ROUTER, amount);

            try
                IUniswapV2Router02(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
                    amount,
                    minimumOut,
                    path,
                    strategy,
                    block.timestamp + maxDeadline
                )
            returns (uint256[] memory amounts) {
                return amounts[amounts.length - 1];
            } catch {
                return 0;
            }
        }
    }

    function swapViaUniV3SpecificIntermediateToken(
        address inputToken,
        address intToken,
        uint256 amount,
        address outputToken,
        uint16 slippageBps,
        address strategy,
        uint256 maxDeadline,
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

        (
            address[] memory path,
            uint24[] memory feeTiers,
            bytes memory encodedPath
        ) = getPathV3SpecificIntermediateToken(
                inputToken,
                intToken,
                outputToken,
                UNISWAP_V3_FACTORY
            );

        approveOrIncreaseAllowance(
            IERC20(inputToken),
            UNISWAP_V3_ROUTER,
            amount
        );

        ISwapRouter.ExactInputParams memory params = ISwapRouter
            .ExactInputParams({
                path: encodedPath,
                recipient: strategy,
                deadline: block.timestamp + maxDeadline,
                amountIn: amount,
                amountOutMinimum: minimumOut
            });
        try ISwapRouter(UNISWAP_V3_ROUTER).exactInput(params) returns (
            uint256 out
        ) {
            return out;
        } catch {
            return 0;
        }
    }

    function swapViaUniV3SpecificIntermediateTokens(
        address inputToken,
        address intToken1,
        address intToken2,
        uint256 amount,
        address outputToken,
        uint16 slippageBps,
        address strategy,
        uint256 maxDeadline,
        bytes calldata /* data */
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

        (, , bytes memory encodedPath) = getPathV3SpecificIntermediateTokens(
            inputToken,
            intToken1,
            intToken2,
            outputToken,
            UNISWAP_V3_FACTORY
        );

        approveOrIncreaseAllowance(
            IERC20(inputToken),
            UNISWAP_V3_ROUTER,
            amount
        );

        ISwapRouter.ExactInputParams memory params = ISwapRouter
            .ExactInputParams({
                path: encodedPath,
                recipient: strategy,
                deadline: block.timestamp + maxDeadline,
                amountIn: amount,
                amountOutMinimum: minimumOut
            });
        try ISwapRouter(UNISWAP_V3_ROUTER).exactInput(params) returns (
            uint256 out
        ) {
            return out;
        } catch {
            return 0;
        }
    }

    function swapViaUniV4(
        address inputToken,
        uint256 amount,
        address outputToken,
        uint16 slippageBps,
        address receiver,
        uint256 maxDeadline,
        bytes calldata /* data */
    ) external returns (uint256 amountOut) {
        require(
            IERC20(inputToken).balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );
        uint256 minAmountOut = calculateMinAmountOut(
            inputToken,
            outputToken,
            amount,
            slippageBps
        );
        approveTokenWithPermit2(
            inputToken,
            uint160(amount),
            uint48(block.timestamp + maxDeadline)
        );
        // === STEP 1: Command byte ===
        bytes memory commands = abi.encodePacked(uint8(0x10)); // V4_SWAP

        // === STEP 2: Action list for V4Router ===
        bytes memory actions = abi.encodePacked(
            uint8(6), // SWAP_EXACT_IN_SINGLE
            uint8(12), // SETTLE_ALL
            uint8(15) // TAKE_ALL
        );
        bool zeroForOne = inputToken < outputToken;

        // === STEP 3: Setup PoolKey ===
        IV4SwapRouter.PoolKey memory key = IV4SwapRouter.PoolKey({
            currency0: IV4SwapRouter.Currency.wrap(
                zeroForOne ? inputToken : outputToken
            ),
            currency1: IV4SwapRouter.Currency.wrap(
                zeroForOne ? outputToken : inputToken
            ),
            fee: 100,
            tickSpacing: 1,
            hooks: IHooks(address(0)) // assuming no hooks used
        });

        // === STEP 4: Setup Params for actions ===
        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(
            IV4SwapRouter.ExactInputSingleParams({
                poolKey: key,
                zeroForOne: zeroForOne, // ← double-check direction!
                amountIn: uint128(amount),
                amountOutMinimum: uint128(minAmountOut),
                hookData: bytes("")
            })
        );

        params[1] = abi.encode(inputToken, amount);
        params[2] = abi.encode(outputToken, minAmountOut);

        // === STEP 5: Combine into inputs array ===
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(actions, params);

        // === STEP 6: Call Universal Router ===
        try
            IUniversalRouter(UNIVERSAL_ROUTER).execute(
                commands,
                inputs,
                block.timestamp + maxDeadline
            )
        {
            amountOut = IERC20(outputToken).balanceOf(receiver);
        } catch {
            amountOut = 0;
        }
    }

    function swapViaUniV4MultiHop(
        address inputToken,
        uint256 amount,
        address outputToken,
        uint16 slippageBps,
        address receiver,
        uint256 maxDeadline
    ) external returns (uint256 amountOut) {
        require(
            IERC20(inputToken).balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );

        uint256 minAmountOut = calculateMinAmountOut(
            inputToken,
            outputToken,
            amount,
            slippageBps
        );

        approveTokenWithPermit2(
            inputToken,
            uint160(amount),
            uint48(block.timestamp + maxDeadline)
        );

        // === Build Path ===
        IV4SwapRouter.PathKey[] memory path;
        path[0] = IV4SwapRouter.PathKey({
            intermediateCurrency: address(
                0xdA67B4284609d2d48e5d10cfAc411572727dc1eD
            ), // ← insert actual USN address
            fee: 100, // 1 bps fee
            tickSpacing: 1,
            hooks: address(0),
            hookData: ""
        });
        path[1] = IV4SwapRouter.PathKey({
            intermediateCurrency: outputToken, // this field is ignored in final hop
            fee: 100,
            tickSpacing: 1,
            hooks: address(0),
            hookData: ""
        });

        // === Build ExactInputParams ===
        IV4SwapRouter.ExactInputParams memory params = IV4SwapRouter
            .ExactInputParams({
                currencyIn: IV4SwapRouter.Currency.wrap(inputToken),
                path: path,
                amountIn: uint128(amount),
                amountOutMinimum: uint128(minAmountOut)
            });

        // === Command ===
        bytes memory commands = abi.encodePacked(uint8(0x10)); // V4_SWAP

        // === Actions & Inputs ===
        bytes memory actions = abi.encodePacked(uint8(7), uint8(12), uint8(15)); // SWAP_EXACT_IN_MULTIHOP, SETTLE_ALL, TAKE_ALL
        bytes[] memory paramList = new bytes[](3);
        paramList[0] = abi.encode(params);
        paramList[1] = abi.encode(inputToken, amount);
        paramList[2] = abi.encode(outputToken, minAmountOut);
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(actions, paramList);

        // === Execute ===
        try
            IUniversalRouter(UNIVERSAL_ROUTER).execute(
                commands,
                inputs,
                block.timestamp + maxDeadline
            )
        {
            amountOut = IERC20(outputToken).balanceOf(receiver);
        } catch {
            amountOut = 0;
        }
    }

    function approveTokenWithPermit2(
        address token,
        uint160 amount,
        uint48 expiration
    ) internal {
        IERC20(token).approve(address(permit2), type(uint256).max);
        permit2.approve(token, address(UNIVERSAL_ROUTER), amount, expiration);
    }
}
