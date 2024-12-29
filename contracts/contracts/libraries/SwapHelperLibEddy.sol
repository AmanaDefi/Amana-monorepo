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
            token == USDC_ETH_ADDRESS ||
            token == USDT_ETH_ADDRESS ||
            token == USDC_BSC_ADDRESS;
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

    /**
     * @notice Computes the address of a Uniswap V2 pair for two tokens.
     * @dev Uses Uniswap's init code hash to derive the pair address.
     * @param tokenA The first token address.
     * @param tokenB The second token address.
     * @return pair The address of the Uniswap V2 pair for the tokens.
     */ function uniswapv2PairFor(
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

    /**
     * @notice Swaps a specific amount of tokens for another token.
     * @dev Determines the swap path and uses Uniswap V2 to execute the swap.
     * @param zrc20 The address of the input token.
     * @param amount The amount of input tokens to swap.
     * @param targetZRC20 The address of the output token.
     * @param slippageBps The slippage tolerance in basis points (e.g., 50 for 0.5%).
     * @param vault The address where the swapped tokens will be sent.
     * @param maxDeadline The maximum deadline for the swap to complete.
     * @return The amount of output tokens received.
     * @custom:reverts InsufficientLiquidity if no valid liquidity pool exists for the token pair.
     */
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

    /**
     * @notice Checks if a liquidity pool exists for two tokens.
     * @dev Verifies the balance of both tokens in the Uniswap V2 pair contract.
     * @param zrc20A The address of the first token.
     * @param zrc20B The address of the second token.
     * @return True if the liquidity pool exists, false otherwise.
     */
    function _existsPairPool(
        address zrc20A,
        address zrc20B
    ) internal view returns (bool) {
        address uniswapPool = uniswapv2PairFor(zrc20A, zrc20B);
        return
            IZRC20(zrc20A).balanceOf(uniswapPool) > 0 &&
            IZRC20(zrc20B).balanceOf(uniswapPool) > 0;
    }

    /**
     * @notice Checks if sufficient liquidity exists for a token swap.
     * @dev Validates liquidity and calculates output using Uniswap's formula.
     * @param amountIn The amount of input tokens.
     * @param minAmountOut The minimum acceptable output amount.
     * @param path The token swap path.
     * @return True if sufficient liquidity exists, false otherwise.
     * @custom:reverts InvalidPathLength if the path length is not exactly 2.
     */
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

    /**
     * @notice Calculates the output amount for a given input amount and reserves.
     * @dev Uses Uniswap's constant product formula with a fee factor.
     * @param amountIn The amount of input tokens.
     * @param reserveIn The reserve of the input token in the pool.
     * @param reserveOut The reserve of the output token in the pool.
     * @return amountOut The amount of output tokens.
     * @custom:reverts InsufficientInputAmount if `amountIn` is zero.
     * @custom:reverts InsufficientLiquidity if either reserve is zero.
     */
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

    /**
     * @notice Calculates the output amounts for a series of token swaps.
     * @dev Iterates over the path to calculate the amount for each swap step.
     * @param amountIn The amount of input tokens.
     * @param path The token swap path.
     * @return amounts An array of output amounts for each swap step.
     * @custom:reverts InvalidPath if the path length is less than 2.
     */
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

    /**
     * @notice Fetches and sorts the reserves for a token pair.
     * @dev Uses the Uniswap V2 pair contract to retrieve reserve data.
     * @param tokenA The address of the first token.
     * @param tokenB The address of the second token.
     * @return reserveA The reserve of tokenA.
     * @return reserveB The reserve of tokenB.
     */
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

    /**
     * @notice Fetches the address of the Uniswap V2 pair for two tokens.
     * @dev Calls the Uniswap V2 factory to retrieve the pair address.
     * @param tokenA The address of the first token.
     * @param tokenB The address of the second token.
     * @return pair The address of the Uniswap V2 pair contract.
     */
    function pairFor(
        address tokenA,
        address tokenB
    ) internal view returns (address pair) {
        pair = IUniswapV2Factory(UNISWAP_V2_FACTORY).getPair(tokenA, tokenB);
    }
}
