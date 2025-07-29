// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "./SwapHelperParent.sol";

// PriceOracle address: 0xd052F4383e5ae6A17d67DA5eC0c0cc679Ba04a77

contract SwapHelperPolygon is SwapHelperParent {
    uint24 constant V3_FEE_TIER_LOWEST = 100;
    uint24 constant V3_FEE_TIER_LOW = 500;
    uint24 constant V3_FEE_TIER_HIGH = 3000;

    address constant WETH_TOKEN = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;

    address constant USDC_ADDRESS = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359;
    address constant USDCe_ADDRESS = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174; // USDC.e on Polygon
    address constant USDT_ADDRESS = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;
    address constant WMATIC_ADDRESS =
        0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address constant COMP_ADDRESS = 0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c;

    bytes32 constant ethUsdPriceFeedId =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    bytes32 constant polUsdPriceFeedId =
        0xffd11c5a1cfd42f80afb2df4d9f264c15f956d68153335374ec10722edd70472;
    bytes32 constant compUsdPriceFeedId =
        0x4a8e42861cabc5ecb50996f92e7cfa2bce3fd0a2423b0c44c9b423fb2bd25478;

    function initialize(address _priceOracle) external initializer {
        __SwapHelperParent_init(
            _priceOracle,
            0xedf6066a2b290C185783862C7F4776A2C8077AD1, // Uniswap V2 Router
            0x9e5A52f57b3038F1B8EeE45F28b3C1967e22799C, // Uniswap V2 Factory
            0xE592427A0AEce92De3Edee1F18E0157C05861564, // Uniswap V3 Router
            0x1F98431c8aD98523631AE4a59f267346ea31F984, // Uniswap V3 Factory
            address(0),
            WMATIC_ADDRESS // ← passed into the parent as the intermediate token
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
        } else if (token == WMATIC_ADDRESS) {
            return polUsdPriceFeedId;
        } else if (token == COMP_ADDRESS) {
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
        return (token == USDC_ADDRESS ||
            token == USDT_ADDRESS ||
            token == USDCe_ADDRESS);
    }
}
