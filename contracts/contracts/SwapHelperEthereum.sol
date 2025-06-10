// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "./SwapHelperParent.sol";

import "./interfaces/ICurvePoolDynamic.sol";
import "./interfaces/ICurveRegistry.sol";
import "./interfaces/ICurveRouterNG.sol";

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
        return (token == USDC_ADDRESS || token == USDT_ADDRESS);
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

            try ISwapRouter(UNISWAP_V3_ROUTER).exactInput(params) returns (
                uint256 out
            ) {
                return out;
            } catch {
                return 0;
            }
        } else {
            // Uniswap V2 Swap
            path = getPathV2(inputToken, outputToken);
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
}
