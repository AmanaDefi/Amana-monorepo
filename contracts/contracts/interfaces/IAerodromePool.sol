// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IAerodromePool {
    /// @notice Get the amount of tokenOut given the amount of tokenIn
    /// @param amountIn Amount of token in
    /// @param tokenIn  Address of token
    /// @return Amount out
    function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256);
}
