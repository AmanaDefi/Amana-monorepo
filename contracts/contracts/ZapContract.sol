// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IWZETA.sol";

import "./SwapHelper.sol";
import "./interfaces/IAmanaVault.sol";
import "./interfaces/ISwapRouter.sol";

contract ZapContract {
    using Address for address payable;
    using SafeERC20 for IERC20;

    address public owner;
    address public swapHelper;

    IWETH9 constant wZeta = IWETH9(0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf);

    event ZapDeposit(
        address indexed user,
        uint256 amountIn,
        uint256 minSharesOut,
        uint256 vaultShares
    );
    event ZapWithdraw(address indexed user, uint256 amount, address receiver);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor(address _swapHelper) {
        swapHelper = _swapHelper;
        owner = msg.sender;
    }

    /**
     * @dev Updates the swap helper address for the vault. Can only be called by the owner.
     * @param _swapHelper The address of the new swap helper.
     * @notice Reverts if the swap helper address is zero.
     */
    function updateSwapHelperAddress(address _swapHelper) external onlyOwner {
        if (_swapHelper == address(0)) revert IErrors.InvalidAddress();
        swapHelper = _swapHelper;
    }

    /**
     * @notice Swaps a specific amount of tokens for another token.
     * @dev Determines the swap path and uses Uniswap V2 to execute the swap.
     * @param zrc20 The address of the input token.
     * @param amount The amount of input tokens to swap.
     * @param targetZRC20 The address of the output token.
     * @param slippageBps The slippage tolerance in basis points (e.g., 50 for 0.5%).
     * @param maxDeadline The maximum deadline for the swap to complete.
     * @return amountOut The amount of output tokens received.
     * @custom:reverts InsufficientLiquidity if no valid liquidity pool exists for the token pair.
     */
    function swap(
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint16 slippageBps,
        uint16 maxDeadline
    ) internal returns (uint256 amountOut) {
        bytes memory data = abi.encodeWithSignature(
            "swap(address,uint256,address,uint16,address,uint16,bytes)",
            zrc20,
            amount,
            targetZRC20,
            slippageBps,
            address(this),
            maxDeadline,
            "" // empty bytes param for future-proofing
        );
        amountOut = _delegateCall(swapHelper, data);
    }

    // Internal function for delegatecall
    function _delegateCall(
        address logicContract,
        bytes memory data
    ) internal returns (uint256) {
        (bool success, bytes memory result) = logicContract.delegatecall(data);
        require(success, "Delegatecall failed");
        return abi.decode(result, (uint256));
    }

    // Function to zap tokens into the vault
    function zapDeposit(
        address inputToken,
        address vault,
        address vaultAsset,
        uint256 amount,
        uint256 minSharesOut,
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
                    inputToken,
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
        IAmanaVault(vault).deposit(swappedAmount, minSharesOut, receiver);

        emit ZapDeposit(msg.sender, amount, minSharesOut, swappedAmount);
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
                    address(wZeta),
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
