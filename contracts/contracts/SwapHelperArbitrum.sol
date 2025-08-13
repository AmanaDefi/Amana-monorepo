// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "./SwapHelperParent.sol";

contract SwapHelperArbitrum is SwapHelperParent {
    address public constant ROUTER_NG =
        0x2191718CD32d02B8E60BAdFFeA33E4B5DD9A0A0D; // Curve Router NG on Arbitrum

    uint24 constant V3_FEE_TIER_LOW = 500;
    uint24 constant V3_FEE_TIER_HIGH = 3000;

    address constant WETH_TOKEN = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1; // Arbitrum

    address public constant CRV_ADDRESS =
        0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978; // CRV token
    // address public constant CVX_ADDRESS =
    //     0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B; // CVX token
    address public constant USDC_ADDRESS =
        0xaf88d065e77c8cC2239327C5EDb3A432268e5831; // USDC token
    address public constant USDT_ADDRESS =
        0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9; // USDT token

    bytes32 constant crvUsdPriceFeedId =
        0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8;
    bytes32 constant cvxUsdPriceFeedId =
        0x6aac625e125ada0d2a6b98316493256ca733a5808cd34ccef79b0e28c64d1e76;
    bytes32 constant ethUsdPriceFeedId =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    function initialize(address _priceOracle) external initializer {
        __SwapHelperParent_init(
            _priceOracle,
            0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24, // V2 Router
            0xf1D7CC64Fb4452F05c498126312eBE29f30Fbcf9, // V2 Factory
            0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45, // V3 Router
            0x1F98431c8aD98523631AE4a59f267346ea31F984, // V3 Factory
            0x13526206545e2DC7CcfBaF28dC88F440ce7AD3e0, // Curve Registry
            WETH_TOKEN
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
            // } else if (token == CVX_ADDRESS) {
            //     return cvxUsdPriceFeedId;
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
}
