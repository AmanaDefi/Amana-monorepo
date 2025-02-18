// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IZapContract {
    // Events
    event ZapDeposit(
        address indexed user,
        uint256 amountIn,
        uint256 vaultShares
    );
    event ZapWithdraw(
        address indexed user,
        uint256 vaultShares,
        uint256 amountOut
    );

    // External Functions

    /**
     * @notice Zaps tokens into the vault after swapping if necessary.
     * @param inputToken The address of the token being deposited (use address(0) for native ZETA).
     * @param amount The amount of tokens to deposit.
     * @param receiver The address of the user receiving the vault shares.
     * @param slippage The slippage tolerance in basis points.
     */
    function zapDeposit(
        address inputToken,
        uint256 amount,
        address receiver,
        uint16 slippage
    ) external payable;

    /**
     * @notice Withdraws vault shares, swaps the assets to the desired token, and returns to the user.
     * @param amount The amount that has been withdrawn.
     * @param withdrawZRC20 The address of the token to send back to receiver (use address(0) for native ZETA).
     * @param slippage The slippage tolerance in basis points.
     * @param receiver The address of the user receiving the output tokens.
     */
    function zapSwapAndReturnToUser(
        uint256 amount,
        address vault,
        address vaultAsset,
        address withdrawZRC20,
        uint16 slippage,
        address receiver
    ) external;

    /**
     * @notice Emergency function to recover tokens mistakenly sent to the contract.
     * @param token The address of the token to recover (use address(0) for native ZETA).
     * @param amount The amount of tokens to recover.
     */
    function rescueTokens(address token, uint256 amount) external;

    // View Functions

    /**
     * @notice Returns the address of the connected vault.
     * @return The vault contract address.
     */
    function vault() external view returns (address);

    /**
     * @notice Returns the address of the vault asset.
     * @return The vault asset address.
     */
    function vaultAsset() external view returns (address);

    /**
     * @notice Returns the address of the contract owner.
     * @return The owner's address.
     */
    function owner() external view returns (address);
}
