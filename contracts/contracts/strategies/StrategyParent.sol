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
        address user,
        uint256 amount
    );
    event FundsDivested(
        uint256 indexed crossChainTxId,
        address user,
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
            address user,
            address receiver,
            address ZRC20AddressOrNewStrategy,
            uint256 amount,
            uint256 fee,
            uint32 withdrawChainId,
            bool isDeposit,
            uint256 crossChainTxId,
            uint16 slippage
        ) = abi.decode(
                message,
                (
                    address,
                    address,
                    address,
                    uint256,
                    uint256,
                    uint32,
                    bool,
                    uint256,
                    uint16
                )
            );

        uint256 currentExecutionNonce = executionNonce;
        executionNonce++;

        if (user == address(0) && receiver == address(0)) {
            _transferAssetsToNewStrategy(
                ZRC20AddressOrNewStrategy,
                currentExecutionNonce,
                crossChainTxId
            );
            return abi.encode(true);
        } else if (isDeposit) {
            _invest(receiver, amount, currentExecutionNonce, crossChainTxId);
            return abi.encode(true);
        } else {
            _divest(
                user,
                receiver,
                ZRC20AddressOrNewStrategy,
                amount,
                fee,
                withdrawChainId,
                currentExecutionNonce,
                crossChainTxId,
                slippage
            );
            return abi.encode(true);
        }
    }

    /**
     * @dev Sets the address of the old strategy to enable migration of funds.
     * @param _oldStrategy The address of the old strategy contract.
     */
    function setOldStrategy(address _oldStrategy) external onlyOwner {
        if (_oldStrategy == address(0)) revert InvalidAddress();
        if (_oldStrategy == address(this)) revert InvalidAddress();
        oldStrategy = _oldStrategy;
    }

    /**
     * @notice Returns the total underlying assets managed by the contract.
     * @return The total amount of underlying assets in the contract.
     */
    function totalUnderlyingAssets() public view virtual returns (uint256);

    /// @notice Invests ETH into the Aave pool.
    /// @param receiver Address of the receiver whose funds are being invested.
    /// @param amount Amount of ETH to invest.
    /// @param _executionNonce Current execution nonce for the transaction.
    /// @param _crossChainTxId Cross-chain transaction ID.
    function _invest(
        address receiver,
        uint256 amount,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) internal virtual;

    /**
     * @notice Deposits funds into the configured yield source.
     * @dev This function is intended to be overridden in derived contracts to define specific deposit logic.
     * @param amount The amount of funds to deposit into the yield source.
     */
    function _depositFundsIntoYieldSource(uint256 amount) internal virtual;

    /**
     * @notice Allows the owner to manually resend an investment confirmation message.
     * @param receiver The address of the receiver to whom the confirmation is sent.
     * @param amount The amount of assets being invested.
     * @param totalUnderlyingAssetsBefore The total underlying assets before the investment.
     * @param totalUnderlyingAssetsAfter The total underlying assets after the investment.
     * @param _executionNonce The execution nonce associated with the investment.
     * @param _crossChainTxId The cross-chain transaction ID.
     */
    function manualResendInvestConfirmation(
        address receiver,
        uint256 amount,
        uint256 totalUnderlyingAssetsBefore,
        uint256 totalUnderlyingAssetsAfter,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) external onlyOwner {
        _sendInvestConfirmation(
            receiver,
            amount,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssetsAfter,
            _executionNonce,
            _crossChainTxId
        );
    }

    /**
     * @dev Sends an investment confirmation message to the gateway.
     * @param receiver The address of the receiver to whom the confirmation is sent.
     * @param amount The amount of assets being invested.
     * @param totalUnderlyingAssetsBefore The total underlying assets before the investment.
     * @param totalUnderlyingAssetsAfter The total underlying assets after the investment.
     * @param _executionNonce The execution nonce associated with the investment.
     * @param _crossChainTxId The cross-chain transaction ID.
     *
     * Notes:
     * - This function encodes the investment details and sends them via the gateway contract.
     * - Includes revert options in case of failure.
     */
    function _sendInvestConfirmation(
        address receiver,
        uint256 amount,
        uint256 totalUnderlyingAssetsBefore,
        uint256 totalUnderlyingAssetsAfter,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) internal {
        bytes memory outgoingMessage = abi.encode(
            address(0),
            receiver,
            address(0),
            amount,
            0,
            0,
            true,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssetsAfter,
            _executionNonce,
            _crossChainTxId,
            0
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

    /**
     * @notice Transfers assets from the current strategy to a new strategy during a strategy switch.
     * @dev This function is intended to be overridden in derived contracts to define specific transfer logic.
     * @param newStrategy The address of the new strategy contract.
     * @param currentExecutionNonce The current execution nonce for the transaction.
     * @param _crossChainTxId The cross-chain transaction ID.
     */
    function _transferAssetsToNewStrategy(
        address newStrategy,
        uint256 currentExecutionNonce,
        uint256 _crossChainTxId
    ) internal virtual;

    /// @notice Withdraws funds from the Aave pool.
    /// @param user Address of the user whose funds are being withdrawn.
    /// @param withdrawZRC20 ZRC20 token address for the withdrawal.
    /// @param amount Amount to withdraw.
    /// @param fee Gas fee for the transaction.
    /// @param withdrawChainId Chain ID for the withdrawal.
    /// @param _executionNonce Current execution nonce for the transaction.
    /// @param _crossChainTxId Cross-chain transaction ID.
    function _divest(
        address user,
        address receiver,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 withdrawChainId,
        uint256 _executionNonce,
        uint256 _crossChainTxId,
        uint16 slippage
    ) internal {
        uint256 totalUnderlyingAssetsBefore = totalUnderlyingAssets();

        _withdrawFundsFromYieldSource(amount + fee);

        uint256 totalUnderlyingAssetsAfter = totalUnderlyingAssets();

        _sendFundsAndDivestConfirmation(
            user,
            receiver,
            withdrawZRC20,
            amount,
            fee,
            withdrawChainId,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssetsAfter,
            _executionNonce,
            _crossChainTxId,
            slippage
        );

        emit FundsDivested(_crossChainTxId, user, amount + fee);
    }

    /**
     * @notice Allows the owner to manually resend a funds and divest confirmation message.
     * @dev Calls the internal `_sendFundsAndDivestConfirmation` function with the provided parameters.
     * @param user The address of the user whose funds are being processed.
     * @param receiver The address of the receiver of the funds.
     * @param withdrawZRC20 The ZRC20 token address for withdrawal.
     * @param amount The amount of funds to process.
     * @param fee The fee associated with the transaction.
     * @param withdrawChainId The ID of the chain to which the funds are being withdrawn.
     * @param totalUnderlyingAssetsBefore The total underlying assets before the divestment.
     * @param totalUnderlyingAssetsAfter The total underlying assets after the divestment.
     * @param _executionNonce The execution nonce associated with the transaction.
     * @param _crossChainTxId The cross-chain transaction ID.
     */
    function manualResendFundsAndDivestConfirmation(
        address user,
        address receiver,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 withdrawChainId,
        uint256 totalUnderlyingAssetsBefore,
        uint256 totalUnderlyingAssetsAfter,
        uint256 _executionNonce,
        uint256 _crossChainTxId,
        uint16 slippage
    ) external onlyOwner {
        _sendFundsAndDivestConfirmation(
            user,
            receiver,
            withdrawZRC20,
            amount,
            fee,
            withdrawChainId,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssetsAfter,
            _executionNonce,
            _crossChainTxId,
            slippage
        );
    }

    /**
     * @dev Sends a funds and divest confirmation message to the Amana vault.
     * @param user The address of the user whose funds are being processed.
     * @param receiver The address of the receiver of the funds.
     * @param withdrawZRC20 The ZRC20 token address for withdrawal.
     * @param amount The amount of funds to process.
     * @param fee The fee associated with the transaction.
     * @param withdrawChainId The ID of the chain to which the funds are being withdrawn.
     * @param totalUnderlyingAssetsBefore The total underlying assets before the divestment.
     * @param totalUnderlyingAssetsAfter The total underlying assets after the divestment.
     * @param _executionNonce The execution nonce associated with the transaction.
     * @param _crossChainTxId The cross-chain transaction ID.
     *
     * Notes:
     * - Constructs the message payload for the funds and divestment confirmation.
     * - Configures revert options in case of failure and sends the message using `_sendDepositAndCall`.
     */
    function _sendFundsAndDivestConfirmation(
        address user,
        address receiver,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 withdrawChainId,
        uint256 totalUnderlyingAssetsBefore,
        uint256 totalUnderlyingAssetsAfter,
        uint256 _executionNonce,
        uint256 _crossChainTxId,
        uint16 slippage
    ) internal {
        bytes memory outgoingMessage = abi.encode(
            user,
            receiver,
            withdrawZRC20,
            amount,
            fee,
            withdrawChainId,
            false,
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssetsAfter,
            _executionNonce,
            _crossChainTxId,
            slippage
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

    /**
     * @dev Sends a deposit and calls the `amanaVault` with the specified outgoing message and revert options.
     * @param amount The amount of native tokens to send with the transaction.
     * @param amanaVault The address of the vault to which the deposit and call are sent.
     * @param outgoingMessage The payload to be passed to the `amanaVault`.
     * @param revertOptions Options specifying how to handle transaction reverts.
     */
    function _sendDepositAndCall(
        uint256 amount,
        address amanaVault,
        bytes memory outgoingMessage,
        RevertOptions memory revertOptions
    ) internal virtual;

    /**
     * @notice Withdraws funds from the configured yield source.
     * @dev This function is intended to be overridden in derived contracts to define specific withdrawal logic.
     * @param amount The amount of funds to withdraw from the yield source.
     * @return The amount of funds successfully withdrawn.
     */
    function _withdrawFundsFromYieldSource(
        uint256 amount
    ) internal virtual returns (uint256);

    /**
     * @notice Sends an update of total underlying assets managed by this contract to the configured vault.
     * @dev Encodes the message payload and uses the GatewayEVM contract to send the message.
     *
     * Notes:
     * - Configures revert options in case of failure.
     * - Emits a `TotalUnderlyingAssetsSent` event upon successful execution.
     */
    function sendTotalUnderlyingAssetsToVault() external {
        uint256 currentExecutionNonce = executionNonce;
        executionNonce++;
        // Construct the message payload with the desired information
        bytes memory outgoingMessage = abi.encode(
            address(0),
            address(0),
            address(0),
            block.number,
            block.timestamp,
            0,
            false,
            0,
            totalUnderlyingAssets(),
            currentExecutionNonce,
            0,
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
            totalUnderlyingAssets(),
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
