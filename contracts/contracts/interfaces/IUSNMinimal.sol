// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Minimal interface for the USN token needed by Amana.
/// @dev Extends IERC20 and exposes USN-specific `mint` plus common metadata views.
///      The `mint` function in the ABI is nonpayable and has no return value.
interface IUSNMinimal is IERC20 {
    // --- USN-specific ---

    /// @notice Mint `amount` tokens to `to`.
    /// @dev Callable only by the contract's authorized minter/admin (enforced in USN implementation).
    function mint(address to, uint256 amount) external;

    // --- Optional metadata (not part of bare IERC20, but present in USN ABI) ---

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);

    // --- (Optional) admin inquiry, include if you need to check who can mint ---

    // function admin() external view returns (address);
}
