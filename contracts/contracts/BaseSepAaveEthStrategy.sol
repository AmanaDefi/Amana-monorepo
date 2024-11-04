// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAavePool.sol";
import "./interfaces/IAaveReceiptToken.sol";
import "./interfaces/IWrappedTokenGatewayV3.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";

// BASE_SEPOLIA_AAVE_ETH_POOL_ADDRESS = 0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b;
// BASE_SEPOLIA_AAVE_RECEIPT_TOKEN_ADDRESS = 0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f;

contract BaseSepAaveEthStrategy is Ownable {
    string public name;
    address public immutable amanaVault;
    IERC20 public immutable inputToken;
    IAavePool public immutable aavePool;
    IAaveReceiptToken public immutable receiptToken;
    address constant _GATEWAY_ADDRESS =
        0x0c487a766110c85d301D96E33579C5B317Fa4995;
    address constant _WRAPPED_TOKEN_GATEWAY_ADDRESS =
        0xF6Dac650dA5616Bc3206e969D7868e7c25805171;
    IWrappedTokenGatewayV3 public tokenGateway =
        IWrappedTokenGatewayV3(_WRAPPED_TOKEN_GATEWAY_ADDRESS);

    error ApprovalFailed();

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

    modifier onlyGateway() {
        require(
            msg.sender == _GATEWAY_ADDRESS,
            "Only Gateway contract can call"
        );
        _;
    }

    function invest(
        uint256 amount
    ) external payable onlyGateway returns (uint256) {
        // note that the amount input here doesn't get used? maybe just check it against msg.value?
        require(msg.value > 0, "No ETH sent");
        tokenGateway.depositETH{value: msg.value}(
            address(aavePool),
            address(this),
            0
        );
        return msg.value;
    }

    function withdraw(
        address ownerAddress,
        uint256 amount,
        uint256 fee,
        uint256 shares
    ) external onlyGateway returns (uint256) {
        bool success = receiptToken.approve(
            address(tokenGateway),
            amount + fee
        );
        if (!success) revert ApprovalFailed();

        tokenGateway.withdrawETH(
            address(aavePool),
            amount + fee,
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

        // inputToken.approve(_GATEWAY_ADDRESS, amount + fee); // is this necessary?

        IGatewayEVM(_GATEWAY_ADDRESS).depositAndCall(
            amanaVault, // (just an address, not bytes)
            outgoingMessage, //the message to send
            revertOptions
        );
        return amount + fee;
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
