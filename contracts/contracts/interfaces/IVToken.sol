// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IVToken {
    function mint(uint mintAmount) external returns (uint);

    function redeemUnderlying(uint redeemTokens) external returns (uint);

    function balanceOf(address account) external view returns (uint256);

    function exchangeRateStored() external view returns (uint256);

    function decimals() external view returns (uint8);
}
