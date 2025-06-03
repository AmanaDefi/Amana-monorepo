// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "./SwapHelperParent.sol";

import "./interfaces/ICurvePoolDynamic.sol";

import "./CurvePoolRegistry.sol";
import "hardhat/console.sol";

// PriceOracle address: 0x7C136bC8A5Ce2245C3357bc4A7B97C1A9A2b480c

contract SwapHelperBnb is SwapHelperParent {
    address constant USDC = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d; // USDC on BNB
    address constant USDT = 0x55d398326f99059fF775485246999027B3197955; // USDT on BNB
    address constant WBNB_ADDRESS = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    address constant YUSD = 0xAB3dBcD9B096C3fF76275038bf58eAC10D22C61f; // YUSD on BNB

    bytes32 constant ethUsdPriceFeedId =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    bytes32 constant bnbUsdPriceFeedId =
        0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f;

    uint24 constant V3_FEE_TIER_LOW = 500;
    uint24 constant V3_FEE_TIER_HIGH = 3000;

    function initialize(address _priceOracle) external initializer {
        __SwapHelperParent_init(
            _priceOracle,
            0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24, // ← Uniswap V2 Router on BNB
            0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6, // ← Uniswap V2 Factory on BNB
            0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2, // ← Uniswap V3 Router on BNB
            0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7, // ← Uniswap V3 Factory on BNB
            0x4C7A5A5D57F98D362f1c00D7135F0dA5B6f82227, // ← Curve Registry on BNB
            WBNB_ADDRESS // ← passed into the parent as the intermediate token
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
        if (token == WBNB_ADDRESS) {
            return bnbUsdPriceFeedId;
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
        return (token == USDC || token == USDT || token == YUSD);
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
