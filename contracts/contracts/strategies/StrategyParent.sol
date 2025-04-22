// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";
import "../interfaces/IWETH.sol";
import "../interfaces/I4626Vault.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IErrors.sol";
import "../interfaces/IDistributor.sol";

/// @title StrategyParent
/// @notice Base contract for cross-chain investment strategies.
/// @dev Handles common logic for investing, divesting, and cross-chain messaging.
abstract contract StrategyParent is Ownable2Step, IErrors {
    using SafeERC20 for IERC20;

    address constant GATEWAY_ADDRESS =
        0x48B9AACC350b20147001f88821d31731Ba4C30ed;

    string public name;
    address public amanaVault;
    address public withdrawHelper;
    uint256 public executionNonce = 1;
    address public oldStrategy;
    address public rewardsDistributor;

    event FundsInvested(
        bytes32 indexed crossChainTxId,
        address user,
        uint256 amount
    );
    event FundsDivested(
        bytes32 indexed crossChainTxId,
        address user,
        uint256 amount
    );
    event InvestConfirmFailed(bytes32 indexed crossChainTxId);
    event ReturnFundsFromStrategyFailed(bytes32 indexed crossChainTxId);
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
        bytes32 crossChainTxId
    );
    event AssetsReceivedFromOldStrategy(
        address indexed oldStrategy,
        uint256 totalAssetsTransferrred,
        uint256 executionNonce,
        bytes32 crossChainTxId
    );
    event RewardsClaimed(
        address indexed receiver,
        address indexed rewardToken,
        uint256 amount
    );
    event RewardsHarvested(
        uint256 rewardsClaimed,
        uint256 rewardsSwapped,
        uint256 inputTokenReinvested
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
        address _gateway,
        address _withdrawHelper
    ) Ownable(msg.sender) {
        if (_amanaVault == address(0)) revert InvalidAddress();
        name = _name;
        amanaVault = _amanaVault;
        _GATEWAY_ADDRESS = _gateway;
        withdrawHelper = _withdrawHelper;
    }

    /// @notice Processes calls from the Gateway for deposits or withdrawals.
    /// @param context The message context from the Gateway.
    /// @param message Encoded data specifying the transaction details.
    function onCall(
        MessageContext calldata context,
        bytes calldata message
    ) external payable onlyGateway returns (bytes memory result) {
        if (
            context.sender != address(amanaVault) &&
            context.sender != withdrawHelper
        ) {
            revert OnlyVault();
        }
        (
            address user,
            address receiver,
            address ZRC20AddressOrNewStrategy,
            address withdrawERC20,
            uint256 amount,
            uint256 fraction,
            uint256 minimumOut,
            uint32 withdrawChainId,
            bool isDeposit,
            bytes32 crossChainTxId,
            uint16 slippage
        ) = abi.decode(
                message,
                (
                    address,
                    address,
                    address,
                    address,
                    uint256,
                    uint256,
                    uint256,
                    uint32,
                    bool,
                    bytes32,
                    uint16
                )
            );

        uint256 currentExecutionNonce = executionNonce;
        executionNonce++;

        if (user == address(0) && receiver == address(0)) {
            _transferAssetsToNewStrategy(
                fraction,
                minimumOut,
                ZRC20AddressOrNewStrategy,
                currentExecutionNonce,
                crossChainTxId
            );
            return abi.encode(true);
        } else if (isDeposit) {
            _invest(
                receiver,
                amount,
                minimumOut,
                currentExecutionNonce,
                crossChainTxId
            );
            return abi.encode(true);
        } else {
            _divest(
                user,
                receiver,
                ZRC20AddressOrNewStrategy,
                withdrawERC20,
                amount,
                fraction,
                minimumOut,
                withdrawChainId,
                currentExecutionNonce,
                crossChainTxId,
                slippage
            );
            return abi.encode(true);
        }
    }

    function updateWithdrawHelper(address _withdrawHelper) external onlyOwner {
        if (_withdrawHelper == address(0)) revert InvalidAddress();
        withdrawHelper = _withdrawHelper;
    }

    function updateVault(address _amanaVault) external onlyOwner {
        if (_amanaVault == address(0)) revert InvalidAddress();
        amanaVault = _amanaVault;
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

    function setExecutionNonce(uint256 _executionNonce) external onlyOwner {
        executionNonce = _executionNonce;
    }

    /**
     * @notice Sets the address of the Merkl rewards distributor contract.
     * @param _rewardsDistributor The address of the rewards distributor contract.
     */
    function setRewardsDistributor(
        address _rewardsDistributor
    ) external onlyOwner {
        rewardsDistributor = _rewardsDistributor;
    }

    /**
     * @notice Whitelists an operator for rewards distribution.
     * @param operator can whitelist a wallet that can claim merkl rewards on behalf of this strategy
     */
    function whitelistOperatorForRewards(address operator) external onlyOwner {
        IDistributor(rewardsDistributor).toggleOperator(
            address(this),
            operator
        );
    }

    /**
     * @notice Returns the total underlying assets managed by the contract.
     * @return The total amount of underlying assets in the contract.
     */
    function totalUnderlyingAssets() public view virtual returns (uint256);

    function convertToShares(
        uint256 assetAmount
    ) public view virtual returns (uint256) {
        return assetAmount;
    }

    function convertToAssets(
        uint256 shares
    ) public view virtual returns (uint256) {
        return shares;
    }

    function getStrategyWithdrawShareAmount(
        uint256 fractionOfTotalShares
    ) public view virtual returns (uint256 withdrawShareAmount);

    /// @notice Invests assets into the yield source
    /// @param receiver Address of the receiver whose funds are being invested.
    /// @param amount Amount of asset to invest.
    /// @param _executionNonce Current execution nonce for the transaction.
    /// @param _crossChainTxId Cross-chain transaction ID.
    function _invest(
        address receiver,
        uint256 amount,
        uint256 minimumOut,
        uint256 _executionNonce,
        bytes32 _crossChainTxId
    ) internal virtual;

    /**
     * @notice Deposits funds into the configured yield source.
     * @dev This function is intended to be overridden in derived contracts to define specific deposit logic.
     * @param amount The amount of funds to deposit into the yield source.
     */
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal virtual;

    /**
     * @notice Allows the owner to manually resend an investment confirmation message.
     * @param receiver The address of the receiver to whom the confirmation is sent.
     * @param amount The amount of assets being invested.
     * @param totalUnderlyingAssetsAfter The total underlying assets after the investment.
     * @param _executionNonce The execution nonce associated with the investment.
     * @param _crossChainTxId The cross-chain transaction ID.
     */
    function manualResendInvestConfirmation(
        address receiver,
        uint256 amount,
        uint256 totalUnderlyingAssetsAfter,
        uint256 _executionNonce,
        bytes32 _crossChainTxId
    ) external onlyOwner {
        _sendInvestConfirmation(
            receiver,
            amount,
            totalUnderlyingAssetsAfter,
            _executionNonce,
            _crossChainTxId
        );
    }

    /**
     * @dev Sends an investment confirmation message to the gateway.
     * @param receiver The address of the receiver to whom the confirmation is sent.
     * @param amount The amount of assets being invested.
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
        uint256 totalUnderlyingAssetsAfter,
        uint256 _executionNonce,
        bytes32 _crossChainTxId
    ) internal {
        bytes memory outgoingMessage = abi.encode(
            address(0), // user
            receiver,
            address(this), // withdrawZRC20
            address(0), // withdrawERC20
            amount,
            0, // fractionOfTotalShares
            0, // withdrawChainId
            true, // isDeposit
            totalUnderlyingAssetsAfter,
            _executionNonce,
            _crossChainTxId,
            0
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this),
            false,
            address(this),
            abi.encode(
                "_investConfirmFailed",
                _crossChainTxId,
                _executionNonce,
                amount,
                receiver,
                0 // vaultSharesToBeBurnt
            ),
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
        uint256 minimumAmountOut,
        uint256 minimumSharesOut,
        address newStrategy,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) internal virtual;

    /// @notice Withdraws funds from the yield source.
    /// @param user Address of the user whose funds are being withdrawn.
    /// @param withdrawZRC20 ZRC20 token address for the withdrawal.
    /// @param vaultSharesToBeBurnt amount of vault shares to be burnt.
    /// @param fractionOfTotalShares Amount to withdraw.
    /// @param withdrawChainId Chain ID for the withdrawal.
    /// @param _executionNonce Current execution nonce for the transaction.
    /// @param _crossChainTxId Cross-chain transaction ID.
    function _divest(
        address user,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        uint256 vaultSharesToBeBurnt,
        uint256 fractionOfTotalShares,
        uint256 minAmountOut,
        uint32 withdrawChainId,
        uint256 _executionNonce,
        bytes32 _crossChainTxId,
        uint16 slippage
    ) internal virtual {
        uint256 amountWithdrawn = _withdrawFundsFromYieldSource(
            fractionOfTotalShares,
            minAmountOut
        );

        uint256 totalUnderlyingAssetsAfter = totalUnderlyingAssets();

        _sendFundsAndDivestConfirmation(
            user,
            receiver,
            withdrawZRC20,
            withdrawERC20,
            amountWithdrawn,
            vaultSharesToBeBurnt,
            withdrawChainId,
            totalUnderlyingAssetsAfter,
            _executionNonce,
            _crossChainTxId,
            slippage
        );

        emit FundsDivested(_crossChainTxId, user, amountWithdrawn);
    }

    /**
     * @notice Allows the owner to manually resend a funds and divest confirmation message.
     * @dev Calls the internal `_sendFundsAndDivestConfirmation` function with the provided parameters.
     * @param user The address of the user whose funds are being processed.
     * @param receiver The address of the receiver of the funds.
     * @param withdrawZRC20 The ZRC20 token address for withdrawal.
     * @param amountWithdrawn The amount of funds to process.
     * @param withdrawChainId The ID of the chain to which the funds are being withdrawn.
     * @param totalUnderlyingAssetsAfter The total underlying assets after the divestment.
     * @param _executionNonce The execution nonce associated with the transaction.
     * @param _crossChainTxId The cross-chain transaction ID.
     */
    function manualResendFundsAndDivestConfirmation(
        address user,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        uint256 amountWithdrawn,
        uint256 vaultSharesToBeBurnt,
        uint32 withdrawChainId,
        uint256 totalUnderlyingAssetsAfter,
        uint256 _executionNonce,
        bytes32 _crossChainTxId,
        uint16 slippage
    ) external onlyOwner {
        _sendFundsAndDivestConfirmation(
            user,
            receiver,
            withdrawZRC20,
            withdrawERC20,
            amountWithdrawn,
            vaultSharesToBeBurnt,
            withdrawChainId,
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
     * @param amountWithdrawn The amount of funds to process.
     * @param withdrawChainId The ID of the chain to which the funds are being withdrawn.
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
        address withdrawERC20,
        uint256 amountWithdrawn,
        uint256 vaultSharesToBeBurnt,
        uint32 withdrawChainId,
        uint256 totalUnderlyingAssetsAfter,
        uint256 _executionNonce,
        bytes32 _crossChainTxId,
        uint16 slippage
    ) internal {
        bytes memory outgoingMessage = abi.encode(
            user,
            receiver,
            withdrawZRC20,
            withdrawERC20,
            amountWithdrawn,
            vaultSharesToBeBurnt,
            withdrawChainId,
            false,
            totalUnderlyingAssetsAfter,
            _executionNonce,
            _crossChainTxId,
            slippage
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this),
            true,
            address(this),
            abi.encode(
                "_returnFundsFromStrategyFailed",
                _crossChainTxId,
                _executionNonce,
                amountWithdrawn,
                user,
                vaultSharesToBeBurnt
            ),
            uint256(1000000)
        );
        _sendDepositAndCall(
            amountWithdrawn,
            amanaVault,
            outgoingMessage,
            revertOptions
        );
    }

    /**
     * @dev Sends a deposit and calls the `amanaVault` with the specified outgoing message and revert options.
     * @param amountWithdrawn The amount of native tokens to send with the transaction.
     * @param amanaVault The address of the vault to which the deposit and call are sent.
     * @param outgoingMessage The payload to be passed to the `amanaVault`.
     * @param revertOptions Options specifying how to handle transaction reverts.
     */
    function _sendDepositAndCall(
        uint256 amountWithdrawn,
        address amanaVault,
        bytes memory outgoingMessage,
        RevertOptions memory revertOptions
    ) internal virtual;

    /**
     * @notice Withdraws funds from the configured yield source.
     * @dev This function is intended to be overridden in derived contracts to define specific withdrawal logic.
     * @param fractionOfTotalShares The fraction of shares to withdraw from the yield source.
     * @param minAmountOut The minimum amount of funds to withdraw.
     * @return The amount of funds successfully withdrawn.
     */
    function _withdrawFundsFromYieldSource(
        uint256 fractionOfTotalShares,
        uint256 minAmountOut
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
        uint256 nonceToUse = executionNonce;
        address user = address(0);
        uint256 vaultSharesToBeBurnt = 0;
        executionNonce++;
        _sendUpdateToVault(user, vaultSharesToBeBurnt, nonceToUse);
    }

    function _sendUpdateToVault(
        address user,
        uint256 vaultSharesToBeBurnt,
        uint256 nonceToUse
    ) internal {
        bytes memory outgoingMessage = abi.encode(
            user,
            address(0),
            address(0),
            address(0),
            block.number,
            vaultSharesToBeBurnt,
            0,
            false,
            totalUnderlyingAssets(),
            nonceToUse,
            0,
            0
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this),
            false,
            address(this),
            abi.encode(
                "_handleRevertOnSendTotalUnderlyingAssets",
                bytes32(0),
                nonceToUse,
                totalUnderlyingAssets(),
                user,
                vaultSharesToBeBurnt
            ),
            1_000_000
        );

        IGatewayEVM(_GATEWAY_ADDRESS).call(
            amanaVault,
            outgoingMessage,
            revertOptions
        );

        emit TotalUnderlyingAssetsSent(
            amanaVault,
            totalUnderlyingAssets(),
            block.number,
            block.timestamp
        );
    }

    /// @notice Safely approves an allowance for a spender.
    function approveOrIncreaseAllowance(
        IERC20 token,
        address spender,
        uint256 amount
    ) internal {
        uint256 currentAllowance = token.allowance(msg.sender, spender);

        if (currentAllowance == 0) {
            // First-time approval
            token.approve(spender, amount);
        } else {
            // Handle USDT-like tokens by forcing reset to zero first
            token.approve(spender, 0); // Reset to zero
            token.approve(spender, amount); // Set new allowance
        }
    }

    /// @notice Handles reverts from the Gateway.
    /// @param context Context of the revert.
    function onRevert(
        RevertContext calldata context
    ) external virtual onlyGateway {
        (
            string memory revertMessage,
            bytes32 _crossChainTxId,
            uint256 _executionNonce,
            uint256 amount,
            address userOrReceiver,
            uint256 vaultSharesToBeBurnt
        ) = abi.decode(
                context.revertMessage,
                (string, bytes32, uint256, uint256, address, uint256)
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
            _depositFundsIntoYieldSource(context.amount, 0);
            _sendUpdateToVault(
                userOrReceiver,
                vaultSharesToBeBurnt,
                _executionNonce
            );
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
