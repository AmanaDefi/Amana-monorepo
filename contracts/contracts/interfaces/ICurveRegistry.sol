// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface ICurveRegistry {
    function find_pool_for_coins(
        address tokenAddress1,
        address tokenAddress2,
        uint256 curveVersion
    ) external view returns (address);
}
