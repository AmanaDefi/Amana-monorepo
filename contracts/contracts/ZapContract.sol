// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IWZETA.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import "./libraries/SwapHelperLibEddy.sol";

contract ZapContract {
    using SwapHelperLibEddy for address;
    using Address for address payable;
    using SafeERC20 for IERC20;

    address public owner;

    IWETH9 constant wZeta = IWETH9(SwapHelperLibEddy.WZETA_TOKEN);

    event ZapDeposit(
        address indexed user,
        uint256 amountIn,
        uint256 vaultShares
    );
    event ZapWithdraw(address indexed user, uint256 amount, address receiver);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Swaps a specific amount of tokens for another token.
     * @dev Determines the swap path and uses Uniswap V2 to execute the swap.
     * @param zrc20 The address of the input token.
     * @param amount The amount of input tokens to swap.
     * @param targetZRC20 The address of the output token.
     * @param slippageBps The slippage tolerance in basis points (e.g., 50 for 0.5%).
     * @param maxDeadline The maximum deadline for the swap to complete.
     * @return The amount of output tokens received.
     * @custom:reverts InsufficientLiquidity if no valid liquidity pool exists for the token pair.
     */
    function swap(
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint16 slippageBps,
        uint16 maxDeadline
    ) internal returns (uint256) {
        uint256 minimumOut = SwapHelperLibEddy.calculateMinAmountOut(
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
                    minimumOut // Minimum amount of output token to receive
                );
        } else {
            address[] memory path = SwapHelperLibEddy.getPath(
                zrc20,
                targetZRC20
            );

            IZRC20(zrc20).approve(SwapHelperLibEddy.UNISWAP_V2_ROUTER, amount);
            // Perform the swap
            uint256[] memory amounts = IUniswapV2Router02(
                SwapHelperLibEddy.UNISWAP_V2_ROUTER
            ).swapExactTokensForTokens(
                    amount,
                    minimumOut,
                    path,
                    address(this),
                    block.timestamp + maxDeadline
                );

            return amounts[amounts.length - 1];
        }
    }

    // Function to zap tokens into the vault
    function zapDeposit(
        address inputToken,
        address vault,
        address vaultAsset,
        uint256 amount,
        address receiver,
        uint16 slippage
    ) external payable {
        uint256 swappedAmount = amount;
        if (inputToken != vaultAsset) {
            if (inputToken == address(0)) {
                // Native ZETA
                require(msg.value == amount, "Incorrect ZETA amount sent");
                wZeta.deposit{value: msg.value}();
                swappedAmount = swap(
                    address(wZeta),
                    amount,
                    vaultAsset,
                    slippage,
                    200
                );
            } else {
                // ZRC20 tokens
                IERC20(inputToken).safeTransferFrom(
                    msg.sender,
                    address(this),
                    amount
                );
                swappedAmount = swap(
                    inputToken,
                    amount,
                    vaultAsset,
                    slippage,
                    200
                );
            }
        }
        IERC20(vaultAsset).approve(vault, swappedAmount);
        IERC4626(vault).deposit(swappedAmount, receiver);

        emit ZapDeposit(msg.sender, amount, swappedAmount);
    }

    // Function to zap vault assets back to the user in the desired token
    function zapSwapAndReturnToUser(
        uint256 amount,
        address vault,
        address vaultAsset,
        address withdrawZRC20,
        uint16 slippage,
        address receiver
    ) external {
        SafeERC20.safeTransferFrom(
            IERC20(vaultAsset),
            vault,
            address(this),
            amount
        );
        uint256 swappedAmount = amount;
        if (withdrawZRC20 == vaultAsset) {
            SafeERC20.safeTransfer(IERC20(vaultAsset), receiver, amount);
        } else {
            if (withdrawZRC20 == address(0)) {
                // Native ZETA
                swappedAmount = swap(
                    vaultAsset,
                    amount,
                    SwapHelperLibEddy.WZETA_TOKEN,
                    slippage,
                    200
                );
                wZeta.withdraw(swappedAmount);
                payable(receiver).sendValue(swappedAmount);
            } else {
                // ZRC20 tokens
                swappedAmount = swap(
                    vaultAsset,
                    amount,
                    withdrawZRC20,
                    slippage,
                    200
                );
                SafeERC20.safeTransfer(
                    IERC20(withdrawZRC20),
                    receiver,
                    swappedAmount
                );
            }
        }

        emit ZapWithdraw(msg.sender, swappedAmount, receiver);
    }

    // Emergency function to recover tokens sent by mistake
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner).sendValue(amount);
        } else {
            IERC20(token).safeTransfer(owner, amount);
        }
    }

    // Fallback function to receive ZETA
    receive() external payable {}
}
