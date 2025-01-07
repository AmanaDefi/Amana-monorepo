// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IEddySwapWrapper {
    // External functions

    function swapEddyTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        bytes[] calldata priceUpdate
    ) external payable returns (uint[] memory amounts);

    function swapEddyExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        bytes[] calldata priceUpdate,
        uint fee
    ) external payable returns (uint[] memory amounts);

    function swapEddyExactTokensForEth(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        bytes[] calldata priceUpdate
    ) external payable returns (uint[] memory amounts);
}
