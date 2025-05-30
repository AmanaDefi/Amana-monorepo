// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBalancerCompositeLiquidityRouter {
    function addLiquidityUnbalancedToERC4626Pool(
        address pool,
        bool[] calldata wrapUnderlying,
        uint256[] calldata exactAmountsIn,
        uint256 minBptAmountOut,
        bool wethIsEth,
        bytes calldata userData
    ) external payable returns (uint256 bptAmountOut);

    function removeLiquidityProportional(
        address pool,
        uint256 exactBptAmountIn,
        uint256[] memory minAmountsOut,
        bool wethIsEth,
        bytes memory userData
    ) external payable returns (uint256[] memory amountsOut);
}
