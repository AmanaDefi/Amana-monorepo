// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IErrors.sol";

contract GasTank is Ownable2Step, IErrors {
    using SafeERC20 for IERC20;
    mapping(address => bool) public authorizedVaults;
    event VaultAuthorized(address indexed vault);
    event VaultDeauthorized(address indexed vault);
    event GasTokenProvided(
        address indexed vault,
        address indexed token,
        uint256 amount
    );

    constructor() Ownable(msg.sender) {}

    modifier onlyAuthorized() {
        if (!authorizedVaults[msg.sender]) revert NotAuthorized();
        _;
    }

    // Authorize a vault to use this GasTank
    function authorizeVault(address vault) external onlyOwner {
        if (authorizedVaults[vault]) revert VaultAlreadyAuthorized();
        authorizedVaults[vault] = true;
        emit VaultAuthorized(vault);
    }

    // Deauthorize a vault
    function deauthorizeVault(address vault) external onlyOwner {
        if (!authorizedVaults[vault]) revert VaultNotAuthorized();
        authorizedVaults[vault] = false;
        emit VaultDeauthorized(vault);
    }

    // Allows an authorized vault to request ZRC20 tokens for gas fees
    function getGas(
        address zrc20Token,
        uint256 amount
    ) external onlyAuthorized {
        uint256 balance = IERC20(zrc20Token).balanceOf(address(this));
        if (balance <= amount) revert InsufficientBalance();

        SafeERC20.safeTransfer(IERC20(zrc20Token), msg.sender, amount);

        emit GasTokenProvided(msg.sender, zrc20Token, amount);
    }

    // Withdraw unused ZRC20 tokens (only callable by the contract owner)
    function withdrawGasToken(
        address zrc20Token,
        uint256 amount
    ) external onlyOwner {
        uint256 balance = IERC20(zrc20Token).balanceOf(address(this));
        if (balance <= amount) revert InsufficientBalance();
        SafeERC20.safeTransfer(IERC20(zrc20Token), msg.sender, amount);
    }
}
