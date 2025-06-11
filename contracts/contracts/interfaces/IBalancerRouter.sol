// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBalancerRouter {
    /**
     * @notice Add liquidity to a pool with unbalanced token inputs.
     * @param pool The address of the pool.
     * @param exactAmountsIn The exact amounts of each token to deposit.
     * @param minBptAmountOut The minimum acceptable amount of BPT (pool tokens) to receive.
     * @param wethIsEth Whether WETH should be unwrapped to ETH.
     * @param userData Optional user-defined data (usually empty).
     * @return bptAmountOut The amount of BPT tokens received.
     */
    function addLiquidityUnbalanced(
        address pool,
        uint256[] memory exactAmountsIn,
        uint256 minBptAmountOut,
        bool wethIsEth,
        bytes memory userData
    ) external returns (uint256 bptAmountOut);

    function removeLiquiditySingleTokenExactIn(
        address pool,
        uint256 exactBptAmountIn,
        address tokenOut,
        uint256 minAmountOut,
        bool wethIsEth,
        bytes memory userData
    ) external payable returns (uint256 amountOut);

    function removeLiquidityProportional(
        address pool,
        uint256 exactBptAmountIn,
        uint256[] memory minAmountsOut,
        bool wethIsEth,
        bytes memory userData
    ) external payable returns (uint256[] memory amountsOut);
}
