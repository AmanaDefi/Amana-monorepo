// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

import "../interfaces/IZRC20.sol";
import "../interfaces/IEddySwap.sol";
import "../interfaces/IErrors.sol";
import "../interfaces/IPriceOracle.sol";

import "hardhat/console.sol";

address constant UNISWAP_V2_FACTORY = 0x9fd96203f7b22bCF72d9DCb40ff98302376cE09c;
address constant UNISWAP_V2_ROUTER = 0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe;
address constant PRICE_ORACLE_ADDRESS = 0xF780e1fd3406F3b25004324108fc4B891c36C1Ae;

address constant WZETA_TOKEN = 0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf;
address constant USDC_ETH_ADDRESS = 0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a;
address constant USDT_ETH_ADDRESS = 0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7;
address constant ETH_BASE_ADDRESS = 0x1de70f3e971B62A0707dA18100392af14f7fB677;
address constant ETH_ETH_ADDRESS = 0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891;
address constant USDC_BSC_ADDRESS = 0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0;
address constant USDC_BASE_ADDRESS = 0x1de70f3e971B62A0707dA18100392af14f7fB677;
address constant USDT_BSC_ADDRESS = 0x91d4F0D54090Df2D81e834c3c8CE71C6c865e79F;
address constant USDT_POL_ADDRESS = 0xdbfF6471a79E5374d771922F2194eccc42210B9F;
address constant USDC_POL_ADDRESS = 0xfC9201f4116aE6b054722E10b98D904829b469c3;

library SwapHelperLibEddy {
    function isEthToken(address token) internal pure returns (bool) {
        return token == ETH_ETH_ADDRESS || token == ETH_BASE_ADDRESS;
    }

    function isUsdStablecoin(address token) internal pure returns (bool) {
        return
            token == USDC_ETH_ADDRESS ||
            token == USDT_ETH_ADDRESS ||
            token == USDC_BSC_ADDRESS;
    }

    function calculateMinAmountOut(
        address inputToken,
        address outputToken,
        uint256 amount,
        uint256 slippageBps // Slippage in basis points (e.g., 50 for 0.5%)
    ) internal view returns (uint256) {
        if (isEthToken(inputToken) && isEthToken(outputToken)) {
            // ETH -> ETH
            return amount - ((amount * slippageBps) / 10000);
        } else if (
            isUsdStablecoin(inputToken) && isUsdStablecoin(outputToken)
        ) {
            // USD -> USD
            return amount - ((amount * slippageBps) / 10000);
        } else if (isEthToken(inputToken) && isUsdStablecoin(outputToken)) {
            // ETH -> USD
            uint256 ethUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS)
                .fetchEthUsdPrice();
            uint256 usdAmount = (amount * ethUsdPrice) / 10 ** 8; // Adjust for Chainlink decimals
            return usdAmount - ((usdAmount * slippageBps) / 10000);
        } else if (isUsdStablecoin(inputToken) && isEthToken(outputToken)) {
            // USD -> ETH
            uint256 ethUsdPrice = IPriceOracle(PRICE_ORACLE_ADDRESS)
                .fetchEthUsdPrice();
            uint256 ethAmount = (amount * 10 ** 8) / ethUsdPrice; // Adjust for Chainlink decimals
            return ethAmount - ((ethAmount * slippageBps) / 10000);
        } else {
            revert IErrors.InvalidTokenPair();
        }
    }

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

    function uniswapv2PairFor(
        address tokenA,
        address tokenB
    ) internal pure returns (address pair) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        pair = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            hex"ff",
                            UNISWAP_V2_FACTORY,
                            keccak256(abi.encodePacked(token0, token1)),
                            hex"96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f" // init code hash
                        )
                    )
                )
            )
        );
    }

    function swapExactTokensForTokens(
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint256 slippageBps,
        address vault,
        uint16 maxDeadline
    ) internal returns (uint256) {
        address[] memory path;
        bool existsDirectPool = _existsPairPool(zrc20, targetZRC20);

        if (existsDirectPool) {
            path = new address[](2);
            path[0] = zrc20;
            path[1] = targetZRC20;
        } else {
            // Check for intermediate liquidity via WZeta
            if (
                !_existsPairPool(zrc20, WZETA_TOKEN) ||
                !_existsPairPool(WZETA_TOKEN, targetZRC20)
            ) {
                revert IErrors.InsufficientLiquidity();
            }
            path = new address[](3);
            path[0] = zrc20;
            path[1] = WZETA_TOKEN;
            path[2] = targetZRC20;
        }

        uint256 minAmountOut = calculateMinAmountOut(
            zrc20,
            targetZRC20,
            amount,
            slippageBps
        );

        IZRC20(zrc20).approve(UNISWAP_V2_ROUTER, amount);
        // Perform the swap
        uint256[] memory amounts = IUniswapV2Router02(UNISWAP_V2_ROUTER)
            .swapExactTokensForTokens(
                amount,
                minAmountOut,
                path,
                vault,
                block.timestamp + maxDeadline
            );

        return amounts[amounts.length - 1];
    }

    function _existsPairPool(
        address zrc20A,
        address zrc20B
    ) internal view returns (bool) {
        address uniswapPool = uniswapv2PairFor(zrc20A, zrc20B);
        return
            IZRC20(zrc20A).balanceOf(uniswapPool) > 0 &&
            IZRC20(zrc20B).balanceOf(uniswapPool) > 0;
    }

    function _isSufficientLiquidity(
        uint256 amountIn,
        uint256 minAmountOut,
        address[] memory path
    ) internal view returns (bool) {
        if (path.length != 2) revert IErrors.InvalidPathLength();
        bool existsPairPool = _existsPairPool(path[0], path[1]);
        if (!existsPairPool) {
            return false;
        }
        uint256[] memory amounts = getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1] >= minAmountOut;
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

    function getAmountsOut(
        uint amountIn,
        address[] memory path
    ) internal view returns (uint[] memory amounts) {
        if (path.length < 2) {
            revert IErrors.InvalidPath();
        }
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            (uint reserveIn, uint reserveOut) = getReserves(
                path[i],
                path[i + 1]
            );
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    // fetches and sorts the reserves for a pair
    function getReserves(
        address tokenA,
        address tokenB
    ) internal view returns (uint reserveA, uint reserveB) {
        (address token0, ) = sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1, ) = IUniswapV2Pair(
            pairFor(tokenA, tokenB)
        ).getReserves();
        (reserveA, reserveB) = tokenA == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    function pairFor(
        address tokenA,
        address tokenB
    ) internal view returns (address pair) {
        pair = IUniswapV2Factory(UNISWAP_V2_FACTORY).getPair(tokenA, tokenB);
    }
}
