// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface INoonWithdrawHelper {
    function claimWithdrawal(uint256 requestId) external;

    function getUserNextRequestId(
        address owner
    ) external view returns (uint256);
}
