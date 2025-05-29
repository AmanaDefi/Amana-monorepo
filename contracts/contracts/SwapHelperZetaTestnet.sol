// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "./SwapHelperParent.sol";

import "./interfaces/IZRC20.sol";

import "./CurvePoolRegistry.sol";

contract SwapHelperZetaTestnet is SwapHelperParent {
    uint24 constant V3_FEE_TIER_LOW = 500;
    uint24 constant V3_FEE_TIER_HIGH = 3000;

    address constant WZETA_TOKEN = 0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf; // mainnet and testnet

    address constant USDC_SEP_ADDRESS =
        0xcC683A782f4B30c138787CB5576a86AF66fdc31d; //testnet only
    address constant ETH_BASE_ADDRESS =
        0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD; //testnet only
    address constant ETH_SEP_ADDRESS =
        0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0; //testnet only
    address constant USDC_BSC_ADDRESS =
        0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7; //testnet only
    address constant USDC_POL_ADDRESS =
        0xe573a6e11f8506620F123DBF930222163D46BCB6; //testnet only
    address constant POL_AMOY_ADDRESS =
        0x777915D031d1e8144c90D025C594b3b8Bf07a08d;
    address constant BNB_BSC_ADDRESS =
        0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891;

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
        if (token == ETH_SEP_ADDRESS || token == ETH_BASE_ADDRESS) {
            return ethUsdPriceFeedId;
        } else if (token == POL_AMOY_ADDRESS) {
            return polUsdPriceFeedId;
        } else if (token == BNB_BSC_ADDRESS) {
            return bnbUsdPriceFeedId;
        } else if (token == WZETA_TOKEN) {
            return zetaUsdPriceFeedId;
            // } else if (token == SOL_SOL_ADDRESS) {
            //     return solUsdPriceFeedId;
            // } else if (token == AVAX_AVAX_ADDRESS) {
            //     return avaxUsdPriceFeedId;
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
        return
            token == USDC_BSC_ADDRESS ||
            token == USDC_SEP_ADDRESS ||
            token == USDC_POL_ADDRESS;
    }
}
