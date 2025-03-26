// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IAerodromeRouter {
    struct Route {
        address from;
        address to;
        bool stable;
        address factory;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /// @notice Returns the pool address for a given token pair, stability preference, and factory.
    /// @param tokenA The first token in the pair.
    /// @param tokenB The second token in the pair.
    /// @param stable Whether the pool is a stable pool.
    /// @param factory The factory to check.
    /// @return pool The address of the liquidity pool.
    function poolFor(
        address tokenA,
        address tokenB,
        bool stable,
        address factory
    ) external view returns (address pool);
}
