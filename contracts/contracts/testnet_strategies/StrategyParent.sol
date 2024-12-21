// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";
import "../interfaces/IWETH.sol";
import "../interfaces/I4626Vault.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IErrors.sol";

/// @title StrategyParent
/// @notice Base contract for cross-chain investment strategies.
/// @dev Handles common logic for investing, divesting, and cross-chain messaging.
abstract contract StrategyParent is Ownable, IErrors {
    using SafeERC20 for IERC20;

    string public name;
    address public immutable amanaVault;
    uint256 public executionNonce = 1;
    address public oldStrategy;

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
    event TotalUnderlyingAssetsSent(
        address indexed vaultAddress,
        uint256 totalUnderlyingAssets,
        uint256 blockNumber,
        uint256 blockTimestamp
    );
    event SendTotalUnderlyingAssetsFailed();
    event AssetsTransferredToNewStrategy(
        address indexed newStrategy,
        uint256 totalAssetsTransferrred,
        uint256 executionNonce,
        uint256 crossChainTxId
    );

    address immutable _GATEWAY_ADDRESS;

    modifier onlyGateway() {
        if (msg.sender != _GATEWAY_ADDRESS) {
            revert OnlyGateway();
        }
        _;
    }

    constructor(
        string memory _name,
        address _amanaVault,
        address _gateway
    ) Ownable(msg.sender) {
        if (_amanaVault == address(0)) revert InvalidAddress();
        name = _name;
        amanaVault = _amanaVault;
        _GATEWAY_ADDRESS = _gateway;
    }

    /// @notice Processes calls from the Gateway for deposits or withdrawals.
    /// @param context The message context from the Gateway.
    /// @param message Encoded data specifying the transaction details.
    function onCall(
        MessageContext calldata context,
        bytes calldata message
    ) external payable onlyGateway returns (bytes memory result) {
        if (context.sender != address(amanaVault)) {
            revert OnlyVault();
        }

        (
            address userAddress,
            address ZRC20AddressOrNewStrategy,
            uint256 amount,
            uint256 fee,
            uint32 withdrawChainId,
            bool isDeposit,
            uint256 crossChainTxId
        ) = abi.decode(
                message,
                (address, address, uint256, uint256, uint32, bool, uint256)
            );

        uint256 currentExecutionNonce = executionNonce;
        executionNonce++;

        if (userAddress == address(0)) {
            _transferAssetsToNewStrategy(
                ZRC20AddressOrNewStrategy,
                currentExecutionNonce,
                crossChainTxId
            );
            return abi.encode(true);
        } else if (isDeposit) {
            _invest(userAddress, amount, currentExecutionNonce, crossChainTxId);
            return abi.encode(true);
        } else {
            _divest(
                userAddress,
                ZRC20AddressOrNewStrategy,
                amount,
                fee,
                withdrawChainId,
                currentExecutionNonce,
                crossChainTxId
            );
            return abi.encode(true);
        }
    }

    function setOldStrategy(address _oldStrategy) external onlyOwner {
        if (_oldStrategy == address(0)) revert InvalidAddress();
        if (_oldStrategy == address(this)) revert InvalidAddress();
        oldStrategy = _oldStrategy;
    }

    function totalUnderlyingAssets() public view virtual returns (uint256);

    /// @notice Invests ETH into the Aave pool.
    /// @param userAddress Address of the user whose funds are being invested.
    /// @param amount Amount of ETH to invest.
    /// @param _executionNonce Current execution nonce for the transaction.
    /// @param _crossChainTxId Cross-chain transaction ID.
    function _invest(
        address userAddress,
        uint256 amount,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) internal virtual;

    function _depositFundsIntoYieldSource(uint256 amount) internal virtual;

    function manualResendInvestConfirmation(
        address userAddress,
        uint256 amount,
        uint256 totalUnderlyingAssetsBefore,
        uint256 totalUnderlyingAssetsAfter,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) external onlyOwner {
        _sendInvestConfirmation(
            userAddress,
            amount,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssetsAfter,
            _executionNonce,
            _crossChainTxId
        );
    }

    function _sendInvestConfirmation(
        address userAddress,
        uint256 amount,
        uint256 totalUnderlyingAssetsBefore,
        uint256 totalUnderlyingAssetsAfter,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) internal {
        bytes memory outgoingMessage = abi.encode(
            userAddress,
            address(0),
            amount,
            0,
            0,
            true,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssetsAfter,
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
    }

    function _transferAssetsToNewStrategy(
        address newStrategy,
        uint256 currentExecutionNonce,
        uint256 _crossChainTxId
    ) internal virtual;

    /// @notice Withdraws funds from the Aave pool.
    /// @param userAddress Address of the user whose funds are being withdrawn.
    /// @param withdrawZRC20 ZRC20 token address for the withdrawal.
    /// @param amount Amount to withdraw.
    /// @param fee Gas fee for the transaction.
    /// @param withdrawChainId Chain ID for the withdrawal.
    /// @param _executionNonce Current execution nonce for the transaction.
    /// @param _crossChainTxId Cross-chain transaction ID.
    function _divest(
        address userAddress,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 withdrawChainId,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) internal {
        uint256 totalUnderlyingAssetsBefore = totalUnderlyingAssets();

        _withdrawFundsFromYieldSource(amount + fee);

        uint256 totalUnderlyingAssetsAfter = totalUnderlyingAssets();

        _sendFundsAndDivestConfirmation(
            userAddress,
            withdrawZRC20,
            amount,
            fee,
            withdrawChainId,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssetsAfter,
            _executionNonce,
            _crossChainTxId
        );

        emit FundsDivested(_crossChainTxId, userAddress, amount + fee);
    }

    function manualResendFundsAndDivestConfirmation(
        address userAddress,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 withdrawChainId,
        uint256 totalUnderlyingAssetsBefore,
        uint256 totalUnderlyingAssetsAfter,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) external onlyOwner {
        _sendFundsAndDivestConfirmation(
            userAddress,
            withdrawZRC20,
            amount,
            fee,
            withdrawChainId,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssetsAfter,
            _executionNonce,
            _crossChainTxId
        );
    }

    function _sendFundsAndDivestConfirmation(
        address userAddress,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 withdrawChainId,
        uint256 totalUnderlyingAssetsBefore,
        uint256 totalUnderlyingAssetsAfter,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) internal {
        bytes memory outgoingMessage = abi.encode(
            userAddress,
            withdrawZRC20,
            amount,
            fee,
            withdrawChainId,
            false,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssetsAfter,
            _executionNonce,
            _crossChainTxId
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this),
            true,
            address(this),
            abi.encode("_returnFundsFromStrategyFailed", _crossChainTxId),
            uint256(1000000)
        );
        _sendDepositAndCall(
            amount + fee,
            amanaVault,
            outgoingMessage,
            revertOptions
        );
    }

    function _sendDepositAndCall(
        uint256 amount,
        address amanaVault,
        bytes memory outgoingMessage,
        RevertOptions memory revertOptions
    ) internal virtual;

    function _withdrawFundsFromYieldSource(
        uint256 amount
    ) internal virtual returns (uint256);

    function sendTotalUnderlyingAssetsToVault() external {
        uint256 underlyingAssets = totalUnderlyingAssets();
        uint256 currentExecutionNonce = executionNonce;
        executionNonce++;
        // Construct the message payload with the desired information
        bytes memory outgoingMessage = abi.encode(
            address(0),
            address(0),
            block.number,
            block.timestamp,
            0,
            false,
            0,
            totalUnderlyingAssets(),
            currentExecutionNonce,
            0
        );

        // Configure revert options for the cross-chain call
        RevertOptions memory revertOptions = RevertOptions(
            address(this), // Address to send revert message to
            false, // Flag to indicate whether to revert on failure
            address(this), // Address to handle revert logic
            abi.encode("_handleRevertOnSendTotalUnderlyingAssets"), // Revert handling logic
            uint256(1000000) // Gas for revert call
        );

        // Use the GatewayEVM contract to make the call
        IGatewayEVM(_GATEWAY_ADDRESS).call(
            amanaVault, // Destination contract (vault on ZetaChain)
            outgoingMessage, // Encoded message payload
            revertOptions // Revert options
        );

        emit TotalUnderlyingAssetsSent(
            amanaVault,
            underlyingAssets,
            block.number,
            block.timestamp
        );
    }

    /// @notice Handles reverts from the Gateway.
    /// @param context Context of the revert.
    function onRevert(RevertContext calldata context) external {
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
            _depositFundsIntoYieldSource(context.amount);
            emit ReturnFundsFromStrategyFailed(_crossChainTxId);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_handleRevertOnSendTotalUnderlyingAssets"))
        ) {
            emit SendTotalUnderlyingAssetsFailed();
        } else {
            revert("Revert not handled");
        }
    }
}
