// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface ISwapHelper {
    function swapExactTokensForTokens(
        address router,
        address factory,
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint256 minAmountOut,
        address to
    ) external returns (uint256);
}
