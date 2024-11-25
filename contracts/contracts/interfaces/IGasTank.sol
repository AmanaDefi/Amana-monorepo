// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGasTank {
    /**
     * @dev Emitted when a vault is authorized to use the GasTank.
     */
    event VaultAuthorized(address indexed vault);

    /**
     * @dev Emitted when a vault is de-authorized from the GasTank.
     */
    event VaultDeauthorized(address indexed vault);

    /**
     * @dev Emitted when gas tokens are withdrawn by the owner.
     */
    event GasWithdrawn(address indexed token, uint256 amount);

    /**
     * @dev Authorizes a vault to use the GasTank.
     * @param vault The address of the vault to authorize.
     */
    function authorizeVault(address vault) external;

    /**
     * @dev De-authorizes a vault from using the GasTank.
     * @param vault The address of the vault to de-authorize.
     */
    function deauthorizeVault(address vault) external;

    /**
     * @dev Retrieves gas tokens for the specified vault.
     * @param gasToken The address of the gas token to retrieve.
     * @param amount The amount of gas tokens to retrieve.
     */
    function getGas(address gasToken, uint256 amount) external;

    /**
     * @dev Withdraws gas tokens from the GasTank.
     * @param token The address of the gas token to withdraw.
     * @param amount The amount of gas tokens to withdraw.
     */
    function withdrawGasTokens(address token, uint256 amount) external;
}
