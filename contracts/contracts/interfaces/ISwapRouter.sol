// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.26;

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn; // The token being swapped in
        address tokenOut; // The token being swapped out
        uint24 fee; // The fee to pay
        address recipient; // The recipient of the output tokens
        // uint256 deadline; // The deadline for the swap to be executed
        uint256 amountIn; // The amount of input tokens
        uint256 amountOutMinimum; // The minimum amount of output tokens to receive
        uint160 sqrtPriceLimitX96; // The price limit for the swap
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        // uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        // uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 limitSqrtPrice;
    }

    struct ExactOutputParams {
        bytes path;
        address recipient;
        // uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    /**
     * @notice Performs a single exact input swap
     * @param params The parameters for the swap
     * @return amountOut The amount of output tokens received
     */
    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);

    /**
     * @notice Performs a multi-hop exact input swap
     * @param params The parameters for the swap
     * @return amountOut The amount of output tokens received
     */
    function exactInput(
        ExactInputParams calldata params
    ) external payable returns (uint256 amountOut);

    /**
     * @notice Performs a single exact output swap
     * @param params The parameters for the swap
     * @return amountIn The amount of input tokens used
     */
    function exactOutputSingle(
        ExactOutputSingleParams calldata params
    ) external payable returns (uint256 amountIn);

    /// @notice Swaps as little as possible of one token for `amountOut` of another along the specified path (reversed)
    /// @param params The parameters necessary for the multi-hop swap, encoded as `ExactOutputParams` in calldata
    /// @return amountIn The amount of the input token
    function exactOutput(
        ExactOutputParams calldata params
    ) external payable returns (uint256 amountIn);

    /**
     * @notice Callback function for Algebra swaps
     * @param amount0Delta The change in token0 balance
     * @param amount1Delta The change in token1 balance
     * @param data Additional data passed to the callback
     */
    function algebraSwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external;
}
