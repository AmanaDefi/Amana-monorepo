// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/I4626Vault.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";

// BSC_TEST_USDC_ADDRESS = 0x64544969ed7EBf5f083679233325356EbE738930
// MOCK_4626_VAULT_ADDRESS = 0x1fD901103F37d076c096F1F0dF03f078FBc59241

contract Mock4626BscUsdcStrategy is Ownable, Callable {
    string public name;
    address public immutable amanaVault;
    IERC20 public immutable inputToken;
    I4626Vault public immutable receiptToken;
    address immutable _GATEWAY_ADDRESS;

    event Invested(uint256 amount, uint256 shares);
    event Withdrawn(uint256 amount, uint256 fee);

    error ApprovalFailed();

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

    modifier onlyGateway() {
        require(
            msg.sender == _GATEWAY_ADDRESS,
            "Only Gateway contract can call"
        );
        _;
    }

    function onCall(
        MessageContext calldata context,
        bytes calldata message
    ) external payable override onlyGateway returns (bytes memory) {
        (
            address userAddress,
            address withdrawZRC20,
            uint256 amount,
            uint256 fee,
            uint256 shares,
            uint32 withdrawChainId
        ) = abi.decode(
                message,
                (address, address, uint256, uint256, uint256, uint32)
            );
        if (context.sender != address(amanaVault)) {
            revert("Only Vault contract can call the strategy");
        }
        if (withdrawZRC20 == address(0)) {
            shares = _invest(amount);
            return abi.encode(shares);
        } else {
            _withdraw(
                userAddress,
                withdrawZRC20,
                amount,
                fee,
                shares,
                withdrawChainId
            );
            return abi.encode(true);
        }
    }

    function _invest(uint256 amount) private returns (uint256) {
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
        emit Invested(amount, shares);
        return shares;
    }

    function _withdraw(
        address ownerAddress,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint256 shares,
        uint32 originChainId
    ) private returns (uint256) {
        receiptToken.withdraw(
            amount + fee,
            address(this), // receiver
            address(this) // owner
        );
        bytes memory outgoingMessage = abi.encode(
            ownerAddress,
            withdrawZRC20,
            1,
            fee,
            shares,
            originChainId // 0 = origin is zetachain, 1 = origin is connected chain
        );

        RevertOptions memory revertOptions = RevertOptions(
            0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690, // revert address
            false, // callOnRevert
            address(this), // abortAddress
            bytes("revert message"),
            uint256(1000000) // onRevertGasLimit
        );
        inputToken.approve(_GATEWAY_ADDRESS, amount + fee); // is this necessary?

        IGatewayEVM(_GATEWAY_ADDRESS).depositAndCall(
            amanaVault, // the amana vault contract address - make this a constant? (just an address, not bytes)
            amount + fee, // the amount of USDC to send back
            address(inputToken), // ERC20 of the underlying asset token
            outgoingMessage, //the message to send
            revertOptions
        );
        emit Withdrawn(amount, fee);
        return amount + fee;
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
}
