// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "../interfaces/ISwapRouter.sol";
import "../interfaces/IAlgebraFactory.sol";
import "../interfaces/IZRC20.sol";
import "../interfaces/IErrors.sol";
import "../interfaces/IAlgebraPool.sol";
import "../interfaces/ITickMath.sol";
import "hardhat/console.sol";

address constant WZETA_TOKEN = 0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf;

library SwapHelperLibBeam {
    function sortTokens(
        address tokenA,
        address tokenB
    ) internal pure returns (address token0, address token1) {
        if (tokenA == tokenB) revert IErrors.InvalidAddress();
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        if (token0 == address(0)) revert IErrors.InvalidAddress();
    }

    function algebraPairFor(
        address factory,
        address tokenA,
        address tokenB
    ) internal view returns (address pool) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        console.log("token0: %s, token1: %s", token0, token1);

        pool = IAlgebraFactory(factory).poolByPair(token0, token1);
    }

    function swapExactTokensForTokens(
        address router,
        address factory,
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint256 minimumOut,
        address vault,
        uint16 maxDeadline
    ) internal returns (uint256) {
        console.log("zrc20: %s, targetZRC20: %s", zrc20, targetZRC20);
        address pool = algebraPairFor(factory, zrc20, targetZRC20);
        console.log("pool: %s", pool);
        console.log("msg.sender: %s", msg.sender);
        if (pool != address(0)) {
            console.log("Direct pool exists");
            // Direct pool exists
            ISwapRouter.ExactInputSingleParams memory singleParams = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: zrc20,
                    tokenOut: targetZRC20,
                    recipient: vault,
                    deadline: block.timestamp + maxDeadline,
                    amountIn: amount,
                    amountOutMinimum: minimumOut,
                    limitSqrtPrice: 0
                });
            console.log(
                "zrc20 balance: %s",
                IZRC20(zrc20).balanceOf(address(this))
            );
            IZRC20(zrc20).approve(router, amount);
            return ISwapRouter(router).exactInputSingle(singleParams);
        } else {
            // Check for intermediate pools via Zeta token
            console.log("Checking for intermediate pools via Zeta token");
            address poolToZeta = algebraPairFor(factory, zrc20, WZETA_TOKEN);
            address poolFromZeta = algebraPairFor(
                factory,
                WZETA_TOKEN,
                targetZRC20
            );

            if (poolToZeta == address(0) || poolFromZeta == address(0)) {
                revert IErrors.InsufficientLiquidity();
            }

            // Build path for intermediate swap: input -> Zeta -> target
            address[] memory path = new address[](3);
            path[0] = zrc20;
            path[1] = WZETA_TOKEN;
            path[2] = targetZRC20;
            console.log("path[0]", path[0]);
            console.log("path[1]", path[1]);
            console.log("path[2]", path[2]);
            console.log("vault: %s", vault);
            console.log("amount: %s", amount);

            ISwapRouter.ExactInputParams memory params;
            params = ISwapRouter.ExactInputParams({
                path: abi.encodePacked(zrc20, WZETA_TOKEN, targetZRC20),
                recipient: vault,
                deadline: block.timestamp + maxDeadline,
                amountIn: amount,
                amountOutMinimum: minimumOut
            });
            console.log("Approving ZRC20");
            IZRC20(zrc20).approve(router, amount);
            console.log(
                "zrc20 balance: %s",
                IZRC20(zrc20).balanceOf(address(this))
            );
            console.log("Swapping via Zeta token");
            try
                ISwapRouter(router).exactInput{value: 2000000000000000000}(
                    params
                )
            returns (uint256 amountOut) {
                console.log("Swap successful, output amount: ", amountOut);
                return amountOut;
            } catch (bytes memory reason) {
                string memory revertReason;
                if (reason.length > 0) {
                    revertReason = abi.decode(reason, (string)); // Decodes the revert reason
                    console.log(revertReason);
                } else {
                    revertReason = "Unknown error";
                    console.log("Unknown error");
                }
                revert("Swap failed");
            }
        }
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
        address factory,
        address tokenA,
        address tokenB
    ) internal view returns (uint reserveA, uint reserveB) {
        address pool = algebraPairFor(factory, tokenA, tokenB);
        if (pool == address(0)) revert IErrors.InsufficientLiquidity();
        IAlgebraPool algebraPool = IAlgebraPool(pool);
        (uint160 liquidity, , , , , , ) = algebraPool.slot0();

        uint reserve0 = liquidity; // Use liquidity as a proxy for reserves
        uint reserve1 = liquidity; // This is specific to Algebra pools

        (address token0, ) = sortTokens(tokenA, tokenB);
        (reserveA, reserveB) = tokenA == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    function getAmountsOut(
        address factory,
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
                factory,
                path[i],
                path[i + 1]
            );
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    function _existsPairPool(
        address algebraFactory,
        address zrc20A,
        address zrc20B
    ) internal view returns (bool) {
        address algebraPool = algebraPairFor(algebraFactory, zrc20A, zrc20B);
        return algebraPool != address(0);
    }
}
