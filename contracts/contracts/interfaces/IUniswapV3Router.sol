// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title IUniswapV3Router
/// @notice Interface for interacting with the Uniswap V3 router.
interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn; // Token to swap from
        address tokenOut; // Token to swap to
        uint24 fee; // Fee tier (e.g., 500 for 0.05%)
        address recipient; // Address to receive the swapped tokens
        uint256 deadline; // Timestamp for the swap deadline
        uint256 amountIn; // Amount of input tokens to swap
        uint256 amountOutMinimum; // Minimum amount of output tokens expected
        uint160 sqrtPriceLimitX96; // Price limit for slippage protection (set to 0 for no limit)
    }

    /// @notice Swaps a fixed amount of one token for as much as possible of another token.
    /// @param params Struct containing swap parameters.
    /// @return amountOut Amount of the output token received.
    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);
}
