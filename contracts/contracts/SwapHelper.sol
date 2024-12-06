// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";
import "@zetachain/toolkit/contracts/shared/libraries/UniswapV2Library.sol";

contract SwapHelper {
    uint16 internal constant MAX_DEADLINE = 200;

    error InvalidPathLength();
    error CantBeZeroAddress();
    error CantBeIdenticalAddresses();

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
    ) public pure returns (address pair) {
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
        address vault
    ) external returns (uint256) {
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
                revert("Insufficient liquidity for this swap path");
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
                block.timestamp + MAX_DEADLINE
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
        uint256[] memory amounts = UniswapV2Library.getAmountsOut(
            uniswapV2Factory,
            amountIn,
            path
        );
        return amounts[amounts.length - 1] >= minAmountOut;
    }
}
