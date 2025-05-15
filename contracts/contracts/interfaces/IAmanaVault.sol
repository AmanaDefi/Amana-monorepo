// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IAmanaVault {
    function deposit(
        uint256 assets,
        uint256 minSharesOut,
        address receiver
    ) external returns (uint256);

    function withdraw(
        uint256 assets,
        uint256 minAssetsOut,
        address receiver,
        address owner
    ) external returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function convertToAssets(uint256 shares) external view returns (uint256);

    function convertToShares(uint256 assets) external view returns (uint256);

    function maxWithdraw(address account) external view returns (uint256);

    function decreasePendingWithdrawals(address user, uint256 shares) external;

    function setStrategy(address strategy) external;
}
