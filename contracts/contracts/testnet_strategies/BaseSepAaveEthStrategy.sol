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
    uint256 public executionNonce = 1; // we start this at 1 to sync with vault expectation

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
            address userAddress,
            address withdrawZRC20, // not needed on deposit
            uint256 amount, // not needed on native deposit?
            uint256 fee, // not needed on deposit
            uint32 withdrawChainId, // not needed on deposit
            bool isDeposit
        ) = abi.decode(
                message,
                (address, address, uint256, uint256, uint32, bool)
            );
        if (context.sender != address(amanaVault)) {
            revert("Only Vault contract can call the strategy");
        }
        if (isDeposit) {
            _invest(userAddress, msg.value);
            executionNonce++;
            return abi.encode(true);
        } else {
            _withdraw(userAddress, withdrawZRC20, amount, fee, withdrawChainId);
            executionNonce++;
            return abi.encode(true);
        }
    }

    function _invest(
        address userAddress,
        uint256 amount
    ) private returns (uint256) {
        require(amount > 0, "No ETH sent");
        uint256 totalUnderlyingAssetsBefore = totalUnderlyingAssets();

        tokenGateway.depositETH{value: amount}(
            address(aavePool),
            address(this),
            0
        );

        bytes memory outgoingMessage = abi.encode(
            userAddress,
            address(0),
            amount,
            0,
            0,
            true,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssets(), // tells the vault how much to mint
            executionNonce
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
        address userAddress,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 withdrawChainId
    ) private returns (uint256) {
        uint256 totalUnderlyingAssetsBefore = totalUnderlyingAssets();
        aavePool.withdraw{gas: 200000}(
            address(weth),
            amount + fee,
            address(this)
        );
        weth.withdraw{gas: 50000}(amount + fee);
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
            userAddress,
            withdrawZRC20,
            amount,
            fee,
            withdrawChainId,
            false,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssets(),
            executionNonce
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
