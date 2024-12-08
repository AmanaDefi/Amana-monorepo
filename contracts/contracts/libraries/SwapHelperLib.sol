// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "../interfaces/IZRC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

library SwapHelperLib {
    error InvalidPathLength();
    error CantBeZeroAddress();
    error CantBeIdenticalAddresses();
    error InsufficientLiquidity();
    error InsufficientInputAmount();
    error InvalidPath();

    function sortTokens(
        address tokenA,
        address tokenB
    ) internal pure returns (address token0, address token1) {
        if (tokenA == tokenB) revert CantBeIdenticalAddresses();
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        if (token0 == address(0)) revert CantBeZeroAddress();
    }

    function uniswapv2PairFor(
        address factory,
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
                            factory,
                            keccak256(abi.encodePacked(token0, token1)),
                            hex"96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f" // init code hash
                        )
                    )
                )
            )
        );
    }

    function swapExactTokensForTokens(
        address router,
        address factory,
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint256 minAmountOut,
        address vault,
        uint16 maxDeadline
    ) internal returns (uint256) {
        address[] memory path;
        bool existsDirectPool = _existsPairPool(factory, zrc20, targetZRC20);

        if (existsDirectPool) {
            path = new address[](2);
            path[0] = zrc20;
            path[1] = targetZRC20;
        } else {
            // Check for intermediate liquidity via WZeta
            address wZeta = IUniswapV2Router02(router).WETH(); // Replace with WZeta if needed
            if (
                !_existsPairPool(factory, zrc20, wZeta) ||
                !_existsPairPool(factory, wZeta, targetZRC20)
            ) {
                revert InsufficientLiquidity();
            }
            path = new address[](3);
            path[0] = zrc20;
            path[1] = wZeta;
            path[2] = targetZRC20;
        }
        IZRC20(zrc20).approve(router, amount);
        // Perform the swap
        uint256[] memory amounts = IUniswapV2Router02(router)
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
        address uniswapV2Factory,
        address zrc20A,
        address zrc20B
    ) internal view returns (bool) {
        address uniswapPool = uniswapv2PairFor(
            uniswapV2Factory,
            zrc20A,
            zrc20B
        );
        return
            IZRC20(zrc20A).balanceOf(uniswapPool) > 0 &&
            IZRC20(zrc20B).balanceOf(uniswapPool) > 0;
    }

    function _isSufficientLiquidity(
        address uniswapV2Factory,
        uint256 amountIn,
        uint256 minAmountOut,
        address[] memory path
    ) internal view returns (bool) {
        if (path.length != 2) revert InvalidPathLength();
        bool existsPairPool = _existsPairPool(
            uniswapV2Factory,
            path[0],
            path[1]
        );
        if (!existsPairPool) {
            return false;
        }
        uint256[] memory amounts = getAmountsOut(
            uniswapV2Factory,
            amountIn,
            path
        );
        return amounts[amounts.length - 1] >= minAmountOut;
    }

    function getAmountOut(
        uint amountIn,
        uint reserveIn,
        uint reserveOut
    ) internal pure returns (uint amountOut) {
        if (amountIn == 0) {
            revert InsufficientInputAmount();
        }
        if (reserveIn == 0 || reserveOut == 0) {
            revert InsufficientLiquidity();
        }
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function getAmountsOut(
        address factory,
        uint amountIn,
        address[] memory path
    ) internal view returns (uint[] memory amounts) {
        if (path.length < 2) {
            revert InvalidPath();
        }
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            (uint reserveIn, uint reserveOut) = getReserves(
                factory,
                path[i],
                path[i + 1]
            );
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    // fetches and sorts the reserves for a pair
    function getReserves(
        address factory,
        address tokenA,
        address tokenB
    ) internal view returns (uint reserveA, uint reserveB) {
        (address token0, ) = sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1, ) = IUniswapV2Pair(
            pairFor(factory, tokenA, tokenB)
        ).getReserves();
        (reserveA, reserveB) = tokenA == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    function pairFor(
        address factory,
        address tokenA,
        address tokenB
    ) internal view returns (address pair) {
        pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);
    }
}
