// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/I4626Vault.sol";
import "../interfaces/IWETH.sol";

import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";

// AMOY_WMATIC_ADDRESS = 0xd39986C4bc5D9Bc4A4e532e37dBC7ea4a2CcF1BB;
// MOCK_4626_VAULT_ADDRESS = 0x617f411ec34D20225CF470c8bbF34fC4063BcAE6

contract Mock4626AmoyStrategy is Ownable, Callable {
    string public name;
    address public immutable amanaVault;
    IERC20 public immutable inputToken;
    IWETH public immutable weth;

    I4626Vault public immutable receiptToken;
    address immutable _GATEWAY_ADDRESS;
    address constant AMOY_WMATIC_ADDRESS =
        0xd39986C4bc5D9Bc4A4e532e37dBC7ea4a2CcF1BB;

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
        weth = IWETH(AMOY_WMATIC_ADDRESS);

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
            uint256 withdrawAmount,
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
            _invest(msg.value);
            return abi.encode(true);
        } else {
            _withdraw(
                userAddress,
                withdrawZRC20,
                withdrawAmount,
                fee,
                shares,
                withdrawChainId
            );
            return abi.encode(true);
        }
    }

    function _invest(uint256) private returns (uint256) {
        require(msg.value > 0, "No ETH sent");
        weth.deposit{value: msg.value}();
        bool success = weth.approve(address(receiptToken), msg.value);
        if (!success) {
            revert ApprovalFailed();
        }
        uint256 receiptTokenAmount = receiptToken.deposit(
            msg.value,
            address(this)
        );

        return receiptTokenAmount;
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

        weth.withdraw{gas: 50000}(amount + fee);
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

        IGatewayEVM(_GATEWAY_ADDRESS).depositAndCall{value: amount + fee}(
            amanaVault, // (just an address, not bytes)
            outgoingMessage,
            revertOptions
        );
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

    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        payable(owner()).transfer(balance);
    }

    receive() external payable {}
}
