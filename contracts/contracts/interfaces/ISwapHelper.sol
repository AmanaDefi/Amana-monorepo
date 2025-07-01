// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.26;

interface ISwapHelper {
    /// @notice Swaps a specified amount of ZRC20 tokens for another ZRC20 token.
    /// @param zrc20 The address of the ZRC20 token to swap from.
    /// @param amount The amount of ZRC20 tokens to swap.
    /// @param targetZRC20 The address of the ZRC20 token to swap to.
    /// @param slippageBps The maximum slippage allowed in basis points.
    /// @param vault The address of the vault to use for the swap.
    /// @param maxDeadline The maximum deadline for the swap in seconds.
    function swap(
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint16 slippageBps,
        address vault,
        uint256 maxDeadline,
        bytes calldata data
    ) external returns (uint256 amountOut);

    /// @notice Swaps a specified amount of ZRC20 tokens for another ZRC20 token.
    /// @param zrc20 The address of the ZRC20 token to swap from.
    /// @param amount The amount of ZRC20 tokens to swap.
    /// @param targetZRC20 The address of the ZRC20 token to swap to.
    /// @param slippageBps The maximum slippage allowed in basis points.
    /// @param vault The address of the vault to use for the swap.
    /// @param maxDeadline The maximum deadline for the swap in seconds.
    function swapViaUniV4(
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint16 slippageBps,
        address vault,
        uint256 maxDeadline,
        bytes calldata data
    ) external returns (uint256 amountOut);

    /// @notice Swaps a specified amount of ZRC20 tokens for another ZRC20 token.
    /// @param zrc20 The address of the ZRC20 token to swap from.
    /// @param amount The amount of ZRC20 tokens to swap.
    /// @param targetZRC20 The address of the ZRC20 token to swap to.
    /// @param slippageBps The maximum slippage allowed in basis points.
    /// @param vault The address of the vault to use for the swap.
    /// @param maxDeadline The maximum deadline for the swap in seconds.
    function swapViaUniV3SpecificIntermediateToken(
        address zrc20,
        address intermediateToken,
        uint256 amount,
        address targetZRC20,
        uint16 slippageBps,
        address vault,
        uint256 maxDeadline,
        bytes calldata data
    ) external returns (uint256 amountOut);

    /// @notice Swaps a specified amount of ZRC20 tokens for another ZRC20 token.
    /// @param zrc20 The address of the ZRC20 token to swap from.
    /// @param amount The amount of ZRC20 tokens to swap.
    /// @param targetZRC20 The address of the ZRC20 token to swap to.
    /// @param slippageBps The maximum slippage allowed in basis points.
    /// @param vault The address of the vault to use for the swap.
    /// @param maxDeadline The maximum deadline for the swap in seconds.
    function swapViaUniV3SpecificIntermediateTokens(
        address zrc20,
        address intermediateToken1,
        address intermediateToken2,
        uint256 amount,
        address targetZRC20,
        uint16 slippageBps,
        address vault,
        uint256 maxDeadline,
        bytes calldata data
    ) external returns (uint256 amountOut);

    /// @notice Swaps an amount of ZRC20 tokens for a specified amount ofanother ZRC20 token, with the option to specify a maximum amount in.
    /// @param zrc20 The address of the ZRC20 token to swap from.
    /// @param amountOut The amount of ZRC20 tokens to swap for.
    /// @param targetZRC20 The address of the ZRC20 token to swap to.
    /// @param slippageBps The maximum slippage allowed in basis points.
    /// @param vault The address of the vault to use for the swap.
    /// @param maxDeadline The maximum deadline for the swap in seconds.
    /// @param data Additional data for the swap.
    /// @return amountIn The amount of ZRC20 tokens swapped in.
    function swapExactOut(
        uint256 totalAmountAvailable,
        address zrc20,
        uint256 amountOut,
        address targetZRC20,
        uint16 slippageBps,
        address vault,
        uint16 maxDeadline,
        bytes calldata data
    ) external returns (uint256 amountIn);

    function getPathV3(
        address zrc20,
        address targetZRC20
    )
        external
        view
        returns (
            address[] memory path,
            uint24[] memory feeTiers,
            bytes memory /* encodedPath */
        );

    function getAmountOutV3(
        uint256 amountIn,
        address[] memory path,
        uint24[] memory feeTiers
    ) external view returns (uint256 amountOut);

    function swapViaBalancerPool(
        address inputToken,
        address wrappedInputToken,
        address outputToken,
        uint256 amount,
        uint256 minimumOut,
        address receiver,
        uint256 maxDeadline,
        address pool
    ) external returns (uint256 amountOut);

    function getEquivalentInputAmount(
        address inputToken,
        address gasToken,
        uint256 gasFee
    ) external view returns (uint256 inputAmount);
}
