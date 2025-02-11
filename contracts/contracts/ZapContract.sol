// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./libraries/SwapHelperLibEddy.sol";
import "./AmanaConnectedChainVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract AmanaZap {
    using SwapHelperLibEddy for address;
    using Address for address payable;

    AmanaConnectedChainVault public vault;
    address public vaultAsset;
    address public owner;

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

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor(address _vault) {
        vault = AmanaConnectedChainVault(_vault);
        vaultAsset = address(vault.asset());
        owner = msg.sender;
    }

    /**
     * @notice Swaps a specific amount of tokens for another token.
     * @dev Determines the swap path and uses Uniswap V2 to execute the swap.
     * @param zrc20 The address of the input token.
     * @param amount The amount of input tokens to swap.
     * @param targetZRC20 The address of the output token.
     * @param slippageBps The slippage tolerance in basis points (e.g., 50 for 0.5%).
     * @param vault The address where the swapped tokens will be sent.
     * @param maxDeadline The maximum deadline for the swap to complete.
     * @return The amount of output tokens received.
     * @custom:reverts InsufficientLiquidity if no valid liquidity pool exists for the token pair.
     */
    function swap(
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint16 slippageBps,
        address vault,
        uint16 maxDeadline
    ) internal returns (uint256) {
        uint256 minAmountOut = SwapHelperLibEddy.calculateMinAmountOut(
            zrc20,
            targetZRC20,
            amount,
            slippageBps
        );
        if (
            SwapHelperLibEddy.isInEddy4Pool(zrc20) &&
            SwapHelperLibEddy.isInEddy4Pool(targetZRC20)
        ) {
            uint256 inputIndex = SwapHelperLibEddy.getTokenIndex(zrc20);
            uint256 outputIndex = SwapHelperLibEddy.getTokenIndex(targetZRC20);

            // Approve Curve pool to spend your tokens
            IZRC20(zrc20).approve(SwapHelperLibEddy.CURVE_POOL, amount);

            // Perform the swap
            return
                ICurvePool(SwapHelperLibEddy.CURVE_POOL).exchange(
                    inputIndex, // Index of input token
                    outputIndex, // Index of output token
                    amount, // Amount of input token
                    minAmountOut // Minimum amount of output token to receive
                );
        } else {
            address[] memory path = SwapHelperLibEddy.getPath(
                zrc20,
                targetZRC20
            );

            IZRC20(zrc20).approve(UNISWAP_V2_ROUTER, amount);
            // Perform the swap
            uint256[] memory amounts = IUniswapV2Router02(UNISWAP_V2_ROUTER)
                .swapExactTokensForTokens(
                    amount,
                    minAmountOut,
                    path,
                    vault,
                    block.timestamp + maxDeadline
                );

            return amounts[amounts.length - 1];
        }
    }

    // Function to zap tokens into the vault
    function zapDeposit(
        address inputToken,
        uint256 amount,
        address receiver,
        uint256 minAmountOut
    ) external payable {
        uint256 swappedAmount;

        if (inputToken == address(0)) {
            // Native ZETA
            require(msg.value == amount, "Incorrect ZETA amount sent");
            swappedAmount = SwapHelperLibEddy.swapZetaToVaultAsset(
                amount,
                vaultAsset,
                minAmountOut
            );
        } else {
            // ZRC20 tokens
            IERC20(inputToken).transferFrom(msg.sender, address(this), amount);
            swappedAmount = SwapHelperLibEddy.swapZRC20ToVaultAsset(
                inputToken,
                vaultAsset,
                amount,
                minAmountOut
            );
        }

        IERC20(vaultAsset).approve(address(vault), swappedAmount);
        vault.deposit(swappedAmount, receiver);

        emit ZapDeposit(msg.sender, amount, swappedAmount);
    }

    // Function to zap vault assets back to the user in the desired token
    function zapWithdraw(
        uint256 vaultShares,
        address outputToken,
        uint256 minAmountOut
    ) external {
        // Transfer vault shares from the user to the Zap contract
        IERC20(address(vault)).transferFrom(
            msg.sender,
            address(this),
            vaultShares
        );

        // Withdraw the vault assets; now the Zap contract owns the shares
        vault.withdraw(vaultShares, address(this), address(this));

        uint256 vaultAssetBalance = IERC20(vaultAsset).balanceOf(address(this));
        uint256 swappedAmount;

        if (outputToken == address(0)) {
            // Convert to native ZETA
            swappedAmount = SwapHelperLibEddy.swapVaultAssetToZeta(
                vaultAssetBalance,
                vaultAsset,
                minAmountOut
            );
            require(swappedAmount >= minAmountOut, "Slippage exceeded");
            payable(msg.sender).sendValue(swappedAmount);
        } else {
            // Convert to ZRC20 token
            swappedAmount = SwapHelperLibEddy.swapVaultAssetToZRC20(
                vaultAsset,
                outputToken,
                vaultAssetBalance,
                minAmountOut
            );
            require(swappedAmount >= minAmountOut, "Slippage exceeded");
            IERC20(outputToken).transfer(msg.sender, swappedAmount);
        }

        emit ZapWithdraw(msg.sender, vaultShares, swappedAmount);
    }

    // Emergency function to recover tokens sent by mistake
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner).sendValue(amount);
        } else {
            IERC20(token).transfer(owner, amount);
        }
    }

    // Fallback function to receive ZETA
    receive() external payable {}
}
