// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IAerodromePoolFactory {
    function getPool(
        address tokenA,
        address tokenB,
        bool stable
    ) external view returns (address pair);
}
