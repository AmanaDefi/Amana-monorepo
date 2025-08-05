// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "./SwapHelperParent.sol";
import "./interfaces/ICurvePoolDynamic.sol";
import "./interfaces/IAerodromePoolFactory.sol";
import "./interfaces/IAerodromePool.sol";
import "./interfaces/IAerodromeRouter.sol";
import "./interfaces/IBalancerRouter.sol";
import "./interfaces/I4626Vault.sol";
import "./CurvePoolRegistry.sol";
import "./interfaces/IAerodromeSlipstreamRouter.sol";
import "./interfaces/IAerodromeSlipstreamFactory.sol";
import "./interfaces/IAerodromeSlipstreamQuoter.sol";
import "./interfaces/IAerodromeSlipstreamPool.sol";
import "./interfaces/IVelodromeUniversalRouter.sol";
import "hardhat/console.sol";

// V2 Pair interface for quoting
interface IV2Pair {
    function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256 amountOut);
}

// PriceOracle address: 0x7C136bC8A5Ce2245C3357bc4A7B97C1A9A2b480c

library URCmd {
    uint8 constant V3_SWAP_EXACT_IN  = 0x00;
    uint8 constant V2_SWAP_EXACT_IN  = 0x08;
    uint8 constant WRAP_ETH          = 0x0b;
    uint8 constant SWEEP             = 0x0a;

    function allowRevert(uint8 cmd) internal pure returns (bytes1) { return bytes1(cmd | 0x80); }
}

library PathV3 {
    function encodeSingle(address tokenIn, uint24 fee, address tokenOut) internal pure returns (bytes memory) {
        return abi.encodePacked(tokenIn, fee, tokenOut);
    }
}

