// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IStrategy {
    function invest(uint256 amount, uint256 minimumOut) external;

    function withdraw(
        uint256 _fraction,
        uint256 minAmountOut
    ) external returns (uint256);

    function depositFromOldStrategy(
        uint256 amount,
        uint256 minimumOut,
        uint256 _executionNonce,
        bytes32 _crossChainTxId
    ) external payable;

    function totalUnderlyingAssets() external view returns (uint256);

    function amanaVault() external view returns (address);

    function checkRewards() external view returns (uint256);
}
