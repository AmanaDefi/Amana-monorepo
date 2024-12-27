// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/I4626Vault.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";

// BSC_TEST_USDC_ADDRESS = 0x64544969ed7EBf5f083679233325356EbE738930
// MOCK_4626_VAULT_ADDRESS = 0x1fD901103F37d076c096F1F0dF03f078FBc59241

contract Mock4626BscUsdcStrategy is Ownable, Callable, Revertable {
    string public name;
    address public immutable amanaVault;
    IERC20 public immutable inputToken;
    I4626Vault public immutable receiptToken;
    address immutable _GATEWAY_ADDRESS;
    uint256 executionNonce = 1;

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

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _inputTokenAddress Address of the input token.
    /// @param _receiptTokenAddress Address of the 4626 receipt token.
    /// @param _gateway Address of the ZetaChain Gateway.
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

    /// @notice Modifier to restrict access to the ZetaChain Gateway.
    modifier onlyGateway() {
        require(
            msg.sender == _GATEWAY_ADDRESS,
            "Only Gateway contract can call"
        );
        _;
    }

    /// @notice Processes calls from the Gateway for deposits or withdrawals.
    /// @param context The message context from the Gateway.
    /// @param message Encoded data specifying the transaction details.
    function onCall(
        MessageContext calldata context,
        bytes calldata message
    ) external payable override onlyGateway returns (bytes memory) {
        (
            address userAddress,
            address withdrawZRC20,
            uint256 amount,
            uint256 fee,
            uint32 withdrawChainId,
            bool isDeposit,
            uint256 crossChainTxId
        ) = abi.decode(
                message,
                (address, address, uint256, uint256, uint32, bool, uint256)
            );

        if (context.sender != address(amanaVault)) {
            revert("Only Vault contract can call the strategy");
        }

        uint256 currentExecutionNonce = executionNonce;
        executionNonce++;

        if (isDeposit) {
            _invest(userAddress, amount, currentExecutionNonce, crossChainTxId);
            return abi.encode(true);
        } else {
            _divest(
                userAddress,
                withdrawZRC20,
                amount,
                fee,
                withdrawChainId,
                currentExecutionNonce,
                crossChainTxId
            );
            return abi.encode(true);
        }
    }

    /// @notice Invests ETH into the Aave pool.
    /// @param userAddress Address of the user whose funds are being invested.
    /// @param amount Amount of ETH to invest.
    /// @param _executionNonce Current execution nonce for the transaction.
    function _invest(
        address userAddress,
        uint256 amount,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) private returns (uint256) {
        uint256 totalUnderlyingAssetsBefore = totalUnderlyingAssets();

        bool success = inputToken.transferFrom(
            msg.sender,
            address(this),
            amount
        );

        require(success, "Transfer failed");
        success = inputToken.approve(address(receiptToken), amount);
        require(success, "Approval failed");
        uint256 shares = receiptToken.deposit(amount, address(this));
        require(shares > 0, "Deposit failed");

        bytes memory outgoingMessage = abi.encode(
            userAddress,
            address(0),
            amount,
            0,
            0,
            true,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssets(),
            _executionNonce,
            _crossChainTxId
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this),
            false,
            address(this),
            abi.encode("_investConfirmFailed", _crossChainTxId),
            uint256(1000000)
        );

        IGatewayEVM(_GATEWAY_ADDRESS).call(
            amanaVault,
            outgoingMessage,
            revertOptions
        );

        emit FundsInvested(_crossChainTxId, userAddress, amount);
        return shares;
    }

    /// @notice Withdraws funds from the Aave pool.
    /// @param userAddress Address of the user whose funds are being withdrawn.
    /// @param withdrawZRC20 ZRC20 token address for the withdrawal.
    /// @param amount Amount to withdraw.
    /// @param fee Gas fee for the transaction.
    /// @param withdrawChainId Chain ID for the withdrawal.
    /// @param _executionNonce Current execution nonce for the transaction.
    function _divest(
        address userAddress,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 withdrawChainId,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) private returns (uint256) {
        uint256 totalUnderlyingAssetsBefore = totalUnderlyingAssets();

        receiptToken.withdraw(
            amount + fee,
            address(this), // receiver
            address(this) // owner
        );
        bytes memory outgoingMessage = abi.encode(
            userAddress,
            withdrawZRC20,
            amount,
            fee,
            withdrawChainId,
            false,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssets(),
            _executionNonce,
            _crossChainTxId
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this),
            false,
            address(this),
            abi.encode("_returnFundsFromStrategyFailed", _crossChainTxId),
            uint256(1000000)
        );

        IGatewayEVM(_GATEWAY_ADDRESS).depositAndCall{value: amount + fee}(
            amanaVault,
            outgoingMessage,
            revertOptions
        );

        emit FundsDivested(_crossChainTxId, userAddress, amount);
        return amount + fee;
    }

    /// @notice Gets the total assets held in the strategy.
    /// @return Total assets as an unsigned integer.
    function totalUnderlyingAssets() public view returns (uint256) {
        uint256 shares = receiptToken.balanceOf(address(this));
        return receiptToken.convertToAssets(shares);
    }

    /// @notice Allows the owner to withdraw ERC20 tokens in case of emergency.
    /// @param _token Address of the token to withdraw.
    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        SafeERC20.safeTransfer(IERC20(_token), owner(), balance);
    }

    /// @notice Allows the owner to withdraw ETH in case of emergency.
    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        payable(owner()).transfer(balance);
    }

    /// @notice Handles reverts from the Gateway.
    /// @param context Context of the revert.
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
            bool success = inputToken.approve(
                address(receiptToken),
                context.amount
            );
            require(success, "Approval on Revert Reinvest failed");
            uint256 shares = receiptToken.deposit(
                context.amount,
                address(this)
            );
            require(shares > 0, "Revert Reinvest failed");
            emit ReturnFundsFromStrategyFailed(_crossChainTxId);
        } else {
            revert("Revert not handled");
        }
    }

    /// @notice Allows the contract to receive ETH.
    receive() external payable {}
}
