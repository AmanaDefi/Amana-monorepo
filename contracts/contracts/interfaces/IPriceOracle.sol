// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IPriceOracle {
    function fetchEthUsdPrice() external view returns (uint256);
}
