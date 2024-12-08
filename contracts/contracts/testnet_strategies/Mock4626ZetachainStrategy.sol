// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/I4626Vault.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";

// ZC_TEST_USDC.SEPOLIA_ADDRESS = 0xcC683A782f4B30c138787CB5576a86AF66fdc31d;
// MOCK_4626_VAULT_ADDRESS = 0x50675d47d94724c3e9Ff80aaD9EDEb94719fC576

contract Mock4626ZetachainStrategy is Ownable {
    string public name;
    address public immutable amanaVault;
    IERC20 public immutable inputToken;
    I4626Vault public immutable receiptToken;
    address immutable _GATEWAY_ADDRESS;
    event FundsDeposited(address vaultAddress, uint256 amount);
    event FundsWithdrawn(address vaultAddress, uint256 amount);

    constructor(
        string memory _name,
        address _amanaVault,
        address _inputTokenAddress,
        address _receiptTokenAddress,
        address _gateway
    ) Ownable(msg.sender) {
        require(_amanaVault != address(0), "Invalid amanaVault address");
        name = _name;
        amanaVault = _amanaVault;
        inputToken = IERC20(_inputTokenAddress);
        receiptToken = I4626Vault(_receiptTokenAddress);
        _GATEWAY_ADDRESS = _gateway;
    }

    modifier onlyVault() {
        require(msg.sender == amanaVault, "Only Vault contract can call");
        _;
    }

    function invest(uint256 amount) external onlyVault returns (uint256) {
        SafeERC20.safeTransferFrom(
            inputToken,
            msg.sender,
            address(this),
            amount
        );
        bool success = inputToken.approve(address(receiptToken), amount);
        require(success, "Approval failed");
        uint256 shares = receiptToken.deposit(amount, address(this));
        require(shares > 0, "Deposit failed");
        emit FundsDeposited(msg.sender, amount);
        return shares;
    }

    function withdraw(
        uint256 _amountToWithdraw,
        uint256
    ) external onlyVault returns (uint256) {
        receiptToken.withdraw(
            _amountToWithdraw,
            address(this), // receiver
            address(this) // owner
        );
        SafeERC20.safeTransfer(
            IERC20(inputToken),
            msg.sender,
            _amountToWithdraw
        );
        emit FundsWithdrawn(msg.sender, _amountToWithdraw);
        return _amountToWithdraw;
    }

    function totalUnderlyingAssets() external view returns (uint256) {
        uint256 shares = receiptToken.balanceOf(address(this));
        return receiptToken.convertToAssets(shares);
    }

    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        SafeERC20.safeTransfer(IERC20(_token), owner(), balance);
    }

    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        payable(owner()).transfer(balance);
    }
}
