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

contract BaseSepAaveEthStrategy is Ownable, Callable, Revertable {
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
    uint256 executionNonce = 1; // we start this at 1 to sync with vault expectation
    uint256 crossChainTxId = 0;

    event FundsInvested(
        uint256 indexed crossChainTxId,
        address userAddress,
        uint256 amount
    );
    event FundsDivested(
        uint256 indexed crossChainTxId,
        address userAddress,
        uint256 amount
    );
    event InvestConfirmFailed(uint256 indexed crossChainTxId);
    event ReturnFundsFromStrategyFailed(uint256 indexed crossChainTxId);

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
            uint256 currentExecutionNonce = executionNonce;
            executionNonce++;
            _invest(userAddress, msg.value, currentExecutionNonce);
            return abi.encode(true);
        } else {
            uint256 currentExecutionNonce = executionNonce;
            executionNonce++;

            _divest(
                userAddress,
                withdrawZRC20,
                amount,
                fee,
                withdrawChainId,
                currentExecutionNonce
            );
            return abi.encode(true);
        }
    }

    function _invest(
        address userAddress,
        uint256 amount,
        uint256 _executionNonce
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
            _executionNonce
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            false, // callOnRevert
            address(this), // abortAddress
            abi.encode("_investConfirmFailed", crossChainTxId),
            uint256(1000000) // onRevertGasLimit
        );

        IGatewayEVM(_GATEWAY_ADDRESS).call(
            amanaVault, // (just an address, not bytes)
            outgoingMessage,
            revertOptions
        );
        emit FundsInvested(crossChainTxId, userAddress, amount);
        return msg.value;
    }

    function _divest(
        address userAddress,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 withdrawChainId,
        uint256 _executionNonce
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
            _executionNonce
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            false, // callOnRevert
            address(this), // abortAddress
            abi.encode("_returnFundsFromStrategyFailed", crossChainTxId),
            uint256(1000000) // onRevertGasLimit
        );

        IGatewayEVM(_GATEWAY_ADDRESS).depositAndCall{value: amount + fee}(
            amanaVault, // (just an address, not bytes)
            outgoingMessage,
            revertOptions
        );
        emit FundsDivested(crossChainTxId, userAddress, amount);
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

    function onRevert(RevertContext calldata context) external override {
        (string memory revertMessage, uint256 _crossChainTxId) = abi.decode(
            context.revertMessage,
            (string, uint256)
        );
        if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_investConfirmFailed"))
        ) {
            emit InvestConfirmFailed(_crossChainTxId);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_returnFundsFromStrategyFailed"))
        ) {
            // we re-deposit the funds back to the Aave pool
            tokenGateway.depositETH{value: context.amount}(
                address(aavePool),
                address(this),
                0
            );
            emit ReturnFundsFromStrategyFailed(_crossChainTxId);
        } else {
            revert("Revert not handled");
        }
    }

    receive() external payable {}
}
