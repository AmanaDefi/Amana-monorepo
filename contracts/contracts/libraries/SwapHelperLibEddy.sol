// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

import "../interfaces/IZRC20.sol";
import "../interfaces/IErrors.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/ICurvePool.sol";

library SwapHelperLibEddy {
    address constant UNISWAP_V2_FACTORY =
        0x9fd96203f7b22bCF72d9DCb40ff98302376cE09c; // mainnet and testnet
    address constant UNISWAP_V2_ROUTER =
        0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe; // mainnet and testnet
    address constant WZETA_TOKEN = 0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf; // mainnet and testnet

    address constant PRICE_ORACLE_ADDRESS =
        0xD52b6aB593caB9D55dB083D8a6Fe9A3F8d91ad8d; // mainnet only

    address constant CURVE_POOL = 0x448028804461e8e5a8877c228F3adFd58c3Da6B6; // mainnet only

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

    bytes32 constant ethUsdPriceFeedId =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    bytes32 constant polUsdPriceFeedId =
        0xffd11c5a1cfd42f80afb2df4d9f264c15f956d68153335374ec10722edd70472;
    bytes32 constant bnbUsdPriceFeedId =
        0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f;

    function isInEddy4Pool(address token) external pure returns (bool) {
        if (
            token == 0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a || // USDC_ETH_ADDRESS
            token == 0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7 || // USDT_ETH_ADDRESS
            token == 0x91d4F0D54090Df2D81e834c3c8CE71C6c865e79F || // USDT_BSC_ADDRESS
            token == 0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0 // USDC_BSC_ADDRESS
        ) {
            return true;
        }
        return false;
    }

    // Function to get the index of a token in the Curve pool
    function getTokenIndex(address token) public view returns (uint256) {
        // Assume the pool has at most 8 coins; adjust if necessary
        for (uint256 i = 0; i < 4; i++) {
            try ICurvePool(CURVE_POOL).coins(i) returns (address poolToken) {
                if (poolToken == token) {
                    return i; // Convert to int128 as required by Curve's exchange function
                }
            } catch {
                break; // Stop if index exceeds the number of tokens in the pool
            }
        }
        revert("Token not found in Curve pool");
    }

    /**
     * @notice Determines if a token address corresponds to an ETH token.
     * @dev Compares the token address against predefined ETH token addresses.
     * @param token The address of the token to check.
     * @return True if the token is an ETH token, false otherwise.
     */
    function isEthToken(address token) internal pure returns (bool) {
        return token == ETH_ETH_ADDRESS || token == ETH_BASE_ADDRESS;
    }

    /**
     * @notice Determines if a token address corresponds to a USD stablecoin.
     * @dev Compares the token address against predefined USD stablecoin addresses.
     * @param token The address of the token to check.
     * @return True if the token is a USD stablecoin, false otherwise.
     */
    function isUsdStablecoin(address token) internal pure returns (bool) {
        return
            token == USDC_BSC_ADDRESS ||
            token == USDC_ETH_ADDRESS ||
            token == USDC_POL_ADDRESS ||
            token == USDC_BASE_ADDRESS ||
            token == USDT_BSC_ADDRESS ||
            token == USDT_ETH_ADDRESS ||
            token == USDT_POL_ADDRESS;
    }

    function isPolToken(address token) internal pure returns (bool) {
        return token == POL_POLYGON_ADDRESS;
    }

    function isBnbToken(address token) internal pure returns (bool) {
        return token == BNB_BSC_ADDRESS;
    }

    function isBscStablecoin(address token) internal pure returns (bool) {
        return token == USDC_BSC_ADDRESS || token == USDT_BSC_ADDRESS;
    }

    /**
     * @notice Calculates the minimum output amount based on the input token, output token, and slippage tolerance.
     * @dev Adjusts the output based on slippage and the price from a price oracle for cross-category token swaps.
     * @param inputToken The address of the input token.
     * @param outputToken The address of the output token.
     * @param amount The input amount in token units.
     * @param slippageBps The slippage tolerance in basis points (e.g., 50 for 0.5%).
     * @return The minimum acceptable output amount.
     * @custom:reverts InvalidTokenPair if the token pair is not supported.
     */
    function calculateMinAmountOut(
        address inputToken,
        address outputToken,
        uint256 amount,
        uint16 slippageBps // Slippage in basis points (e.g., 50 for 0.5%)
    ) public view returns (uint256) {
        bool isInputStable = isUsdStablecoin(inputToken);
        bool isOutputStable = isUsdStablecoin(outputToken);
        bool isInput18Decimals = isBscStablecoin(inputToken) || !isInputStable; // BSC USDC/USDT & non-stables have 18 decimals
        bool isOutput18Decimals = isBscStablecoin(outputToken) ||
            !isOutputStable; // BSC USDC/USDT & non-stables have 18 decimals

        if (isEthToken(inputToken) && isOutputStable) {
            // ETH (18 decimals) -> USD Stablecoin (6 or 18 decimals)
            uint256 ethUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
                ethUsdPriceFeedId
            );
            uint256 usdAmount = (amount * ethUsdPrice) / 10 ** 8;

            if (!isOutput18Decimals) usdAmount /= 10 ** 12; // Convert from 18 to 6 decimals if needed

            return usdAmount - ((usdAmount * slippageBps) / 10000);
        } else if (isInputStable && isEthToken(outputToken)) {
            // USD Stablecoin (6 or 18 decimals) -> ETH (18 decimals)
            uint256 ethUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
                ethUsdPriceFeedId
            );

            if (!isInput18Decimals) amount *= 10 ** 12; // Convert from 6 to 18 decimals if needed
            uint256 ethAmount = (amount * 10 ** 8) / ethUsdPrice;

            return ethAmount - ((ethAmount * slippageBps) / 10000);
        } else if (isInputStable && isPolToken(outputToken)) {
            // USD Stablecoin (6 or 18 decimals) -> POL (18 decimals)
            uint256 polUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
                polUsdPriceFeedId
            );

            if (!isInput18Decimals) amount *= 10 ** 12;
            uint256 polAmount = (amount * 10 ** 8) / polUsdPrice;

            return polAmount - ((polAmount * slippageBps) / 10000);
        } else if (isPolToken(inputToken) && isOutputStable) {
            // POL (18 decimals) -> USD Stablecoin (6 or 18 decimals)
            uint256 polUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
                polUsdPriceFeedId
            );
            uint256 usdAmount = (amount * polUsdPrice) / 10 ** 8;

            if (!isOutput18Decimals) usdAmount /= 10 ** 12;

            return usdAmount - ((usdAmount * slippageBps) / 10000);
        } else if (isInputStable && isBnbToken(outputToken)) {
            // USD Stablecoin (6 or 18 decimals) -> BNB (18 decimals)
            uint256 bnbUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
                bnbUsdPriceFeedId
            );

            if (!isInput18Decimals) amount *= 10 ** 12;
            uint256 bnbAmount = (amount * 10 ** 8) / bnbUsdPrice;

            return bnbAmount - ((bnbAmount * slippageBps) / 10000);
        } else if (isBnbToken(inputToken) && isOutputStable) {
            // BNB (18 decimals) -> USD Stablecoin (6 or 18 decimals)
            uint256 bnbUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
                bnbUsdPriceFeedId
            );
            uint256 usdAmount = (amount * bnbUsdPrice) / 10 ** 8;

            if (!isOutput18Decimals) usdAmount /= 10 ** 12;

            return usdAmount - ((usdAmount * slippageBps) / 10000);
        } else if (isEthToken(inputToken) && isPolToken(outputToken)) {
            // ETH -> POL (Derived using ETH->USD & POL->USD)
            uint256 ethUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
                ethUsdPriceFeedId
            );
            uint256 polUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
                polUsdPriceFeedId
            );
            uint256 ethPolPrice = (polUsdPrice * 10 ** 8) / ethUsdPrice;
            uint256 polAmount = (amount * ethPolPrice) / 10 ** 8;

            return polAmount - ((polAmount * slippageBps) / 10000);
        } else if (isPolToken(inputToken) && isEthToken(outputToken)) {
            // POL -> ETH (Derived using ETH->USD & POL->USD)
            uint256 ethUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
                ethUsdPriceFeedId
            );
            uint256 polUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
                polUsdPriceFeedId
            );
            uint256 ethPolPrice = (polUsdPrice * 10 ** 8) / ethUsdPrice;
            uint256 ethAmount = (amount * 10 ** 8) / ethPolPrice;

            return ethAmount - ((ethAmount * slippageBps) / 10000);
        } else if (isEthToken(inputToken) && isBnbToken(outputToken)) {
            // ETH -> BNB (Derived using ETH->USD & BNB->USD)
            uint256 ethUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
                ethUsdPriceFeedId
            );
            uint256 bnbUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
                bnbUsdPriceFeedId
            );
            uint256 ethBnbPrice = (bnbUsdPrice * 10 ** 8) / ethUsdPrice;
            uint256 bnbAmount = (amount * ethBnbPrice) / 10 ** 8;

            return bnbAmount - ((bnbAmount * slippageBps) / 10000);
        } else if (isBnbToken(inputToken) && isEthToken(outputToken)) {
            // BNB -> ETH (Derived using ETH->USD & BNB->USD)
            uint256 ethUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
                ethUsdPriceFeedId
            );
            uint256 bnbUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(
                bnbUsdPriceFeedId
            );
            uint256 ethBnbPrice = (bnbUsdPrice * 10 ** 8) / ethUsdPrice;
            uint256 ethAmount = (amount * 10 ** 8) / ethBnbPrice;

            return ethAmount - ((ethAmount * slippageBps) / 10000);
        } else {
            return amount - ((amount * slippageBps) / 10000);
        }
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
        if (tokenA == tokenB) revert IErrors.CantBeIdenticalAddresses();
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        if (token0 == address(0)) revert IErrors.CantBeZeroAddress();
    }

    function _existsPairPool(
        address tokenA,
        address tokenB
    ) internal view returns (bool) {
        address pair = IUniswapV2Factory(UNISWAP_V2_FACTORY).getPair(
            tokenA,
            tokenB
        );
        return pair != address(0) && IUniswapV2Pair(pair).totalSupply() > 0;
    }

    function getPath(
        address zrc20,
        address targetZRC20
    ) public view returns (address[] memory path) {
        if (zrc20 == targetZRC20) {
            revert IErrors.CantBeIdenticalAddresses();
        }
        bool existsDirectPool = _existsPairPool(zrc20, targetZRC20);

        if (existsDirectPool) {
            path = new address[](2);
            path[0] = zrc20;
            path[1] = targetZRC20;
        } else if (
            // Check for intermediate liquidity via WZeta
            !_existsPairPool(zrc20, WZETA_TOKEN) ||
            !_existsPairPool(WZETA_TOKEN, targetZRC20)
        ) {
            revert IErrors.InsufficientLiquidity();
        } else {
            path = new address[](3);
            path[0] = zrc20;
            path[1] = WZETA_TOKEN;
            path[2] = targetZRC20;
        }
        return path;
    }

    function getAmountOut(
        uint amountIn,
        uint reserveIn,
        uint reserveOut
    ) internal pure returns (uint amountOut) {
        if (amountIn == 0) {
            revert IErrors.InsufficientInputAmount();
        }
        if (reserveIn == 0 || reserveOut == 0) {
            revert IErrors.InsufficientLiquidity();
        }
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
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

    function getUniswapAmountOut(
        uint amountIn,
        address inputZrc20,
        address outputZrc20
    ) public view returns (uint finalAmountOut) {
        address[] memory path = getPath(inputZrc20, outputZrc20);

        if (path.length < 2) {
            revert IErrors.InvalidPath();
        }
        uint[] memory amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i = 0; i < path.length - 1; i++) {
            (uint reserveIn, uint reserveOut) = getReserves(
                path[i],
                path[i + 1]
            );
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
        finalAmountOut = amounts[amounts.length - 1];
    }

    function getCurveAmountOut(
        uint256 amountIn,
        address inputToken,
        address outputToken
    ) public view returns (uint256) {
        uint256 inputIndex = getTokenIndex(inputToken);
        uint256 outputIndex = getTokenIndex(outputToken);
        return ICurvePool(CURVE_POOL).get_dy(inputIndex, outputIndex, amountIn);
    }
}
