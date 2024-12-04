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

// ETH_SEPOLIA_AAVE_ETH_POOL_ADDRESS = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;
// ETH_SEPOLIA_AAVE_ETH_RECEIPT_TOKEN_ADDRESS = 0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830;
// SEPOLIA_WETH_ADDRESS = 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c;

contract EthSepAaveEthStrategy is Ownable {
    string public name;
    address public immutable amanaVault;
    IERC20 public immutable inputToken;
    IWETH public immutable weth;
    IAavePool public immutable aavePool;
    IAaveReceiptToken public immutable receiptToken;
    address immutable _GATEWAY_ADDRESS;
    address constant _WRAPPED_TOKEN_GATEWAY_ADDRESS =
        0x387d311e47e80b498169e6fb51d3193167d89F7D;
    IWrappedTokenGatewayV3 public tokenGateway =
        IWrappedTokenGatewayV3(_WRAPPED_TOKEN_GATEWAY_ADDRESS);
    address constant SEPOLIA_WETH_ADDRESS =
        0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c;

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
        weth = IWETH(SEPOLIA_WETH_ADDRESS);
        _GATEWAY_ADDRESS = _gateway;
    }

    modifier onlyGateway() {
        require(
            msg.sender == _GATEWAY_ADDRESS,
            "Only Gateway contract can call"
        );
        _;
    }

    function invest(uint256) external payable onlyGateway returns (uint256) {
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
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint256 shares,
        uint32 originChainId
    ) external onlyGateway returns (uint256) {
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
