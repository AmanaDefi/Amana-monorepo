// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "../interfaces/I4626Vault.sol";
import "../interfaces/IErrors.sol";
import "hardhat/console.sol";

// USDC.ETH 0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a
// Mock 4626 0xcfc479dC5371D21C52eeAd66290b21CDa2eB0C9f

/// @title Mock4626ZetachainStrategy
/// @notice A mock implementation of a 4626-compatible strategy for ZetaChain.
/// @dev This contract facilitates deposits and withdrawals into a 4626 vault via the Amana Vault.
contract Mock4626ZetachainStrategy is Ownable2Step {
    string public name;
    address public immutable amanaVault;
    IERC20 public immutable inputToken;
    I4626Vault public immutable receiptToken;

    /// @notice Emitted when funds are deposited into the vault.
    /// @param vaultAddress The address of the vault.
    /// @param amount The amount of funds deposited.
    event FundsDeposited(address vaultAddress, uint256 amount);

    /// @notice Emitted when funds are withdrawn from the vault.
    /// @param vaultAddress The address of the vault.
    /// @param amount The amount of funds withdrawn.
    event FundsWithdrawn(address vaultAddress, uint256 amount);

    /// @notice Initializes the strategy with the necessary addresses.
    /// @param _name Name of the strategy.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _inputTokenAddress Address of the input token.
    /// @param _receiptTokenAddress Address of the 4626 vault.
    constructor(
        string memory _name,
        address _amanaVault,
        address _inputTokenAddress,
        address _receiptTokenAddress
    ) Ownable(msg.sender) {
        require(_amanaVault != address(0), "Invalid amanaVault address");
        name = _name;
        amanaVault = _amanaVault;
        inputToken = IERC20(_inputTokenAddress);
        receiptToken = I4626Vault(_receiptTokenAddress);
    }

    /// @notice Ensures that only the Amana Vault can call certain functions.
    modifier onlyVault() {
        require(msg.sender == amanaVault, "Only Vault contract can call");
        _;
    }

    /// @notice Invests funds into the 4626 vault.
    /// @param amount The amount of funds to invest.
    /// @return shares The number of shares received in exchange for the deposit.
    function invest(
        uint256 amount,
        uint256 minSharesOut
    ) external onlyVault returns (uint256) {
        SafeERC20.safeTransferFrom(
            inputToken,
            msg.sender,
            address(this),
            amount
        );
        approveOrIncreaseAllowance(inputToken, address(receiptToken), amount);

        uint256 shares = receiptToken.deposit(amount, address(this));
        if (shares < minSharesOut) {
            revert IErrors.InsufficientOut();
        }
        emit FundsDeposited(msg.sender, amount);
        return shares;
    }

    /// @notice Withdraws funds from the 4626 vault.
    /// @param fractionToWithdraw The fraction of shares to withdraw.
    /// @param minAmountOut The minimum amount of funds to withdraw.
    /// @return The amount withdrawn.
    function withdraw(
        uint256 fractionToWithdraw,
        uint256 minAmountOut
    ) external onlyVault returns (uint256) {
        uint256 shares = receiptToken.balanceOf(address(this));
        console.log("Shares: %d", shares);
        console.log("Fraction to withdraw: %d", fractionToWithdraw);
        uint256 sharesToWithdraw = (shares * fractionToWithdraw) / 1e18;
        console.log("Shares to withdraw: %d", sharesToWithdraw);
        uint256 amountWithdrawn = receiptToken.redeem(
            sharesToWithdraw,
            address(this), // receiver
            address(this) // owner
        );
        if (amountWithdrawn < minAmountOut) {
            revert IErrors.InsufficientOut();
        }
        SafeERC20.safeTransfer(IERC20(inputToken), msg.sender, amountWithdrawn);

        emit FundsWithdrawn(msg.sender, amountWithdrawn);
        return amountWithdrawn;
    }

    /// @notice Gets the total underlying assets held in the strategy.
    /// @return The total underlying assets in the vault.
    function totalUnderlyingAssets() external view returns (uint256) {
        uint256 shares = receiptToken.balanceOf(address(this));
        return receiptToken.convertToAssets(shares);
    }

    /// @notice Allows the owner to withdraw ERC20 tokens in case of emergency.
    /// @param _token Address of the token to withdraw.
    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        SafeERC20.safeTransfer(IERC20(_token), owner(), balance);
    }

    function approveOrIncreaseAllowance(
        IERC20 token,
        address spender,
        uint256 amount
    ) internal {
        uint256 currentAllowance = token.allowance(msg.sender, spender);

        if (currentAllowance == 0) {
            // First-time approval
            token.approve(spender, amount);
        } else {
            // Handle USDT-like tokens by forcing reset to zero first
            token.approve(spender, 0); // Reset to zero
            token.approve(spender, amount); // Set new allowance
        }
    }

    function convertToShares(
        uint256 assetAmount
    ) public view virtual returns (uint256) {
        return receiptToken.convertToShares(assetAmount);
    }

    function convertToAssets(
        uint256 shares
    ) public view virtual returns (uint256) {
        return receiptToken.convertToAssets(shares);
    }
}
