// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IMoonwellVault.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";

// LOCALNET_USDC_ADDRESS = 0x0B306BF915C4d645ff596e518fAf3F9669b97016;
// MOCK_4626_VAULT_ADDRESS - get this on deployment to localnet

contract Mock4626Strategy is Ownable {
    string public name;
    address public immutable amanaVault;
    IERC20 public immutable inputToken;
    IMoonwellVault public immutable receiptToken;
    address immutable _GATEWAY_ADDRESS;

    constructor(
        string memory _name,
        address _amanaVault,
        address _inputTokenAddress,
        address _receiptTokenAddress,
        address _gateway
    ) Ownable(msg.sender) {
        name = _name;
        amanaVault = _amanaVault;

        inputToken = IERC20(_inputTokenAddress);
        receiptToken = IMoonwellVault(_receiptTokenAddress);

        _GATEWAY_ADDRESS = _gateway;
    }

    modifier onlyGateway() {
        require(
            msg.sender == _GATEWAY_ADDRESS,
            "Only Gateway contract can call"
        );
        _;
    }

    function invest(uint256 amount) external onlyGateway {
        bool success = inputToken.transferFrom(
            _GATEWAY_ADDRESS,
            address(this),
            amount
        );
        require(success, "Transfer failed");
        success = inputToken.approve(address(receiptToken), amount);
        require(success, "Approval failed");
        uint256 shares = receiptToken.deposit(amount, address(this));
        require(shares > 0, "Deposit failed");
    }

    function withdraw(
        address ownerAddress,
        uint256 amount,
        uint256 fee,
        uint256 shares
    ) external onlyGateway {
        receiptToken.withdraw(
            amount + fee,
            address(this), // receiver
            address(this) // owner
        );
        bytes memory outgoingMessage = abi.encode(ownerAddress, 1, fee, shares);

        RevertOptions memory revertOptions = RevertOptions(
            0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690, // revert address
            false, // callOnRevert
            address(this), // abortAddress
            bytes("revert message"),
            uint256(30000000) // onRevertGasLimit
        );

        inputToken.approve(_GATEWAY_ADDRESS, amount + fee); // is this necessary?

        IGatewayEVM(_GATEWAY_ADDRESS).depositAndCall(
            amanaVault, // the amana vault contract address - make this a constant? (just an address, not bytes)
            amount + fee, // the amount of USDC to send back
            address(inputToken), // ERC20 of the underlying asset token
            outgoingMessage, //the message to send
            revertOptions
        );
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

    receive() external payable {}
}
