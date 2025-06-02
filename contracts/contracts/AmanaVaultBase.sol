// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./ERC4626RewardsUpgradeable.sol";

import "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/ISystem.sol";
import "./interfaces/IGasTank.sol";
import "./interfaces/IErrors.sol";
import "./interfaces/IZapContract.sol";
import "./interfaces/IZRC20.sol";
import "./interfaces/IWithdrawHelper.sol";
import "./interfaces/ISwapHelper.sol";
import "./interfaces/IAmanaRegistry.sol";

/// @title Amana Connected Chain Vault
/// @notice A vault that interacts with ZetaChain-connected strategies
/// @dev Implements ERC4626 with custom cross-chain functionality
abstract contract AmanaVaultBase is
    Initializable,
    ERC4626RewardsUpgradeable,
    UUPSUpgradeable,
    UniversalContract,
    IErrors
{
    using SafeERC20 for IERC20;
    using Math for uint256;

    // Constants
    address constant _GATEWAY_ADDRESS =
        0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E;
    address constant _SYSTEM_ADDRESS =
        0x91d18e54DAf4F677cB28167158d6dd21F6aB3921;

    // Variables
    address public strategyAddress;

    address public registry;

    uint256 internal totalPrincipal;

    uint32 public gasLimitForWithdrawAndCall; // this is used in two places - for investing into the strategy and returning funds to the user
    uint32 public gasLimitForCall; // this is used in two places - for the switchStrategy function (divest and invest) and for a call to divest
    uint16 public perfFee;
    bool public depositsPaused;

    mapping(address => uint256) internal userPrincipal;

    uint256 latestTotalAssetsUpdateFromStrategy;
    uint256 public lastProcessedNonce;

    struct Transaction {
        address user;
        address receiver;
        address withdrawZRC20;
        address withdrawERC20;
        uint256 amount;
        uint256 minOut;
        uint32 withdrawChainId;
        bool isDeposit;
        uint256 totalAssetsAfter;
        bytes32 txStatus;
        uint16 slippage;
    }

    mapping(uint256 => Transaction) public transactions; // Buffer for out-of-order confirmations
    mapping(address => uint256) public pendingWithdrawals;
    bool public depositFeePaidFromGasTank;
    uint256 public vaultNonce; // TODO need to initialize this to 1!
    mapping(uint256 => bytes) public nonEvmAddressByNonce;

    // Transaction type identifiers (simulate enum)
    bytes32 internal constant TX_DEPOSIT_INITIATED =
        keccak256("DepositInitiated");
    bytes32 internal constant TX_DEPOSIT_CONFIRMED =
        keccak256("DepositConfirmed");
    bytes32 internal constant TX_WITHDRAW_INITIATED =
        keccak256("WithdrawInitiated");
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
        keccak256("TotalAssetsUpdate");

    modifier onlyGateway() {
        if (msg.sender != _GATEWAY_ADDRESS) revert OnlyGateway();
        _;
    }

    modifier onlyOwnerOrWithdrawHelper() {
        if (
            msg.sender != owner() &&
            msg.sender != IAmanaRegistry(registry).withdrawHelper()
        ) {
            revert OwnableUnauthorizedAccount(msg.sender);
        }
        _;
    }

    modifier whenNotPaused() {
        if (depositsPaused) revert DepositsPaused();
        _;
    }

    event StrategyUpdated(address indexed newStrategyAddress);
    event PerformanceFeePaid(address indexed user, uint256 amount);
    event PerformanceFeeUpdated(uint16 newFeeRate);
    event VaultInitialized(uint8 decimals, uint256 perfFee);

    event Deposited(
        address indexed user,
        uint256 amount,
        uint256 shares,
        uint256 indexed vaultNonce
    );

    event Withdrawn(
        address indexed user,
        uint256 amount,
        uint256 shares,
        uint256 indexed vaultNonce
    );

    event TotalAssetsUpdated(uint256 totalAssets, uint256 vaultNonce);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the vault contract.
     * @param name Name of the vault token.
     * @param symbol Symbol of the vault token.
     * @param asset The underlying asset for the vault.
     * @param registry_ Registry address
     * @param perfFee_ Performance fee rate.
     */
    function __AmanaVaultBase_init(
        string memory name,
        string memory symbol,
        IERC20 asset,
        address owner,
        address registry_,
        uint16 perfFee_,
        uint32 gasLimitWithdrawAndCall_,
        uint32 gasLimitCall_
    ) internal onlyInitializing {
        __ERC4626RewardsUpgradeable_init(asset, name, symbol, owner); // <- this already calls the base in correct order
        __UUPSUpgradeable_init(); // <- comes after the ERC4626 chain

        if (registry_ == address(0)) revert InvalidAddress();
        registry = registry_;
        perfFee = perfFee_;
        totalPrincipal = 1;
        vaultNonce = 1;
        gasLimitForWithdrawAndCall = gasLimitWithdrawAndCall_;
        gasLimitForCall = gasLimitCall_;
    }

    /**
     * @dev Authorizes an upgrade for the contract. Restricted to the owner.
     * @param newImplementation Address of the new implementation contract.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    /**
     * @dev Handles cross-chain communication via the gateway.
     * @param context Message context including origin and sender.
     * @param zrc20 ZRC20 token involved in the call.
     * @param amount Amount of ZRC20 tokens involved.
     * @param message Encoded message for further processing.
     */
    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external virtual override;

    function toggleDepositsPaused() external onlyOwner {
        depositsPaused = !depositsPaused;
    }

    /**
     * @dev Sets the strategy for the vault. Can only be called by the owner.
     * @param _strategyAddress The address of the new strategy.
     * @notice Emits a `StrategyUpdated` event upon success.
     */
    function setStrategy(
        address _strategyAddress
    ) external onlyOwnerOrWithdrawHelper {
        if (_strategyAddress == address(0)) revert InvalidAddress();
        strategyAddress = _strategyAddress;
        emit StrategyUpdated(_strategyAddress);
    }

    function setRegistry(address _registry) external onlyOwner {
        if (_registry == address(0)) revert InvalidAddress();
        registry = _registry;
    }

    /**
     * @dev Updates the performance fee rate for the vault. Can only be called by the owner.
     * @param newFeeRate The new performance fee rate, expressed in basis points.
     * @notice Reverts if the fee rate exceeds 2000 basis points (20%).
     * @notice Emits a `PerformanceFeeUpdated` event upon success.
     */
    function setPerformanceFee(uint16 newFeeRate) external onlyOwner {
        if (newFeeRate > 2000) revert FeeExceedsLimit();
        perfFee = newFeeRate;
        emit PerformanceFeeUpdated(newFeeRate);
    }

    /**
     * @dev Sets the gas limit for the withdraw and call function. Can only be called by the owner.
     * @dev This needs to be set as low as possible to avoid wasting gas
     * @dev This may change depending on the complexity of the strategy's invest function
     * @param _GasLimitWithdrawAndCall The new gas limit for the withdraw and call function
     * @param _gasLimitCall The new gas limit for the call function
     */
    function setGasLimits(
        uint32 _GasLimitWithdrawAndCall,
        uint32 _gasLimitCall
    ) external onlyOwner {
        gasLimitForWithdrawAndCall = _GasLimitWithdrawAndCall;
        gasLimitForCall = _gasLimitCall;
    }

    /**
     * @dev Switches the strategy of the vault. Can only be called by the owner.
     *      Divests from the current strategy and invests in the new one.
     * @param newStrategyAddress The address of the new strategy.
     * @notice Reverts if the new strategy address is invalid or unchanged.
     * @notice Emits a `StrategyUpdated` event upon success.
     */
    function switchStrategy(
        address newStrategyAddress,
        uint256 minAmountOut,
        uint256 minSharesOut
    ) external virtual;

    /**
     * @dev Allows the owner to withdraw all of a specified token from the vault in case of an emergency.
     * @param _token The address of the token to withdraw.
     * @notice Reverts if the vault has no balance of the specified token.
     */
    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance == 0) revert NothingToWithdraw();
        SafeERC20.safeTransfer(IERC20(_token), owner(), balance);
    }

    /** @dev See {IERC4626-deposit}. */
    function deposit(
        uint256 assets,
        uint256 minimumOut,
        address receiver
    ) public returns (uint256) {
        uint256 maxAssets = maxDeposit(receiver);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxDeposit(receiver, assets, maxAssets);
        }

        uint256 shares = previewDeposit(assets);
        _deposit(_msgSender(), receiver, assets, shares, minimumOut);
        return shares;
    }

    function mint(
        uint256 shares,
        uint256 minimumOut,
        address receiver
    ) public virtual returns (uint256) {
        uint256 maxShares = maxMint(receiver);
        if (shares > maxShares) {
            revert ERC4626ExceededMaxMint(receiver, shares, maxShares);
        }

        uint256 assets = previewMint(shares);
        _deposit(_msgSender(), receiver, assets, shares, minimumOut);

        return assets;
    }

    /**
     * @dev Handles the deposit of assets into the vault and initiates cross-chain investment.
     * @param caller The address of the user initiating the deposit.
     * @param receiver The address of the user receiving the shares.
     * @param assets The amount of assets to deposit.
     * @notice Uses SafeERC20 to transfer assets to the vault and triggers cross-chain investment.
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares,
        uint256 minimumOut
    ) internal virtual whenNotPaused {}

    /**
     * @dev Handles deposits from a connected chain, processes swaps if necessary, and initiates cross-chain investment.
     * @notice Performs token swaps if the ZRC20 source token differs from the vault's asset.
     */
    function _depositComingFromConnectedChain() internal whenNotPaused {
        Transaction storage txn = transactions[vaultNonce];
        uint256 maxAssets = maxDeposit(txn.receiver);
        if (txn.amount > maxAssets) {
            revert ERC4626ExceededMaxDeposit(
                txn.receiver,
                txn.amount,
                maxAssets
            );
        }
        if (txn.withdrawZRC20 == address(0)) {
            txn.withdrawZRC20 = ISystem(_SYSTEM_ADDRESS).gasCoinZRC20ByChainId(
                txn.withdrawChainId
            );
        }
        console.log("Amount in to swap: %s", txn.amount);
        txn.amount = txn.withdrawZRC20 == address(asset())
            ? txn.amount
            : swap(
                txn.withdrawZRC20,
                txn.amount,
                address(asset()),
                txn.slippage,
                address(this),
                200
            );
        console.log("Amount after swap: %s", txn.amount);

        _investAssets();
    }

    function _investAssets() internal virtual;

    function redeem(
        uint256 shares,
        uint256 minimumOut,
        address receiver,
        address owner
    ) public {
        if (shares == 0) {
            revert AmountCantBeZero();
        }
        uint256 maxShares = maxRedeem(owner);
        if (shares > maxShares) {
            revert ERC4626ExceededMaxRedeem(owner, shares, maxShares);
        }
        redeemToAnyToken(
            shares,
            minimumOut,
            receiver,
            owner,
            address(asset()),
            0
        );
    }

    /** @dev See {IERC4626-withdraw}. */
    function withdraw(
        uint256 assets,
        uint256 minimumOut,
        address receiver,
        address owner
    ) public {
        if (assets == 0) {
            revert AmountCantBeZero();
        }
        uint256 maxAssets = maxWithdraw(owner);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxWithdraw(owner, assets, maxAssets);
        }

        // uint256 shares = previewWithdraw(assets);
        _withdraw(
            _msgSender(),
            receiver,
            owner,
            address(asset()),
            minimumOut,
            assets,
            0
        );
    }

    /** @dev See {IERC4626-redeem}. */
    function redeemToAnyToken(
        uint256 shares,
        uint256 minimumOut,
        address receiver,
        address owner,
        address withdrawZRC20,
        uint16 slippage
    ) public {
        uint256 assets = previewRedeem(shares);
        _withdraw(
            _msgSender(),
            receiver,
            owner,
            withdrawZRC20,
            minimumOut,
            assets,
            slippage
        );
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        address withdrawZRC20,
        uint256 minimumOut,
        uint256 shares,
        uint16 slippage
    ) internal virtual {}

    /**
     * @dev Withdrawn/redeem common workflow for withdrawals initiated from a connected chain.
     * @notice Validates maximum withdrawal limits and calculates fees before initiating divestment.
     */
    function _withdrawComingFromConnectedChain() internal virtual;

    function returnFundsToUser(uint256 nonce) external onlyOwner {
        _returnFundsToUser(nonce);
    }

    /**
     * @dev Returns funds to the user, either on the same chain or a connected chain.
     * @notice Handles cross-chain transfers or same-chain asset transfers. Manages gas fees and token approvals.
     */
    function _returnFundsToUser(uint256 nonce) internal {
        Transaction storage txn = transactions[nonce];

        uint256 outputAmount = (txn.withdrawChainId == uint32(block.chainid) ||
            address(asset()) == txn.withdrawZRC20)
            ? txn.amount
            : swap(
                address(asset()),
                txn.amount,
                txn.withdrawZRC20,
                txn.slippage,
                address(this),
                200
            );
        if (txn.withdrawChainId == uint32(block.chainid)) {
            IERC20(address(asset())).approve(
                IAmanaRegistry(registry).zapContract(),
                txn.amount
            );
            IZapContract(IAmanaRegistry(registry).zapContract())
                .zapSwapAndReturnToUser(
                    txn.amount,
                    address(this),
                    address(asset()),
                    txn.withdrawZRC20,
                    txn.slippage,
                    txn.receiver
                );
        } else {
            // Cross-chain transfer
            if (IAmanaRegistry(registry).withdrawHelper() == address(0))
                revert InvalidAddress();

            // Step 1: Transfer tokens to the helper contract
            SafeERC20.safeTransfer(
                IERC20(txn.withdrawZRC20),
                IAmanaRegistry(registry).withdrawHelper(),
                outputAmount
            );
            bytes memory recipient;
            if (nonEvmAddressByNonce[nonce].length == 0) {
                recipient = abi.encodePacked(txn.receiver);
            } else {
                recipient = abi.encodePacked(nonEvmAddressByNonce[nonce]);
            }
            // Step 2: Call helper with required arguments
            IWithdrawHelper(IAmanaRegistry(registry).withdrawHelper())
                .handleGasFeeAndWithdrawToUser(
                    recipient,
                    txn.withdrawZRC20,
                    outputAmount,
                    registry,
                    vaultNonce
                );
        }
    }

    /**
     * @notice Swaps a specific amount of tokens for another token.
     * @dev Determines the swap path and uses Uniswap V2 to execute the swap.
     * @param zrc20 The address of the input token.
     * @param amount The amount of input tokens to swap.
     * @param targetZRC20 The address of the output token.
     * @param slippageBps The slippage tolerance in basis points (e.g., 50 for 0.5%).
     * @param vault The address where the swapped tokens will be sent.
     * @param maxDeadline The maximum deadline for the swap to complete.
     * @return amountOut The amount of output tokens received.
     * @custom:reverts InsufficientLiquidity if no valid liquidity pool exists for the token pair.
     */
    function swap(
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint16 slippageBps,
        address vault,
        uint16 maxDeadline
    ) internal returns (uint256 amountOut) {
        if (IAmanaRegistry(registry).swapHelper() == address(0))
            revert InvalidAddress();

        // Step 1: Transfer tokens to the helper contract
        SafeERC20.safeTransfer(
            IERC20(zrc20),
            IAmanaRegistry(registry).swapHelper(),
            amount
        );

        amountOut = ISwapHelper(IAmanaRegistry(registry).swapHelper()).swap(
            zrc20,
            amount,
            targetZRC20,
            slippageBps,
            vault,
            maxDeadline,
            "" // empty bytes param for future-proofing
        );
    }

    /**
     * @dev Approves or increases the allowance of a token for a spender.
     * @param token The token to approve.
     * @param spender The address of the spender.
     * @param amount The amount to approve.
     * @notice Handles USDT-like tokens by resetting the allowance to zero first.
     */
    function approveOrIncreaseAllowance(
        IERC20 token,
        address spender,
        uint256 amount
    ) internal {
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

        (bool secondApproveSuccess, ) = address(token).call(approveCalldata);
        require(secondApproveSuccess, "Second approve failed");
    }
}
