// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IPriceOracle {
    function fetchPrice(bytes32) external view returns (uint256);
}
