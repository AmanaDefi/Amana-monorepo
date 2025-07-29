// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPancakeDistributor {
    struct ClaimParams {
        address token;
        uint256 amount;
        bytes32[] proof;
    }

    function claim(ClaimParams[] calldata claimParams) external;
}
