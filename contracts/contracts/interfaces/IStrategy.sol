// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IStrategy {
    function invest(uint256 amount) external;

    function withdraw(
        uint256 _amount,
        uint256 _fraction
    ) external returns (uint256);

    function totalUnderlyingAssets() external view returns (uint256);
}
