// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./ERC4626RewardsUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";

import "./interfaces/ISystem.sol";
import "./interfaces/IStrategy.sol";
import "./interfaces/IGasTank.sol";

import "./libraries/SwapHelperLib.sol";

/// @title Amana Connected Chain Vault
/// @notice A vault that interacts with ZetaChain-connected strategies
/// @dev Implements ERC4626 with custom cross-chain functionality
contract AmanaConnectedChainVault is
    ERC4626RewardsUpgradeable,
    UUPSUpgradeable,
    UniversalContract,
    Revertable
{
    using SafeERC20 for IERC20;
    using Math for uint256;

    error InvalidStrategyAddress();
    error InvalidStrategyChainId();
    error InvalidTreasuryAddress();
    error FeeExceedsLimit();
    error ApprovalFailed();
    error DepositCantBeZero();
    error WithdrawCantBeZero();
    error NothingToWithdraw();
    error InvalidZRC20Address();
    error CantBeZeroAddress();
    error DepositExceedsLimit();
    error MintExceedsLimit();
    error WithdrawExceedsLimit();
    error RedeemExceedsLimit();
    error ConfirmationAlreadyProcessed();
    error OnlyGateway();

    // Constants
    address constant _GATEWAY_ADDRESS =
        0x6c533f7fE93fAE114d0954697069Df33C9B74fD7;
    bytes32 private constant VAULT_STORAGE_LOCATION =
        0x1a0ee6983e121525fbe4b5f5f8fd996faa9a018f8e366b3f036f295ddafb46df;
    address constant UNISWAP_V2_ROUTER_02_ADDRESS =
        0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe;
    uint32 constant VAULT_CHAIN_ID = 7001; // 7000 for mainnet, 7001 for testnet
    uint256 public constant GAS_LIMIT_FOR_CALL = 350000; // bring this down as far as possible, as it doesn't get returned
    uint256 public constant GAS_LIMIT_FOR_WITHDRAW_AND_CALL = 350000; // bring this down as far as possible, as it doesn't get returned

    uint256 crossChainTxId;
    uint256 latestTotalAssetsUpdateFromStrategy;
    uint256 lastProcessedNonce;

    ISystem systemContract; // 0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B on testnet
    IGasTank gasTank;

    struct VaultStorage {
        address strategyAddress;
        uint32 strategyChainId;
        address treasury;
        uint16 perfFee;
        uint256 totalPrincipal;
        mapping(address => uint256) userPrincipal;
    }

    struct Confirmation {
        address user;
        address withdrawZRC20;
        uint256 amount;
        uint256 fee;
        uint32 withdrawChainId;
        bool isDeposit;
        uint256 totalAssetsBefore;
        uint256 totalAssetsAfter;
        uint256 crossChainTxId;
    }

    mapping(uint256 => Confirmation) pendingConfirmations; // Buffer for out-of-order confirmations

    modifier onlyGateway() {
        if (msg.sender != _GATEWAY_ADDRESS) revert OnlyGateway();
        _;
    }

    function _getVaultStorage() private pure returns (VaultStorage storage $) {
        assembly {
            $.slot := VAULT_STORAGE_LOCATION
        }
    }

    function getStrategy() external view returns (address, uint32) {
        VaultStorage storage $ = _getVaultStorage();
        return ($.strategyAddress, $.strategyChainId);
    }

    function getTreasury() external view returns (address) {
        VaultStorage storage $ = _getVaultStorage();
        return $.treasury;
    }

    function getPerfFee() external view returns (uint16) {
        VaultStorage storage $ = _getVaultStorage();
        return $.perfFee;
    }

    event StrategyUpdated(
        address indexed newStrategyAddress,
        uint32 newStrategyChainId
    );
    event PerformanceFeePaid(address indexed user, uint256 amount);
    event PerformanceFeeUpdated(uint256 newFeeRate);
    event VaultInitialized(uint8 decimals, uint256 perfFee);
    event ContextDataRevert(RevertContext);
    event WithdrawFromStrategy(
        address indexed user,
        uint256 amount,
        uint256 fee,
        uint256 shares
    );
    event CrossChainInvestSent(uint256 indexed crossChainTxId);
    event CrossChainInvestFailed(uint256 indexed crossChainTxId);
    event DivestSent(uint256 indexed crossChainTxId);
    event DivestFailed(uint256 indexed crossChainTxId);
    event ReturnFundsToUserSent(uint256 indexed crossChainTxId);
    event ReturnFundsToUserFailed(uint256 indexed crossChainTxId);

    event Deposited(
        address indexed userAddress,
        uint256 amount,
        uint256 shares,
        uint256 indexed crossChainTxId
    );
    event Withdrawn(
        address indexed userAddress,
        uint256 amount,
        uint256 shares,
        uint256 crossChainTxId
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the vault contract.
     * @param name_ Name of the vault token.
     * @param symbol_ Symbol of the vault token.
     * @param asset_ The underlying asset for the vault.
     * @param treasury_ Treasury address for performance fees.
     * @param perfFee_ Performance fee rate.
     * @param system_contract_ System contract address.
     * @param gasTank_ Gas tank contract address.
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        IERC20 asset_,
        address treasury_,
        uint16 perfFee_,
        address system_contract_,
        address gasTank_
    ) external initializer {
        if (treasury_ == address(0)) revert InvalidTreasuryAddress();
        __ERC20_init(name_, symbol_);
        __ERC4626_init(asset_);
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        VaultStorage storage $ = _getVaultStorage();
        $.treasury = treasury_;
        $.perfFee = perfFee_;
        $.totalPrincipal = 1; // preset to 1 virtual asset to avoid division by zero, align with totalAssets
        systemContract = ISystem(system_contract_);
        gasTank = IGasTank(gasTank_);
        emit VaultInitialized(decimals(), perfFee_);
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
    ) external override onlyGateway {
        VaultStorage storage $ = _getVaultStorage();
        if (context.sender == $.strategyAddress) {
            (
                address userAddress,
                address withdrawZRC20,
                uint256 withdrawAmount,
                uint256 fee,
                uint32 withdrawChainId,
                bool isDeposit,
                uint256 totalAssetsBefore,
                uint256 totalAssetsAfter,
                uint256 executionNonce,
                uint256 _crossChainTxId
            ) = abi.decode(
                    message,
                    (
                        address,
                        address,
                        uint256,
                        uint256,
                        uint32,
                        bool,
                        uint256,
                        uint256,
                        uint256,
                        uint256
                    )
                );
            _processConfirmationFromStrategy(
                userAddress,
                withdrawZRC20,
                withdrawAmount,
                fee,
                withdrawChainId,
                isDeposit,
                totalAssetsBefore,
                totalAssetsAfter,
                executionNonce,
                _crossChainTxId
            );
        } else {
            if (context.sender == address(0)) revert CantBeZeroAddress();
            if (amount > 0) {
                _depositComingFromConnectedChain(context.sender, amount, zrc20);
            } else {
                (address withdrawZRC20, uint256 withdrawAmount) = abi.decode(
                    message,
                    (address, uint256)
                );
                _withdrawComingFromConnectedChain(
                    context.sender,
                    withdrawZRC20,
                    withdrawAmount,
                    uint32(context.chainID)
                );
            }
        }
    }

    /**
     * @dev Processes a confirmation message from the strategy.
     *      This function validates and stores the confirmation details for deposit or withdrawal actions
     *      and then attempts to process all pending confirmations in order.
     * @param userAddress The address of the user associated with the confirmation.
     * @param withdrawZRC20 The ZRC20 token address involved in the withdrawal, if applicable.
     * @param withdrawAmount The amount of the ZRC20 token to be withdrawn, if applicable.
     * @param fee The fee associated with the transaction.
     * @param withdrawChainId The chain ID of the withdrawal, if applicable.
     * @param isDeposit A boolean indicating if the confirmation is for a deposit (true) or withdrawal (false).
     * @param totalAssetsBefore The total assets in the vault before the operation.
     * @param totalAssetsAfter The total assets in the vault after the operation.
     * @param executionNonce A unique identifier for the confirmation to ensure it is processed only once.
     */
    function _processConfirmationFromStrategy(
        address userAddress,
        address withdrawZRC20,
        uint256 withdrawAmount,
        uint256 fee,
        uint32 withdrawChainId,
        bool isDeposit,
        uint256 totalAssetsBefore,
        uint256 totalAssetsAfter,
        uint256 executionNonce,
        uint256 _crossChainTxId
    ) internal {
        // Ensure no duplicate processing
        if (pendingConfirmations[executionNonce].user != address(0))
            revert ConfirmationAlreadyProcessed();
        // Store the confirmation in the buffer
        pendingConfirmations[executionNonce] = Confirmation({
            user: userAddress,
            withdrawZRC20: withdrawZRC20,
            amount: withdrawAmount,
            fee: fee,
            withdrawChainId: withdrawChainId,
            isDeposit: isDeposit,
            totalAssetsBefore: totalAssetsBefore,
            totalAssetsAfter: totalAssetsAfter,
            crossChainTxId: _crossChainTxId
        });

        // Attempt to process confirmations
        _processBufferedConfirmations();
    }

    /**
     * @dev Processes all buffered confirmations sequentially based on their execution nonce.
     *      This function ensures confirmations are handled in order, either for deposits or withdrawals.
     *      Once a confirmation is processed, it is removed from the buffer.
     */
    function _processBufferedConfirmations() internal {
        while (true) {
            uint256 nextNonce = lastProcessedNonce + 1;
            Confirmation memory confirmation = pendingConfirmations[nextNonce];

            // If there's no confirmation for the next nonce, stop processing
            if (confirmation.amount == 0) {
                break;
            }

            // Process the confirmation
            if (confirmation.isDeposit) {
                _confirmDepositAndMint(
                    confirmation.user,
                    confirmation.amount,
                    confirmation.totalAssetsBefore,
                    confirmation.totalAssetsAfter,
                    confirmation.crossChainTxId
                );
            } else {
                _confirmWithdrawAndBurn(
                    confirmation.user,
                    confirmation.withdrawZRC20,
                    confirmation.amount,
                    confirmation.fee,
                    confirmation.withdrawChainId,
                    confirmation.totalAssetsBefore,
                    confirmation.totalAssetsAfter,
                    confirmation.crossChainTxId
                );
            }

            // Mark this nonce as processed
            lastProcessedNonce = nextNonce;
            delete pendingConfirmations[nextNonce];
        }
    }

    /**
     * @dev Sets the strategy for the vault. Can only be called by the owner.
     * @param _strategyAddress The address of the new strategy.
     * @param _strategyChainId The chain ID of the new strategy.
     * @notice Emits a `StrategyUpdated` event upon success.
     */
    function setStrategy(
        address _strategyAddress,
        uint32 _strategyChainId
    ) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (_strategyAddress == address(0)) revert InvalidStrategyAddress();
        if (_strategyChainId == 0) revert InvalidStrategyChainId();
        $.strategyAddress = _strategyAddress;
        $.strategyChainId = _strategyChainId;
        emit StrategyUpdated(_strategyAddress, _strategyChainId);
    }

    /**
     * @dev Updates the treasury address for the vault. Can only be called by the owner.
     * @param _treasury The address of the new treasury.
     * @notice Reverts if the treasury address is zero.
     */
    function updateTreasuryAddress(address _treasury) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (_treasury == address(0)) revert InvalidTreasuryAddress();
        $.treasury = _treasury;
    }

    /**
     * @dev Updates the performance fee rate for the vault. Can only be called by the owner.
     * @param newFeeRate The new performance fee rate, expressed in basis points.
     * @notice Reverts if the fee rate exceeds 2000 basis points (20%).
     * @notice Emits a `PerformanceFeeUpdated` event upon success.
     */
    function setPerformanceFee(uint16 newFeeRate) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (newFeeRate > 2000) revert FeeExceedsLimit();
        $.perfFee = newFeeRate;
        emit PerformanceFeeUpdated(newFeeRate);
    }

    /**
     * @dev Sets the gas tank address for the vault. Can only be called by the owner.
     * @param newGasTank The address of the new gas tank.
     * @notice Reverts if the gas tank address is zero.
     */
    function setGasTank(address newGasTank) external onlyOwner {
        if (newGasTank == address(0)) revert CantBeZeroAddress();
        gasTank = IGasTank(newGasTank);
    }

    /**
     * @dev Switches the strategy of the vault. Can only be called by the owner.
     *      Divests from the current strategy and invests in the new one.
     * @param newStrategyAddress The address of the new strategy.
     * @param newStrategyChainId The chain ID of the new strategy.
     * @notice Reverts if the new strategy address is invalid or unchanged.
     * @notice Emits a `StrategyUpdated` event upon success.
     */
    function switchStrategy(
        address newStrategyAddress,
        uint32 newStrategyChainId
    ) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (newStrategyAddress == address(0)) revert InvalidStrategyAddress();
        if (newStrategyAddress == $.strategyAddress)
            revert InvalidStrategyAddress();
        if (newStrategyChainId == 0) revert InvalidStrategyChainId();
        if (newStrategyChainId != $.strategyChainId)
            revert InvalidStrategyChainId();

        _divestConnectedChainStrategy(
            address(this),
            address(asset()),
            totalAssets(),
            0,
            $.strategyChainId
        );
        $.strategyAddress = newStrategyAddress;

        _crossChainInvest(
            IERC20(asset()).balanceOf(address(this)),
            address(this),
            asset(),
            VAULT_CHAIN_ID
        );

        emit StrategyUpdated(newStrategyAddress, newStrategyChainId);
    }

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

    /**
     * @dev Returns the total assets currently held by the vault, including assets directly held
     *      and the latest update from the strategy's total assets.
     * @return The total amount of assets held by the vault.
     * @notice Overrides the {IERC4626-totalAssets} function.
     */
    function totalAssets() public view virtual override returns (uint256) {
        // Get the amount of USDC held directly by the vault
        return latestTotalAssetsUpdateFromStrategy + 1;
    }

    /**
     * @dev Calculates the performance fee to be applied for withdrawing a specified amount of assets.
     *      The fee is calculated on the user's profit and deducted from the withdrawal amount.
     * @param user The address of the user making the withdrawal.
     * @param assets The amount of assets the user intends to withdraw.
     * @return feeToWithdraw The calculated performance fee to be deducted from the withdrawal.
     * @notice Reverts if the total user assets are zero, as it implies no shares exist.
     */
    function _applyFee(
        address user,
        uint256 assets
    ) internal view returns (uint256 feeToWithdraw) {
        VaultStorage storage $ = _getVaultStorage();
        uint256 principal = $.userPrincipal[user];
        uint256 totalUserAssets = convertToAssets(balanceOf(user));
        uint256 principalWithdrawn;
        uint256 profit;
        uint256 fee;

        if (totalUserAssets > principal) {
            profit = totalUserAssets - principal;

            fee = (profit * $.perfFee) / (10000 - $.perfFee);

            principalWithdrawn = (assets * principal) / totalUserAssets;
            uint256 profitWithdrawn = assets - principalWithdrawn;

            feeToWithdraw =
                (profit * $.perfFee * profitWithdrawn) /
                (profit * (10000 - $.perfFee));
        } else {
            principalWithdrawn = assets;
            feeToWithdraw = 0;
        }
    }

    /**
     * @dev Internal conversion function (from assets to shares) with support for rounding direction.
     *
     * Will revert if assets > 0, totalSupply > 0 and totalAssets = 0. That corresponds to a case where any asset
     * would represent an infinite amount of shares.
     */
    function _convertToShares(
        uint256 assets,
        Math.Rounding rounding
    ) internal view override returns (uint256 shares) {
        if (totalSupply() == 0) {
            return assets;
        }
        VaultStorage storage $ = _getVaultStorage();
        uint256 totalSupplyWithOffset = totalSupply() + 10 ** _decimalsOffset();
        uint256 totalAssetsMinusFeePortion = totalAssets();

        // Incorporate fee logic only if totalAssets exceeds totalPrincipal
        if (totalAssets() > $.totalPrincipal) {
            totalAssetsMinusFeePortion -=
                ((totalAssets() - $.totalPrincipal) * $.perfFee) /
                10000;
        }

        return
            assets.mulDiv(
                totalSupplyWithOffset,
                totalAssetsMinusFeePortion,
                rounding
            );
    }

    /**
     * @dev Internal conversion function (from shares to assets) with support for rounding direction.
     */
    function _convertToAssets(
        uint256 shares,
        Math.Rounding rounding
    ) internal view override returns (uint256 assets) {
        if (totalSupply() == 0) {
            return shares;
        }
        VaultStorage storage $ = _getVaultStorage();
        uint256 totalSupplyWithOffset = totalSupply() + 10 ** _decimalsOffset();
        uint256 totalAssetsMinusFeePortion = totalAssets();

        // Incorporate fee logic only if totalAssets exceeds totalPrincipal
        if (totalAssets() > $.totalPrincipal) {
            totalAssetsMinusFeePortion -=
                ((totalAssets() - $.totalPrincipal) * $.perfFee) /
                10000;
        }

        return
            shares.mulDiv(
                totalAssetsMinusFeePortion,
                totalSupplyWithOffset,
                rounding
            );
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
        uint256
    ) internal override {
        // If _asset is ERC777, `transferFrom` can trigger a reentrancy BEFORE the transfer happens through the
        // `tokensToSend` hook. On the other hand, the `tokenReceived` hook, triggered after the transfer,
        // calls the vault, which is assumed not malicious.
        // Conclusion: Transfer happens before minting, ensuring reentrancy occurs in a valid state.
        // slither-disable-next-line reentrancy-no-eth
        if (assets == 0) {
            revert DepositCantBeZero();
        }
        SafeERC20.safeTransferFrom(
            IERC20(asset()),
            caller,
            address(this),
            assets
        );

        _crossChainInvest(assets, receiver, asset(), VAULT_CHAIN_ID);
    }

    /**
     * @dev Handles deposits from a connected chain, processes swaps if necessary, and initiates cross-chain investment.
     * @param receiver The address of the user receiving the shares.
     * @param assets The amount of assets received from the connected chain.
     * @param zrc20source The ZRC20 token address representing the assets being deposited.
     * @notice Performs token swaps if the ZRC20 source token differs from the vault's asset.
     */
    function _depositComingFromConnectedChain(
        address receiver,
        uint256 assets,
        address zrc20source
    ) internal {
        uint256 maxAssets = maxDeposit(receiver);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxDeposit(receiver, assets, maxAssets);
        }

        uint256 outputAmount = assets;
        uint256 minAmountOut = 0; // TODO: Implement slippage control in production
        if (zrc20source != address(asset())) {
            outputAmount = SwapHelperLib.swapExactTokensForTokens(
                UNISWAP_V2_ROUTER_02_ADDRESS,
                systemContract.uniswapv2FactoryAddress(),
                zrc20source,
                assets,
                asset(),
                minAmountOut,
                address(this),
                200
            );
        }
        _crossChainInvest(
            outputAmount,
            receiver,
            zrc20source,
            uint32(IZRC20(zrc20source).CHAIN_ID())
        );
    }

    /**
     * @dev Initiates cross-chain investment by interacting with the gateway and strategy.
     * @param amount The amount of assets to invest.
     * @param userAddress The address of the user initiating the investment.
     * @param userZRC20 The ZRC20 token address representing the user's assets.
     * @param userChainId The chain ID of the user's connected chain.
     * @notice Approves and sends assets through the gateway to the strategy's chain.
     */
    function _crossChainInvest(
        uint256 amount,
        address userAddress,
        address userZRC20,
        uint32 userChainId
    ) internal {
        uint256 currentCrossChainTxId = crossChainTxId;
        crossChainTxId++;

        VaultStorage storage $ = _getVaultStorage();
        (address gas_zrc20, uint256 gasFee) = IZRC20(address(asset()))
            .withdrawGasFeeWithGasLimit(GAS_LIMIT_FOR_WITHDRAW_AND_CALL); // ZRC-20 of the gas token of the chain the strategy is on, and the gas fee for the withdrawal

        gasTank.getGas{gas: 200000}(gas_zrc20, gasFee);

        if (gas_zrc20 != address(asset())) {
            IZRC20(asset()).approve(_GATEWAY_ADDRESS, amount);
            IZRC20(gas_zrc20).approve(_GATEWAY_ADDRESS, gasFee);
        } else {
            IZRC20(asset()).approve(_GATEWAY_ADDRESS, amount + gasFee);
        }

        bytes memory recipient = abi.encodePacked($.strategyAddress);

        bytes memory outgoingMessage = abi.encode(
            userAddress,
            address(0),
            amount,
            0,
            0,
            true,
            currentCrossChainTxId
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            true, // callOnRevert
            address(this), // abortAddress
            abi.encode(
                "_crossChainInvestFailed",
                currentCrossChainTxId,
                userAddress,
                userZRC20,
                userChainId
            ),
            uint256(0) // onRevertGasLimit
        );

        CallOptions memory callOptions = CallOptions(
            GAS_LIMIT_FOR_WITHDRAW_AND_CALL,
            false
        );
        IGatewayZEVM(_GATEWAY_ADDRESS).withdrawAndCall(
            recipient, // Recipient contract address (strategy address)
            amount, // Amount of ZRC20 to withdraw
            address(asset()), // ZRC20 being withdrawn (indicates the chain to target)
            outgoingMessage, // Encoded function call for the strategy's invest function
            callOptions,
            revertOptions
        );

        emit CrossChainInvestSent(currentCrossChainTxId);
    }

    /**
     * @dev Confirms a deposit and mints shares for the user.
     *      Updates the total assets and user's principal accordingly.
     * @param user The address of the user making the deposit.
     * @param depositAmount The amount of assets deposited by the user.
     * @param totalAssetsBeforeDeposit The total assets in the vault before the deposit.
     * @param totalAssetsAfterDeposit The total assets in the vault after the deposit.
     */
    function _confirmDepositAndMint(
        address user,
        uint256 depositAmount,
        uint256 totalAssetsBeforeDeposit,
        uint256 totalAssetsAfterDeposit,
        uint256 _crossChainTxId
    ) internal {
        VaultStorage storage $ = _getVaultStorage();

        $.userPrincipal[user] += depositAmount;
        $.totalPrincipal += depositAmount;

        latestTotalAssetsUpdateFromStrategy = totalAssetsBeforeDeposit;

        uint256 shares = previewDeposit(depositAmount);
        _mint(user, shares);

        latestTotalAssetsUpdateFromStrategy = totalAssetsAfterDeposit;

        emit Deposited(user, depositAmount, shares, _crossChainTxId);
    }

    /**
     * @dev Withdrawn/redeem common workflow. Handles user withdrawal requests and initiates divestment from the strategy.
     * @param caller The address of the entity initiating the withdrawal.
     * @param user The address of the user receiving the withdrawn assets.
     * @param assets The amount of assets being withdrawn.
     * @param shares The number of shares being redeemed for the withdrawal.
     * @notice Ensures proper allowance checks and calculates fees before initiating strategy divestment.
     */
    function _withdraw(
        address caller,
        address,
        address user,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (assets == 0) {
            revert WithdrawCantBeZero();
        }
        if (caller != user) {
            _spendAllowance(user, caller, shares);
        }
        uint256 feeToWithdraw = _applyFee(user, assets);

        _divestConnectedChainStrategy(
            user,
            asset(),
            assets,
            feeToWithdraw,
            VAULT_CHAIN_ID
        );
    }

    /**
     * @dev Withdrawn/redeem common workflow for withdrawals initiated from a connected chain.
     * @param user The address of the user receiving the withdrawn assets.
     * @param withdrawZRC20 The ZRC20 token address representing the withdrawal asset.
     * @param assets The amount of assets being withdrawn.
     * @param userChainId The chain ID of the user's connected chain.
     * @notice Validates maximum withdrawal limits and calculates fees before initiating divestment.
     */
    function _withdrawComingFromConnectedChain(
        address user,
        address withdrawZRC20,
        uint256 assets,
        uint32 userChainId
    ) internal {
        if (assets == 0) {
            revert WithdrawCantBeZero();
        }
        uint256 maxAssets = maxWithdraw(user);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxWithdraw(user, assets, maxAssets);
        }
        uint256 feeToWithdraw = _applyFee(user, assets);

        _divestConnectedChainStrategy(
            user,
            withdrawZRC20,
            assets,
            feeToWithdraw,
            userChainId
        );
    }

    /**
     * @dev Initiates the process to divest assets from the strategy on a connected chain.
     * @param user The address of the user requesting the withdrawal.
     * @param withdrawZRC20 The ZRC20 token address representing the withdrawal asset.
     * @param amount The amount of assets to be withdrawn.
     * @param feeToWithdraw The calculated fee to be applied to the withdrawal.
     * @param withdrawChainId The chain ID of the chain where the withdrawal is taking place.
     * @notice Sends a cross-chain call to the strategy to initiate divestment, ensuring gas fees are handled appropriately.
     */
    function _divestConnectedChainStrategy(
        address user,
        address withdrawZRC20,
        uint256 amount,
        uint256 feeToWithdraw,
        uint32 withdrawChainId
    ) internal {
        VaultStorage storage $ = _getVaultStorage();
        uint256 currentCrossChainTxId = crossChainTxId;
        crossChainTxId++;

        (address gas_zrc20, uint256 gasFee) = IZRC20(address(asset()))
            .withdrawGasFeeWithGasLimit(GAS_LIMIT_FOR_CALL); // ZRC-20 of the gas token of the chain the strategy is on

        gasTank.getGas{gas: 200000}(gas_zrc20, gasFee);

        IZRC20(gas_zrc20).approve(_GATEWAY_ADDRESS, gasFee);

        bytes memory recipient = abi.encodePacked($.strategyAddress);

        bytes memory outgoingMessage = abi.encode(
            user,
            withdrawZRC20,
            amount,
            feeToWithdraw,
            withdrawChainId,
            false,
            currentCrossChainTxId
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            true, // callOnRevert
            address(this), // abortAddress
            abi.encode(
                "_divestConnectedChainStrategyFailed",
                currentCrossChainTxId,
                user,
                withdrawZRC20,
                withdrawChainId
            ),
            uint256(0) // onRevertGasLimit - NA on ZEVM
        );

        CallOptions memory callOptions = CallOptions(GAS_LIMIT_FOR_CALL, false);
        IGatewayZEVM(_GATEWAY_ADDRESS).call(
            recipient,
            address(asset()),
            outgoingMessage,
            callOptions,
            revertOptions
        );
        emit DivestSent(currentCrossChainTxId);
    }

    /**
     * @dev Confirms the withdrawal process by burning shares, applying fees, and returning assets to the user.
     * @param userAddress The address of the user requesting the withdrawal.
     * @param withdrawZRC20 The ZRC20 token address representing the withdrawal asset.
     * @param amount The amount of assets to be withdrawn.
     * @param fee The performance fee to be applied to the withdrawal.
     * @param userChainId The chain ID of the user's connected chain.
     * @param totalAssetsBeforeWithdraw The total assets held by the vault before the withdrawal.
     * @param totalAssetsAfterWithdraw The total assets held by the vault after the withdrawal.
     * @notice Ensures that fees are correctly deducted, shares are burned, and assets are returned to the user.
     */
    function _confirmWithdrawAndBurn(
        address userAddress,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 userChainId,
        uint256 totalAssetsBeforeWithdraw,
        uint256 totalAssetsAfterWithdraw,
        uint256 _crossChainTxId
    ) internal {
        VaultStorage storage $ = _getVaultStorage();
        latestTotalAssetsUpdateFromStrategy = totalAssetsBeforeWithdraw;
        uint256 shares = previewWithdraw(amount);
        uint256 principalWithdrawn = (amount * $.userPrincipal[userAddress]) /
            convertToAssets(balanceOf(userAddress));

        $.userPrincipal[userAddress] -= principalWithdrawn;
        $.totalPrincipal -= principalWithdrawn;

        latestTotalAssetsUpdateFromStrategy = totalAssetsAfterWithdraw;
        _burn(userAddress, shares);

        uint256 outputAmount = _returnFundsToUser(
            amount,
            userChainId,
            userAddress,
            withdrawZRC20,
            _crossChainTxId
        );

        if (fee > 0) {
            emit PerformanceFeePaid(userAddress, fee);
            SafeERC20.safeTransfer(IERC20(address(asset())), $.treasury, fee);
        }

        emit Withdrawn(userAddress, outputAmount, shares, _crossChainTxId);
    }

    /**
     * @dev Returns funds to the user, either on the same chain or a connected chain.
     * @param amount The amount of assets to return to the user.
     * @param userChainId The chain ID of the user's chain.
     * @param userAddress The address of the user receiving the funds.
     * @param withdrawZRC20 The ZRC20 token address representing the withdrawal asset.
     * @return outputAmount The actual amount of assets returned to the user after potential swaps.
     * @notice Handles cross-chain transfers or same-chain asset transfers. Manages gas fees and token approvals.
     */
    function _returnFundsToUser(
        uint256 amount,
        uint32 userChainId,
        address userAddress,
        address withdrawZRC20,
        uint256 _crossChainTxId
    ) internal returns (uint256 outputAmount) {
        outputAmount = amount;

        if (userChainId == VAULT_CHAIN_ID) {
            // Same-chain transfer
            SafeERC20.safeTransfer(IERC20(asset()), userAddress, outputAmount);
        } else {
            // Cross-chain transfer
            bytes memory recipient = abi.encodePacked(userAddress);

            RevertOptions memory revertOptions = RevertOptions(
                address(this), // revert address
                true, // callOnRevert
                address(this), // abortAddress
                abi.encode(
                    "_returnFundsToUserFailed",
                    _crossChainTxId,
                    userAddress,
                    withdrawZRC20,
                    userChainId
                ),
                uint256(0) // onRevertGasLimit
            );

            uint256 minAmountOut = 0; // TODO: Control for slippage in production

            if (address(asset()) != withdrawZRC20) {
                // Swap assets if needed
                outputAmount = SwapHelperLib.swapExactTokensForTokens(
                    UNISWAP_V2_ROUTER_02_ADDRESS,
                    systemContract.uniswapv2FactoryAddress(),
                    address(asset()),
                    amount,
                    withdrawZRC20,
                    minAmountOut,
                    address(this),
                    200
                );
            }

            (address gas_zrc20, uint256 gasFeeForWithdraw) = IZRC20(
                withdrawZRC20
            ).withdrawGasFeeWithGasLimit(IZRC20(withdrawZRC20).GAS_LIMIT()); // ZRC-20 of the gas token of the chain the strategy is on

            gasTank.getGas{gas: 200000}(gas_zrc20, gasFeeForWithdraw);

            if (gas_zrc20 != withdrawZRC20) {
                IZRC20(withdrawZRC20).approve(_GATEWAY_ADDRESS, outputAmount);
                IZRC20(gas_zrc20).approve(_GATEWAY_ADDRESS, gasFeeForWithdraw);
            } else {
                IZRC20(withdrawZRC20).approve(
                    _GATEWAY_ADDRESS,
                    outputAmount + gasFeeForWithdraw
                );
            }

            IGatewayZEVM(_GATEWAY_ADDRESS).withdraw(
                recipient,
                outputAmount,
                withdrawZRC20,
                revertOptions
            );

            emit ReturnFundsToUserSent(_crossChainTxId);
        }
    }

    /**
     * @dev Handles revert scenarios during cross-chain operations.
     * @param context The revert context containing details about the revert scenario.
     * @notice Executes appropriate recovery steps based on the revert message.
     */
    function onRevert(RevertContext calldata context) external override {
        (
            string memory revertMessage,
            uint256 _crossChainTxId,
            address userAddress,
            address userZRC20,
            uint32 userChainId
        ) = abi.decode(
                context.revertMessage,
                (string, uint256, address, address, uint32)
            );

        if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_crossChainInvestFailed"))
        ) {
            _returnFundsToUser(
                context.amount,
                userChainId,
                userAddress,
                userZRC20,
                _crossChainTxId
            );
            emit CrossChainInvestFailed(_crossChainTxId);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_divestConnectedChainStrategyFailed"))
        ) {
            emit DivestFailed(_crossChainTxId);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_returnFundsToUserFailed"))
        ) {
            emit ReturnFundsToUserFailed(_crossChainTxId);
        } else {
            revert("Revert not handled");
        }
    }
}
