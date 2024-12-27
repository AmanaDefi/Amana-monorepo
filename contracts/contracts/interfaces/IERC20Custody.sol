// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IERC20Custody {
    function whitelist(address token) external;

    function grantRole(bytes32 role, address account) external;
}
