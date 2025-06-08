// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";
import "../interfaces/IWETH.sol";
import "../interfaces/I4626Vault.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IErrors.sol";
import "../interfaces/IDistributor.sol";
import "../interfaces/ISwapHelper.sol";
import "hardhat/console.sol";

/// @title StrategyParent
/// @notice Base contract for cross-chain investment strategies.
/// @dev Handles common logic for investing, divesting, and cross-chain messaging.
abstract contract StrategyParent is
    Initializable,
    Ownable2StepUpgradeable,
    UUPSUpgradeable,
    IErrors
{
    using SafeERC20 for IERC20;

    string public name;
    address public amanaVault;
    address public withdrawHelper;
    address public oldStrategy;
    address public rewardsDistributor;

    address public _GATEWAY_ADDRESS;

    uint256 public lastProcessedNonce;

    uint16 public harvestSwapSlippage;
    uint256 public minClaimableReward; // Default: 0.005

    address public swapHelper;

    enum TxType {
        Deposit,
        Withdraw,
        Switch,
        Revert
    }

    struct BufferedTx {
        TxType txType;
        uint256 assetAmount;
        uint256 minimumOut;
        address newStrategy; // only for switch, optional otherwise
    }

    mapping(uint256 => BufferedTx) public pendingByNonce;

    IERC20 public inputToken;
    address public receiptTokenAddress;

    bytes32 internal constant TX_DEPOSIT_CONFIRMED =
        keccak256("DepositConfirmed");
    bytes32 internal constant TX_WITHDRAW_CONFIRMED =
        keccak256("WithdrawConfirmed");
    bytes32 internal constant TX_SWITCH_CONFIRMED =
        keccak256("SwitchConfirmed");
    bytes32 internal constant TX_DEPOSIT_REVERTED =
        keccak256("DepositReverted");
    bytes32 internal constant TX_WITHDRAW_REVERTED =
        keccak256("WithdrawReverted");
    bytes32 internal constant TX_SWITCH_REVERTED = keccak256("SwitchReverted");
    bytes32 internal constant TX_TOTAL_ASSETS_UPDATE =
        keccak256("TotalAssetsUpdated");

    event FundsInvested(
        uint256 indexed vaultNonce,
        uint256 amount,
        uint256 totalAssetsAfter
    );
    event FundsDivested(
        uint256 indexed vaultNonce,
        uint256 amount,
        uint256 totalAssetsAfter
    );
    event InvestConfirmFailed(
        uint256 indexed vaultNonce,
        uint256 totalAssetsAfter
    );
    event ReturnFundsFromStrategyFailed(
        uint256 indexed vaultNonce,
        uint256 withdrawnAmount,
        uint256 totalAssetsAfter
    );
    event TotalUnderlyingAssetsSent(
        uint256 indexed vaultNonce,
        uint256 totalUnderlyingAssets
    );
    event SendTotalUnderlyingAssetsFailed(
        uint256 indexed vaultNonce,
        uint256 totalAssetsAfter
    );
    event AssetsTransferredToNewStrategy(
        address indexed newStrategy,
        uint256 totalAssetsTransferrred,
        uint256 vaultNonce
    );
    event AssetsReceivedFromOldStrategy(
        address indexed oldStrategy,
        uint256 totalAssetsTransferrred,
        uint256 vaultNonce
    );
    event RewardsClaimed(
        address indexed strategy,
        address indexed rewardToken,
        uint256 amount
    );
    event RewardsHarvested(
        address indexed rewardToken,
        uint256 rewardAmount,
        uint256 inputTokenReceived
    );
    event RewardClaimFailed(string reason);
    event SwapFailed(
        address indexed rewardToken,
        uint256 amount,
        string reason
    );

    modifier onlyGateway() {
        if (msg.sender != _GATEWAY_ADDRESS) {
            revert OnlyGateway();
        }
        _;
    }

    function __StrategyParent_init(
        string memory _name,
        address _amanaVault,
        address _gateway,
        address _withdrawHelper,
        address _inputTokenAddress,
        address _receiptTokenAddress
    ) internal onlyInitializing {
        __Ownable_init(msg.sender);
        name = _name;
        amanaVault = _amanaVault;
        _GATEWAY_ADDRESS = _gateway;
        withdrawHelper = _withdrawHelper;
        inputToken = IERC20(_inputTokenAddress);
        receiptTokenAddress = _receiptTokenAddress;
        minClaimableReward = 5 * 10 ** 15; // 0.005
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

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
            TxType txType,
            uint256 assetAmount,
            uint256 minimumOut,
            address newStrategy,
            uint256 vaultNonce
        ) = abi.decode(message, (TxType, uint256, uint256, address, uint256));

        if (txType == TxType.Deposit && msg.value == 0) {
            SafeERC20.safeTransferFrom(
                inputToken,
                msg.sender,
                address(this),
                assetAmount
            );
        }
        pendingByNonce[vaultNonce] = BufferedTx({
            txType: txType,
            assetAmount: assetAmount,
            minimumOut: minimumOut,
            newStrategy: newStrategy
        });

        if (vaultNonce == lastProcessedNonce + 1) {
            _processBufferedTransactions();
        }

        return abi.encode(true);
    }

    function processBufferedTransactions() external onlyOwner {
        _processBufferedTransactions();
    }

    function _processBufferedTransactions() internal {
        while (true) {
            uint256 nextNonce = lastProcessedNonce + 1;
            BufferedTx storage txData = pendingByNonce[nextNonce];

            // Break if nothing is pending for this nonce
            if (
                txData.txType == TxType(0) &&
                txData.assetAmount == 0 &&
                txData.minimumOut == 0 &&
                txData.newStrategy == address(0)
            ) {
                break;
            }

            if (txData.txType == TxType.Deposit) {
                _invest();
            } else if (txData.txType == TxType.Withdraw) {
                _divest();
            } else if (txData.txType == TxType.Switch) {
                _transferAssetsToNewStrategy();
            } else if (txData.txType == TxType.Revert) {
                _sendUpdateToVault(nextNonce, TX_DEPOSIT_REVERTED);
            } else {
                revert("Unknown TxType");
            }

            delete pendingByNonce[nextNonce];
            lastProcessedNonce = nextNonce;
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

    function setLastProcessedNonce(
        uint256 _lastProcessedNonce
    ) external onlyOwner {
        lastProcessedNonce = _lastProcessedNonce;
    }

    function setHarvestSwapSlippage(uint16 _slippage) external onlyOwner {
        require(_slippage <= 10000, "Slippage too high");
        harvestSwapSlippage = _slippage;
    }

    function setMinClaimableReward(uint256 newThreshold) external onlyOwner {
        require(newThreshold < 1 ether, "Too high"); // Optional sanity check
        minClaimableReward = newThreshold;
    }

    function setSwapHelper(address _swapHelper) external onlyOwner {
        if (_swapHelper == address(0)) revert InvalidAddress();
        swapHelper = _swapHelper;
    }

    function claimRewards() public virtual returns (uint256) {}

    function _reinvestRewards() internal virtual {}

    function harvest() public virtual {
        claimRewards();
        _reinvestRewards();
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
    function _invest() internal virtual;

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
     * @param totalUnderlyingAssetsAfter The total underlying assets after the investment.
     * @param vaultNonce The execution nonce associated with the investment.
     */
    function manualResendInvestConfirmation(
        uint256 totalUnderlyingAssetsBefore,
        uint256 totalUnderlyingAssetsAfter,
        uint256 vaultNonce
    ) external onlyOwner {
        _sendInvestConfirmation(
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssetsAfter,
            vaultNonce
        );
    }

    /**
     * @dev Sends an investment confirmation message to the gateway.

     * @param totalUnderlyingAssetsAfter The total underlying assets after the investment.

     *
     * Notes:
     * - This function encodes the investment details and sends them via the gateway contract.
     * - Includes revert options in case of failure.
     */
    function _sendInvestConfirmation(
        uint256 totalUnderlyingAssetsBefore,
        uint256 totalUnderlyingAssetsAfter,
        uint256 vaultNonce
    ) internal {
        bytes memory outgoingMessage = abi.encode(
            totalUnderlyingAssetsBefore,
            totalUnderlyingAssetsAfter,
            vaultNonce,
            TX_DEPOSIT_CONFIRMED
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this),
            false,
            address(this),
            abi.encode(
                "_investConfirmFailed",
                0,
                totalUnderlyingAssetsAfter,
                vaultNonce
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
     */
    function _transferAssetsToNewStrategy() internal virtual;

    /// @notice Withdraws funds from the yield source.
    function _divest() internal virtual {
        BufferedTx storage txData = pendingByNonce[lastProcessedNonce + 1];
        uint256 amountWithdrawn = _withdrawFundsFromYieldSource(
            txData.assetAmount,
            txData.minimumOut
        );

        uint256 totalUnderlyingAssetsAfter = totalUnderlyingAssets();

        _sendFundsAndDivestConfirmation(
            amountWithdrawn,
            totalUnderlyingAssetsAfter,
            lastProcessedNonce + 1
        );

        emit FundsDivested(
            lastProcessedNonce + 1,
            amountWithdrawn,
            totalUnderlyingAssetsAfter
        );
    }

    /**
     * @notice Allows the owner to manually resend a funds and divest confirmation message.
     * @dev Calls the internal `_sendFundsAndDivestConfirmation` function with the provided parameters.
     * @param amountWithdrawn The amount of funds to process.
     */
    function manualResendFundsAndDivestConfirmation(
        uint256 amountWithdrawn,
        uint256 totalUnderlyingAssetsAfter,
        uint256 vaultNonce
    ) external onlyOwner {
        _sendFundsAndDivestConfirmation(
            amountWithdrawn,
            totalUnderlyingAssetsAfter,
            vaultNonce
        );
    }

    /**
     * @dev Sends a funds and divest confirmation message to the Amana vault.
     * @param amountWithdrawn The amount of funds to process.

     *
     * Notes:
     * - Constructs the message payload for the funds and divestment confirmation.
     * - Configures revert options in case of failure and sends the message using `_sendDepositAndCall`.
     */
    function _sendFundsAndDivestConfirmation(
        uint256 amountWithdrawn,
        uint256 totalUnderlyingAssetsAfter,
        uint256 vaultNonce
    ) internal {
        bytes memory outgoingMessage = abi.encode(
            amountWithdrawn,
            totalUnderlyingAssetsAfter,
            vaultNonce,
            TX_WITHDRAW_CONFIRMED
        );
        RevertOptions memory revertOptions = RevertOptions(
            address(this),
            true,
            address(this),
            abi.encode(
                "_returnFundsFromStrategyFailed",
                amountWithdrawn,
                totalUnderlyingAssetsAfter,
                vaultNonce
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
        _sendUpdateToVault(lastProcessedNonce, TX_TOTAL_ASSETS_UPDATE);
    }

    function _sendUpdateToVault(uint256 nonceToUse, bytes32 txStatus) internal {
        bytes memory outgoingMessage = abi.encode(
            0,
            totalUnderlyingAssets(),
            nonceToUse,
            txStatus
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this),
            false,
            address(this),
            abi.encode(
                "_handleRevertOnSendTotalUnderlyingAssets",
                0,
                totalUnderlyingAssets(),
                nonceToUse
            ),
            1_000_000
        );

        IGatewayEVM(_GATEWAY_ADDRESS).call(
            amanaVault,
            outgoingMessage,
            revertOptions
        );

        emit TotalUnderlyingAssetsSent(nonceToUse, totalUnderlyingAssets());
    }

    /// @notice Safely approves an allowance for a spender.
    function approveOrIncreaseAllowance(
        IERC20 token,
        address spender,
        uint256 amount
    ) internal {
        console.log("Approving spender %s for amount %s", spender, amount);
        bytes memory approveCalldata = abi.encodeWithSelector(
            IERC20.approve.selector,
            spender,
            amount
        );

        (bool success, ) = address(token).call(approveCalldata);
        if (success) return;

        // If initial approve failed, try resetting to zero first
        bytes memory resetCalldata = abi.encodeWithSelector(
            IERC20.approve.selector,
            spender,
            0
        );
        (bool resetSuccess, ) = address(token).call(resetCalldata);
        require(resetSuccess, "Reset to 0 failed");
        console.log("Reset to 0 succeeded, retrying approve");
        (bool secondApproveSuccess, ) = address(token).call(approveCalldata);
        require(secondApproveSuccess, "Second approve failed");
    }

    /// @notice Handles reverts from the Gateway.
    /// @param context Context of the revert.
    function onRevert(
        RevertContext calldata context
    ) external virtual onlyGateway {
        (
            string memory revertMessage,
            uint256 withdrawnAmount,
            uint256 totalAssetsAfter,
            uint256 vaultNonce
        ) = abi.decode(
                context.revertMessage,
                (string, uint256, uint256, uint256)
            );

        if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_investConfirmFailed"))
        ) {
            _sendUpdateToVault(vaultNonce, TX_DEPOSIT_REVERTED);
            emit InvestConfirmFailed(vaultNonce, totalAssetsAfter);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_returnFundsFromStrategyFailed"))
        ) {
            _depositFundsIntoYieldSource(context.amount, 1);
            _sendUpdateToVault(vaultNonce, TX_WITHDRAW_REVERTED);
            emit ReturnFundsFromStrategyFailed(
                vaultNonce,
                withdrawnAmount,
                totalAssetsAfter
            );
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_handleRevertOnSendTotalUnderlyingAssets"))
        ) {
            emit SendTotalUnderlyingAssetsFailed(vaultNonce, totalAssetsAfter);
        } else {
            revert("Revert not handled");
        }
    }

    /// @notice Handles reverts from the Gateway.
    /// @param context Context of the revert.
    function onAbort(
        AbortContext calldata context
    ) external virtual onlyGateway {
        (
            string memory revertMessage,
            uint256 withdrawnAmount,
            uint256 totalAssetsAfter,
            uint256 vaultNonce
        ) = abi.decode(
                context.revertMessage,
                (string, uint256, uint256, uint256)
            );

        if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_investConfirmFailed"))
        ) {
            _sendUpdateToVault(vaultNonce, TX_DEPOSIT_REVERTED);
            emit InvestConfirmFailed(vaultNonce, totalAssetsAfter);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_returnFundsFromStrategyFailed"))
        ) {
            // _depositFundsIntoYieldSource(context.amount, 1);
            _sendUpdateToVault(vaultNonce, TX_WITHDRAW_REVERTED);
            emit ReturnFundsFromStrategyFailed(
                vaultNonce,
                withdrawnAmount,
                totalAssetsAfter
            );
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_handleRevertOnSendTotalUnderlyingAssets"))
        ) {
            emit SendTotalUnderlyingAssetsFailed(vaultNonce, totalAssetsAfter);
        } else {
            revert("Revert not handled");
        }
    }
}