contract SwapHelperOnBase is SwapHelperParent {
    address constant WELL = 0xA88594D404727625A9437C3f886C7643872296AE;
    address constant MORPHO = 0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842;
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant axlOP = 0x994ac01750047B9d35431a7Ae4Ed312ee955E030;
    address constant yUSD = 0x4772D2e014F9fC3a820C444e3313968e9a5C8121;
    address constant COMP = 0x9e1028F5F1D5eDE59748FFceE5532509976840E0;
    address constant USDS = 0x820C137fa70C8691f0e44Dc420a5e53c168921Dc;

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

    address constant BALANCER_ROUTER =
        0x3f170631ed9821Ca51A59D996aB095162438DC10; // Balancer Vault on Base
    address constant BALANCER_VAULT =
        0xbA1333333333a1BA1108E8412f11850A5C319bA9; // Balancer Vault on Base
    
    address constant AERODROME_ROUTER =
        0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43; // Aerodrome Router on Base
    address constant AERODROME_FACTORY =
        0x420DD381b31aEf6683db6B902084cB0FFECe40Da; // Aerodrome PoolFactory on Base
    address constant UNIVERSAL_ROUTER =
        0x01D40099fCD87C018969B0e8D4aB1633Fb34763C; // Universal Router on Base (same as Ethereum for now)
    address constant SLIPSTREAM_FACTORY =
        0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A; // Slipstream Factory on Base (same as Uniswap V3 Factory)
    address constant SLIPSTREAM_QUOTER =
        0x254cF9E1E6e233aa1AC962CB9B05b2cfeAaE15b0; // Slipstream Quoter on Base (same as Uniswap V3 Router for now)

    // Common stable fee tier on Slipstream/UniswapV3-style pools
    uint24 public constant DEFAULT_V3_FEE = 500;

    // UR commands (Velodrome/Aerodrome UniversalRouter)
    uint8 constant CMD_V3_EXACT_IN = 0x00;
    uint8 constant CMD_V2_EXACT_IN = 0x08;
    uint8 constant CMD_WRAP_ETH     = 0x0b; // not used here (ERC20→ERC20)

    struct Quote {
        uint256 amountOut;
        uint8 routeKind; // 1=V3, 2=V2, 3=V3->V2
        uint256 midOut;  // for V3->V2 intermediate
        uint24 fee;
    }

    function initialize(address _priceOracle) external initializer {
        __SwapHelperParent_init(
            _priceOracle,
            0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24, // ← Uniswap V2 Router on Base
            0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6, // ← Uniswap V2 Factory on Base
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
        return (token == USDC || token == yUSD || token == USDS);
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
        return pair != address(0);
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
        if (path.length < 2) return 0;
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



    /// @notice Swap exact-in choosing among: V3 direct, V2 direct, V3->V2 via WETH.
    /// @param tokenIn  ERC20 input
    /// @param tokenOut ERC20 output
    /// @param amountIn Exact input amount (must be approved to this contract)
    /// @param slippageBps Min-out = bestQuote * (1 - slippageBps/1e4)
    /// @param recipient Receiver of output tokens
    /// @param deadline  UniversalRouter deadline
    function swapBestExactIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint16  slippageBps,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut) {
        require(tokenIn != tokenOut, "identical tokens");
        require(amountIn > 0, "zero amount");

        // -------- 1) Quote the three candidates on-chain --------
        Quote memory qV3   = _quoteV3(tokenIn, tokenOut, amountIn);
        Quote memory qV2   = _quoteV2(tokenIn, tokenOut, amountIn, isStablecoin(tokenIn) && isStablecoin(tokenOut));
        Quote memory qMix  = _quoteV3ThenV2(tokenIn, tokenOut, amountIn);
        
        // Pick best
        Quote memory best = qV3;
        if (qV2.amountOut > best.amountOut) best = qV2;
        if (qMix.amountOut > best.amountOut) best = qMix;
        require(best.amountOut > 0, "no route");

        // -------- 2) Pre-fund UR (payerIsUser=false for all legs) --------
        // For UR with payerIsUser=false, tokens must be held by UR already.
        // Push tokenIn to UR so the first leg can spend.
        IERC20(tokenIn).approve(address(UNIVERSAL_ROUTER), 0); // reset just in case (not strictly needed)
        require(IERC20(tokenIn).transferFrom(address(this), address(UNIVERSAL_ROUTER), 0), "noop"); // no-op safety line (optional)
        // Actually transfer tokenIn to UR:
        require(IERC20(tokenIn).transfer(address(UNIVERSAL_ROUTER), amountIn), "push to UR failed");

        // -------- 3) Build commands & inputs in memory --------
        bytes memory commands;
        bytes[] memory inputs;

        uint256 minOut = (best.amountOut * (10000 - slippageBps)) / 10000;
        console.log("best.routeKind", best.routeKind);
        console.log("best.amountOut", best.amountOut);
        console.log("minOut", minOut);
        if (best.routeKind == 1) {
            // Direct V3 exact-in
            commands = abi.encodePacked(bytes1(CMD_V3_EXACT_IN));
            inputs = new bytes[](1);

            bytes memory path = PathV3.encodeSingle(tokenIn, best.fee, tokenOut);
            console.log("path length", path.length);
            // (recipient, amountIn, amountOutMin, bytes path, payerIsUser=false, useSlipstream=true for Slipstream)
            inputs[0] = abi.encode(recipient, amountIn, minOut, path, false, false);

        } else if (best.routeKind == 2) {
            // Direct V2 exact-in
            commands = abi.encodePacked(bytes1(CMD_V2_EXACT_IN));
            inputs = new bytes[](1);

            // V2 path encoding: For Aerodrome V2, encode as (tokenIn, stable, tokenOut)
            // where stable is a boolean (0x00 for volatile, 0x01 for stable)
            bool isStable = isStablecoin(tokenIn) && isStablecoin(tokenOut);
            bytes memory v2Path = abi.encodePacked(tokenIn, bytes1(isStable ? 0x01 : 0x00), tokenOut);
            
            // (recipient, amountIn, amountOutMin, bytes v2Path, payerIsUser=false, uniswapFlag=false)
            inputs[0] = abi.encode(recipient, amountIn, minOut, v2Path, false, false);

        } else {
            // Mixed V3->V2: tokenIn -> WETH (V3), WETH -> tokenOut (V2)
            commands = abi.encodePacked(bytes1(CMD_V3_EXACT_IN), bytes1(CMD_V2_EXACT_IN));
            inputs = new bytes[](2);

            uint256 minMid = (best.midOut * (10000 - slippageBps)) / 10000;

            // Leg 1 (V3): tokenIn -> WETH
            bytes memory p1 = PathV3.encodeSingle(tokenIn, best.fee, WETH_ADDRESS);
            inputs[0] = abi.encode(
                address(this),        // receive WETH into this contract
                amountIn,
                minMid,
                p1,
                false,                // payerIsUser=false (UR is funded)
                false                  // useSlipstream (not Uniswap V3)
            );

            // Leg 2 (V2): WETH -> tokenOut
            bool isStable = isStablecoin(WETH_ADDRESS) && isStablecoin(tokenOut);
            bytes memory v2Path = abi.encodePacked(WETH_ADDRESS, bytes1(isStable ? 0x01 : 0x00), tokenOut);
            inputs[1] = abi.encode(
                recipient,
                best.midOut,          // expected input to leg2
                minOut,
                v2Path,
                false,                // payerIsUser=false (UR spends what it holds)
                false                 // use Aerodrome/Velodrome V2
            );
        }

        console.logBytes(commands);
        console.logBytes(inputs[0]);
        console.log("balance", IERC20(tokenIn).balanceOf(address(UNIVERSAL_ROUTER)));
        console.log("About to execute Universal Router...");

        // -------- 4) Execute --------
        try IVelodromeUniversalRouter(UNIVERSAL_ROUTER).execute(commands, inputs, deadline) {
            console.log("Execute succeeded");
        } catch Error(string memory reason) {
            console.log("Execute failed with reason:", reason);
            revert("Universal Router execute failed");
        } catch (bytes memory lowLevelData) {
            console.log("Execute failed with low level data");
            console.logBytes(lowLevelData);
            revert("Universal Router execute failed");
        }

        console.log("amountOut", best.amountOut);
        
        // Return the expected amount out
        return best.amountOut;
    }

    // ---------- internal quoting ----------

    function _quoteV3(address tokenIn, address tokenOut, uint256 amountIn)
        internal
        returns (Quote memory q)
    {
        int24[] memory tickSpacings = IAerodromeSlipstreamFactory(SLIPSTREAM_FACTORY).tickSpacings();
        for (uint256 i = 0; i < tickSpacings.length; i++) {
            address pool = IAerodromeSlipstreamFactory(SLIPSTREAM_FACTORY).getPool(tokenIn, tokenOut, tickSpacings[i]);
            if (pool != address(0)) {
                uint256 out;
                try IAerodromeSlipstreamQuoter(SLIPSTREAM_QUOTER).quoteExactInputSingle(IAerodromeSlipstreamQuoter.QuoteExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    tickSpacing: tickSpacings[i],
                    amountIn: amountIn,
                    sqrtPriceLimitX96: 0
                })) returns (uint256 amountOut, uint160, uint32, uint256) {
                    out = amountOut;
                } catch { out = 0; }
                q = Quote({
                    amountOut: out,
                    routeKind: out > 0 ? 1 : 0,
                    midOut: 0,
                    fee: IAerodromeSlipstreamPool(pool).fee()
                });
                return q;                
            }
        }
        return Quote({
            amountOut: 0,
            routeKind: 0,
            midOut: 0,
            fee: 0
        });
    }

    function _quoteV2(address tokenIn, address tokenOut, uint256 amountIn, bool isStable)
        internal
        view
        returns (Quote memory q)
    {
        address pair = IAerodromePoolFactory(AERODROME_FACTORY).getPool(tokenIn, tokenOut, isStable);
        if (pair == address(0)) return Quote({
            amountOut: 0,
            routeKind: 0,
            midOut: 0,
            fee: 0
        });

        uint256 out;
        try IAerodromePool(pair).getAmountOut(amountIn, tokenIn) returns (uint256 amt) {
            out = amt;
        } catch { out = 0; }

        q = Quote({
            amountOut: out,
            routeKind: out > 0 ? 2 : 0,
            midOut: 0,
            fee: 0
        });
    }

    function _quoteV3ThenV2(address tokenIn, address tokenOut, uint256 amountIn)
        internal
        returns (Quote memory q)
    {
        if (tokenIn == WETH_ADDRESS || tokenOut == WETH_ADDRESS) return Quote({
            amountOut: 0,
            routeKind: 0,
            midOut: 0,
            fee: 0
        }); // avoid trivial duplicates

        // Leg1: V3 tokenIn->WETH
        int24[] memory tickSpacings = IAerodromeSlipstreamFactory(SLIPSTREAM_FACTORY).tickSpacings();
        for (uint256 i = 0; i < tickSpacings.length; i++) {
            address pool1 = IAerodromeSlipstreamFactory(SLIPSTREAM_FACTORY).getPool(tokenIn, WETH_ADDRESS, tickSpacings[i]);
            if (pool1 != address(0)) {
                uint256 midOut;
                try IAerodromeSlipstreamQuoter(SLIPSTREAM_QUOTER).quoteExactInputSingle(IAerodromeSlipstreamQuoter.QuoteExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: WETH_ADDRESS,
                    tickSpacing: tickSpacings[i],
                    amountIn: amountIn,
                    sqrtPriceLimitX96: 0
                })) returns (uint256 amountOut, uint160, uint32, uint256) {
                    midOut = amountOut;
                } catch { midOut = 0; }
                if (midOut == 0) continue;

                // Leg2: V2 WETH->tokenOut
                address pair2 = IAerodromePoolFactory(AERODROME_FACTORY).getPool(WETH_ADDRESS, tokenOut, false); // false for non-stable
                if (pair2 == address(0)) continue;

                uint256 out;
                try IAerodromePool(pair2).getAmountOut(midOut, WETH_ADDRESS) returns (uint256 amtOut) { 
                    out = amtOut;
                } catch { out = 0; }

                q = Quote({
                    amountOut: out,
                    routeKind: out > 0 ? 3 : 0,
                    midOut: midOut,
                    fee: IAerodromeSlipstreamPool(pool1).fee()
                });
                return q;
            }
        }

        return Quote({
            amountOut: 0,
            routeKind: 0,
            midOut: 0,
            fee: 0
        });
    }
}
