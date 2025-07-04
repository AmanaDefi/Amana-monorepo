// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBalancerStablePool {
    function getTokens() external view returns (address[] memory);

    function getRate() external view returns (uint256);

    function getPoolId() external view returns (bytes32);
}
