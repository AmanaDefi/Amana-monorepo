// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IAavePool.sol";
import "../interfaces/IAaveReceiptToken.sol";
import "../interfaces/IWrappedTokenGatewayV3.sol";
import "../interfaces/IWETH.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";

// BASE_SEPOLIA_AAVE_ETH_POOL_ADDRESS = 0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b;
// BASE_SEPOLIA_AAVE_RECEIPT_TOKEN_ADDRESS = 0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f;
// BASE_SEPOLIA_WETH_ADDRESS = 0x4200000000000000000000000000000000000006;

contract BaseSepAaveEthStrategy is Ownable, Callable {
    string public name;
    address public immutable amanaVault;
    IERC20 public immutable inputToken;
    IWETH public immutable weth;
    IAavePool public immutable aavePool;
    IAaveReceiptToken public immutable receiptToken;
    address immutable _GATEWAY_ADDRESS;
    address constant _WRAPPED_TOKEN_GATEWAY_ADDRESS =
        0xF6Dac650dA5616Bc3206e969D7868e7c25805171;
    IWrappedTokenGatewayV3 public tokenGateway =
        IWrappedTokenGatewayV3(_WRAPPED_TOKEN_GATEWAY_ADDRESS);
    address constant BASE_SEPOLIA_WETH_ADDRESS =
        0x4200000000000000000000000000000000000006;

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
        receiptToken = IAaveReceiptToken(_receiptTokenAddress);
        aavePool = IAavePool(receiptToken.POOL());
        weth = IWETH(BASE_SEPOLIA_WETH_ADDRESS);
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
            address withdrawZRC20,
            uint256 withdrawAmount,
            uint256 nonce,
            uint256 totalAssetsPlaceHolder,
            uint32 userChainId
        ) = abi.decode(message, (address, uint256, uint256, uint256, uint32));
        if (context.sender != address(amanaVault)) {
            revert("Only Vault contract can call the strategy");
        }
        if (withdrawAmount == 0) {
            _invest(msg.value, nonce);
            return abi.encode(true);
        } else {
            _withdraw(withdrawAmount, nonce);
            return abi.encode(true);
        }
    }

    function _invest(uint256 amount, uint256 nonce) private returns (uint256) {
        require(amount > 0, "No ETH sent");
        tokenGateway.depositETH{value: amount}(
            address(aavePool),
            address(this),
            0
        );

        bytes memory outgoingMessage = abi.encode(
            address(0),
            address(0),
            totalUnderlyingAssets(), // tells the vault how much to mint
            nonce,
            0
        );

        RevertOptions memory revertOptions = RevertOptions(
            0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690, // revert address
            false, // callOnRevert
            address(this), // abortAddress
            bytes("revert message"),
            uint256(1000000) // onRevertGasLimit
        );

        IGatewayEVM(_GATEWAY_ADDRESS).call(
            amanaVault, // (just an address, not bytes)
            outgoingMessage,
            revertOptions
        );

        return msg.value;
    }

    function _withdraw(
        uint256 amount,
        uint256 nonce
    ) private returns (uint256) {
        aavePool.withdraw{gas: 200000}(address(weth), amount, address(this));
        weth.withdraw{gas: 50000}(amount);
        // TODO: can use tokenGateway on Mainnet - code in comments below
        // bool success = receiptToken.approve(
        //     address(tokenGateway),
        //     amount + fee
        // );
        // if (!success) revert ApprovalFailed();
        // tokenGateway.withdrawETH(
        //     address(aavePool),
        //     amount + fee,
        //     address(this) // owner
        // );
        bytes memory outgoingMessage = abi.encode(
            address(0),
            address(0),
            totalUnderlyingAssets(),
            nonce,
            0
        );

        RevertOptions memory revertOptions = RevertOptions(
            0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690, // revert address
            false, // callOnRevert
            address(this), // abortAddress
            bytes("revert message"),
            uint256(1000000) // onRevertGasLimit
        );

        IGatewayEVM(_GATEWAY_ADDRESS).depositAndCall{value: amount}(
            amanaVault, // (just an address, not bytes)
            outgoingMessage,
            revertOptions
        );
        return amount;
    }

    function totalUnderlyingAssets() public view returns (uint256) {
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
