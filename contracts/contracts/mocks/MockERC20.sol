// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20
/// @notice A mock implementation of the ERC20 token standard with minting functionality.
contract MockERC20 is ERC20 {
    uint8 private _customDecimals;

    /// @notice Constructor to initialize the MockERC20 token.
    /// @param name The name of the token.
    /// @param symbol The symbol of the token.
    /// @param decimals_ The number of decimals for the token.
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _customDecimals = decimals_;
    }

    /// @notice Returns the number of decimals used to get its user representation.
    /// @return The number of decimals.
    function decimals() public view override returns (uint8) {
        return _customDecimals;
    }

    /// @notice Mints new tokens to a specified address.
    /// @param to The address to receive the minted tokens.
    /// @param amount The amount of tokens to mint.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
