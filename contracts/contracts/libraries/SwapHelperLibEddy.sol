// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "../interfaces/IZRC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "../interfaces/IEddySwap.sol";
import "../interfaces/IErrors.sol";

address constant UNISWAP_V2_FACTORY = 0x9fd96203f7b22bCF72d9DCb40ff98302376cE09c;
address constant UNISWAP_V2_ROUTER = 0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe;
address constant WZETA_TOKEN = 0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf;

library SwapHelperLibEddy {
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
        uint256 minAmountOut,
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
