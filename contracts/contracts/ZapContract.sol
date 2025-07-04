// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IWZETA.sol";

// import "./SwapHelper.sol";
import "./interfaces/IAmanaVault.sol";
import "./interfaces/ISwapHelper.sol";
import "./interfaces/IAmanaRegistry.sol";
import "./interfaces/IErrors.sol";

contract ZapContract {
    using Address for address payable;
    using SafeERC20 for IERC20;

    address public owner;
    address public registry;

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

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Updates the swap helper address for the vault. Can only be called by the owner.
     * @param _registry The address of the new swap helper.
     * @notice Reverts if the swap helper address is zero.
     */
    function updateRegistryAddress(address _registry) external onlyOwner {
        if (_registry == address(0)) revert IErrors.InvalidAddress();
        registry = _registry;
    }

    /**
     * @dev Swaps tokens using the swap helper contract.
     * @param zrc20 The address of the token to swap from.
     * @param amount The amount of tokens to swap.
     * @param targetZRC20 The address of the token to swap to.
     * @param slippageBps The slippage in basis points (100 bps = 1%).
     * @param maxDeadline The maximum deadline for the swap.
     * @return amountOut The amount of tokens received after the swap.
     */
    function swap(
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint16 slippageBps,
        uint16 maxDeadline
    ) internal returns (uint256 amountOut) {
        if (IAmanaRegistry(registry).swapHelper() == address(0))
            revert IErrors.InvalidAddress();
        // Step 1: Transfer tokens to the helper contract
        SafeERC20.safeTransfer(
            IERC20(zrc20),
            IAmanaRegistry(registry).swapHelper(),
            amount
        );

        amountOut = ISwapHelper(IAmanaRegistry(registry).swapHelper()).swap(
            zrc20,
            amount,
            targetZRC20,
            slippageBps,
            address(this),
            maxDeadline,
            "" // empty bytes param for future-proofing
        );
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
