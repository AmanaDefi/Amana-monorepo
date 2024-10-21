// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAavePool.sol";
import "./interfaces/IAaveReceiptToken.sol";
import "hardhat/console.sol";

// BASE_USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
// AAVE_BASE_POOL_ADDRESS = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;
// AAVE_BASE_USDC_CONTRACT_ADDRESS = 0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB;

contract BaseAaveStrategy is Ownable {
    string public name;
    address public immutable amanaVault;
    IERC20 public immutable inputToken;
    IAavePool public immutable aavePool;
    IAaveReceiptToken public immutable receiptToken;

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
        receiptToken = IAaveReceiptToken(_receiptTokenAddress);
        aavePool = IAavePool(receiptToken.POOL());
    }

    modifier onlyVault() {
        require(msg.sender == amanaVault, "Only amanaVault can call");
        _;
    }

    function invest(uint256 amount) external onlyVault returns (uint256) {
        SafeERC20.safeTransferFrom(
            inputToken,
            msg.sender,
            address(this),
            amount
        );
        bool success = inputToken.approve(address(aavePool), amount);
        require(success, "Approval failed");
        aavePool.supply(address(inputToken), amount, address(this), 0);
        return amount;
    }

    function withdraw(
        uint256 _amountToWithdraw,
        uint256 _fractionToWithdraw
    ) external onlyVault returns (uint256) {
        uint256 withdrawn = aavePool.withdraw(
            address(inputToken),
            _amountToWithdraw,
            msg.sender
        );
        console.log("withdrawn: %s", withdrawn);
        require(withdrawn == _amountToWithdraw, "Token withdrawal failed");
        return withdrawn;
    }

    function totalUnderlyingAssets() external view returns (uint256) {
        return receiptToken.balanceOf(address(this));
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

    receive() external payable {}
}
