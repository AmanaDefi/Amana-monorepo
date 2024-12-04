// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IWETH {
    function deposit() external payable;

    function withdraw(uint256) external;

    function approve(address, uint256) external returns (bool);

    function transfer(address to, uint256 value) external returns (bool);
}
