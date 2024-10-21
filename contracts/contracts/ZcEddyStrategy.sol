// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IFourPool.sol";
import "./interfaces/IEddyReceiptToken.sol";
import "hardhat/console.sol";

// ZC_USDC.ETH_ADDRESS = 0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a;
// ZC_EDDY_FOURPOOL_ADDRESS = 0x448028804461e8e5a8877c228F3adFd58c3Da6B6;
// ZC_EDDY4P_ADDRESS = 0xf45DC12FDEcA77afF35602d7FBE3B97f7f3dCBB2;

contract ZcEddyStrategy is Ownable {
    string public name;
    address public immutable amanaVault;
    IERC20 public immutable inputToken;
    IFourPool public immutable fourPool;
    IEddyReceiptToken public immutable receiptToken;

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
        receiptToken = IEddyReceiptToken(_receiptTokenAddress);
        fourPool = IFourPool(receiptToken.minter());
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
        bool success = inputToken.approve(address(fourPool), amount);
        require(success, "Approval failed");
        uint256[4] memory amounts = [
            uint256(0),
            amount,
            uint256(0),
            uint256(0)
        ];
        fourPool.add_liquidity(amounts, 0);
        return amount;
    }

    function withdraw(
        uint256 _amountToWithdraw,
        uint256 _fractionToWithdraw
    ) external onlyVault returns (uint256) {
        uint256 totalReceiptTokenBalance = receiptToken.balanceOf(
            address(this)
        );
        uint256 amountInReceiptToken = (_fractionToWithdraw *
            totalReceiptTokenBalance) / (10 ** 27);
        uint256 withdrawn = fourPool.remove_liquidity_one_coin(
            amountInReceiptToken,
            1, // index of token to withdraw - USDC.ETH in this case
            0 //minimum amount out
        ); //TODO slippage protection here
        console.log("withdrawn", withdrawn);

        require(withdrawn >= _amountToWithdraw, "Token withdrawal failed");
        if (withdrawn > _amountToWithdraw) {
            uint256[4] memory amounts = [
                uint256(0),
                withdrawn - _amountToWithdraw,
                uint256(0),
                uint256(0)
            ];
            bool success = inputToken.approve(
                address(fourPool),
                withdrawn - _amountToWithdraw
            );
            require(success, "Approval failed");
            fourPool.add_liquidity(amounts, 1);
        }
        SafeERC20.safeTransfer(
            IERC20(inputToken),
            msg.sender,
            _amountToWithdraw
        );
        return withdrawn;
    }

    function _convertInputToReceiptToken(
        uint256 _amount
    ) internal view returns (uint256) {
        uint256[4] memory amounts = [
            uint256(0),
            _amount,
            uint256(0),
            uint256(0)
        ];
        uint256 receiptTokenAmount = fourPool.calc_token_amount(amounts, false);
        return receiptTokenAmount;
    }

    function totalUnderlyingAssets() external view returns (uint256) {
        uint256 receiptTokenBalance = receiptToken.balanceOf(address(this));
        if (receiptTokenBalance == 0) {
            return 0;
        }
        return fourPool.calc_withdraw_one_coin(receiptTokenBalance, 1);
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
