// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IAerodromeSlipstreamPool {
    /// @notice The pool's swap & flash fee in pips, i.e. 1e-6
    /// @dev Can be modified in PoolFactory on a pool basis or upgraded to be dynamic.
    /// @return The swap & flash fee
    function fee() external view returns (uint24);
}
