// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IBeefyVault {
    function deposit(uint256 amount) external;

    function withdrawAll() external;

    function withdraw(uint256 shares) external;

    function getPricePerFullShare() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);
}
