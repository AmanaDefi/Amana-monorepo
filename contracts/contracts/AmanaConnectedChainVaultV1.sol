// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./AmanaVaultBaseV1.sol";

/// @title Amana Connected Chain Vault
/// @notice A vault that interacts with ZetaChain-connected strategies
/// @dev Implements ERC4626 with custom cross-chain functionality
contract AmanaConnectedChainVaultV1 is AmanaVaultBaseV1 {
    using SafeERC20 for IERC20;
    using Math for uint256;

    /// @dev Initializer instead of constructor for upgradeability
    function initialize(
        string memory name,
        string memory symbol,
        IERC20 asset,
        address registry_,
        uint16 perfFee_,
        uint32 gasLimitWithdrawAndCall_,
        uint32 gasLimitCall_,
        bool depositFeePaidFromGasTank_
    ) external initializer {
        __AmanaVaultBase_init(
            name,
            symbol,
            asset,
            msg.sender,
            registry_,
            perfFee_,
            gasLimitWithdrawAndCall_,
            gasLimitCall_,
            depositFeePaidFromGasTank_
        );
    }

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
        if (context.sender == strategyAddress) {
            (
                uint256 withdrawnAmount,
                uint256 totalAssetsAfter,
                uint256 confirmationNonce,
                bytes32 txStatus
            ) = abi.decode(message, (uint256, uint256, uint256, bytes32));

            if (
                confirmationNonce == lastProcessedNonce &&
                txStatus == TX_TOTAL_ASSETS_UPDATE
            ) {
                latestTotalAssetsUpdateFromStrategy = totalAssetsAfter;
                emit TotalAssetsUpdated(totalAssetsAfter, confirmationNonce);
            } else {
                pendingTransactions[confirmationNonce]
                    .totalAssetsAfter = totalAssetsAfter;
                pendingTransactions[confirmationNonce].txStatus = txStatus;
                if (
                    txStatus == TX_WITHDRAW_REVERTED ||
                    txStatus == TX_WITHDRAW_CONFIRMED
                ) {
                    address user = pendingTransactions[confirmationNonce].user;
                    if (
                        pendingTransactions[confirmationNonce].amount >=
                        pendingWithdrawals[user]
                    ) {
                        pendingWithdrawals[user] = 0;
                    } else {
                        pendingWithdrawals[user] -= pendingTransactions[
                            confirmationNonce
                        ].amount;
                    }
                }
                pendingTransactions[confirmationNonce].amount = withdrawnAmount;
            }
            if (confirmationNonce == lastProcessedNonce + 1) {
                // Process the confirmation immediately if it's the next one in line
                _processBufferedpendingTransactions(true);
            }
        } else {
            Transaction storage txn = pendingTransactions[vaultNonce];
            if (context.sender == address(0)) revert InvalidAddress();
            (
                address withdrawZRC20,
                address withdrawERC20,
                uint256 withdrawAssetAmount,
                uint256 minimumOut,
                uint16 slippage,
                bytes memory nonEvmAddress,
                bytes memory swapData,
                bytes32 txStatus
            ) = abi.decode(
                    message,
                    (
                        address,
                        address,
                        uint256,
                        uint256,
                        uint16,
                        bytes,
                        bytes,
                        bytes32
                    )
                );
            txn.user = context.sender; // common to both paths
            txn.receiver = context.sender; // could take in a different receiver?
            txn.minOut = minimumOut;
            txn.withdrawChainId = uint32(context.chainID);
            txn.txStatus = txStatus;
            txn.withdrawERC20 = withdrawERC20;
            txn.slippage = slippage;
            nonEvmAddressByNonce[vaultNonce] = nonEvmAddress;
            swapDataByNonce[vaultNonce] = swapData;
            // if (context.senderEVM != address(0)) {
            //     // Handle EVM-style sender logic
            //     txn.user = context.senderEVM;
            //     txn.receiver = context.senderEVM; // could take in a different receiver?
            //     nonEvmAddressByNonce[vaultNonce] = context.sender;
            // } else {
            //     // Handle non-EVM sender (context.sender is now bytes)
            //     txn.user = context.sender; // common to both paths
            //     txn.receiver = context.sender; // could take in a different receiver?
            // }

            if (txStatus == TX_DEPOSIT_INITIATED) {
                txn.amount = amount;
                txn.withdrawZRC20 = zrc20;
                txn.isDeposit = true;
                _depositComingFromConnectedChain();
            } else if (txStatus == TX_WITHDRAW_INITIATED) {
                txn.withdrawZRC20 = withdrawZRC20; // TODO why not just use zrc20 here, as with deposit?
                txn.amount = withdrawAssetAmount;
                txn.isDeposit = false;
                _withdrawComingFromConnectedChain();
            } else {
                revert InvalidMessage();
            }
            vaultNonce++;
        }
    }

    function clearPendingWithdrawals(address user) external onlyOwner {
        pendingWithdrawals[user] = 0;
    }

    function decreasePendingWithdrawals(
        address user,
        uint256 amount
    ) external onlyOwnerOrWithdrawHelper {
        pendingWithdrawals[user] -= amount;
    }

    /**
     * @dev Allows for manual input of a transaction message, mimicking _processConfirmationFromStrategy.
     * @param amount The amount of the ZRC20 token to be withdrawn, if applicable.
     * @param totalAssetsAfter The total assets in the vault after the operation.
     * @param confirmationNonce A unique identifier for the transaction to ensure it is processed only once.
     * @param _txStatus A bytes32 value indicating whether the transaction succeeded or failed.
     */
    function manuallyAddConfirmation(
        uint256 amount,
        uint256 totalAssetsAfter,
        uint256 confirmationNonce,
        bytes32 _txStatus
    ) external onlyOwner {
        // Store the transaction in the buffer
        Transaction storage txn = pendingTransactions[confirmationNonce];
        txn.amount = amount;
        txn.totalAssetsAfter = totalAssetsAfter;
        txn.txStatus = _txStatus;
    }

    function processExistingConfirmations(
        uint256 confirmationNonce,
        bool processEntireBuffer
    ) external onlyOwner {
        // Ensure the transaction exists
        if (
            pendingTransactions[confirmationNonce].totalAssetsAfter == 0 &&
            pendingTransactions[confirmationNonce].amount == 0
        ) {
            revert ConfirmationAlreadyProcessed();
        }

        // Attempt to process confirmations
        _processBufferedpendingTransactions(processEntireBuffer);
    }

    /**
     * @dev Processes all buffered confirmations sequentially based on their execution nonce.
     *      This function ensures confirmations are handled in order, either for deposits or withdrawals.
     *      Once a transaction is processed, it is removed from the buffer.
     */
    function _processBufferedpendingTransactions(
        bool processEntireBuffer
    ) internal {
        while (true) {
            uint256 nextNonce = lastProcessedNonce + 1;
            Transaction memory transaction = pendingTransactions[nextNonce];

            if (
                transaction.txStatus == TX_WITHDRAW_REVERTED ||
                transaction.txStatus == TX_TOTAL_ASSETS_UPDATE ||
                transaction.txStatus == TX_DEPOSIT_REVERTED
            ) {
                latestTotalAssetsUpdateFromStrategy = transaction
                    .totalAssetsAfter;
                emit TotalAssetsUpdated(
                    transaction.totalAssetsAfter,
                    nextNonce
                );
            } else if (transaction.txStatus == TX_DEPOSIT_CONFIRMED) {
                _confirmDepositAndMint();
            } else if (transaction.txStatus == TX_SWITCH_CONFIRMED) {
                emit StrategyUpdated(strategyAddress);
            } else if (transaction.txStatus == TX_WITHDRAW_CONFIRMED) {
                _confirmWithdrawAndBurn();
            } else {
                break; // No valid transaction to process
            }
            lastProcessedNonce = nextNonce;
            delete pendingTransactions[nextNonce];
            if (!processEntireBuffer) break;
        }
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
    ) external override onlyOwner {
        if (newStrategyAddress == address(0)) revert InvalidAddress();
        if (newStrategyAddress == strategyAddress) revert InvalidAddress();

        if (totalAssets() <= 1) {
            strategyAddress = newStrategyAddress;
            emit StrategyUpdated(newStrategyAddress);
            return;
        }
        IWithdrawHelper(IAmanaRegistry(registry).withdrawHelper())
            .handleSwitchCallToStrategy(
                strategyAddress,
                newStrategyAddress,
                gasLimitForCall,
                gasLimitForWithdrawAndCall,
                address(asset()),
                registry,
                minAmountOut,
                minSharesOut,
                vaultNonce
            );
        vaultNonce++;
        strategyAddress = newStrategyAddress;
    }

    function toggleDepositFeePaidFromGasTank() external onlyOwner {
        depositFeePaidFromGasTank = !depositFeePaidFromGasTank;
    }

    function incrementLastProcessedNonce() external onlyOwner {
        lastProcessedNonce++;
    }

    /**
     * @dev Returns the total assets currently held by the vault, including assets directly held
     *      and the latest update from the strategy's total assets.
     *      1 unit of virtual assets is added to prevent donation attacks and division by zero.
     * @return The total amount of assets held by the vault.
     * @notice Overrides the {IERC4626-totalAssets} function.
     */
    function totalAssets() public view virtual override returns (uint256) {
        return latestTotalAssetsUpdateFromStrategy;
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
        uint256,
        uint256 minSharesOut
    ) internal override whenNotPaused {
        // If _asset is ERC777, `transferFrom` can trigger a reentrancy BEFORE the transfer happens through the
        // `tokensToSend` hook. On the other hand, the `tokenReceived` hook, triggered after the transfer,
        // calls the vault, which is assumed not malicious.
        // Conclusion: Transfer happens before minting, ensuring reentrancy occurs in a valid state.
        // slither-disable-next-line reentrancy-no-eth
        if (assets == 0) {
            revert AmountCantBeZero();
        }
        Transaction storage txn = pendingTransactions[vaultNonce];

        txn.withdrawERC20 = asset(); // we store this in case of a revert, to return funds to user
        txn.withdrawZRC20 = asset();

        txn.isDeposit = true;
        txn.amount = assets;
        txn.minOut = minSharesOut;
        txn.receiver = receiver;

        SafeERC20.safeTransferFrom(
            IERC20(asset()),
            caller,
            address(this),
            assets
        );
        _investAssets();
        vaultNonce++;
    }

    /**
     * @dev Initiates cross-chain investment by interacting with the gateway and strategy.
     * @notice Approves and sends assets through the gateway to the strategy's chain.
     */
    function _investAssets() internal override {
        if (IAmanaRegistry(registry).withdrawHelper() == address(0))
            revert InvalidAddress();
        Transaction storage txn = pendingTransactions[vaultNonce];
        SafeERC20.safeTransfer(
            IERC20(address(asset())),
            IAmanaRegistry(registry).withdrawHelper(),
            txn.amount
        );

        if (depositFeePaidFromGasTank) {
            IWithdrawHelper(IAmanaRegistry(registry).withdrawHelper())
                .handleGasFeeAndWithdrawAndCallToStrategy(
                    strategyAddress,
                    txn.receiver,
                    nonEvmAddressByNonce[vaultNonce],
                    txn.withdrawZRC20,
                    txn.withdrawERC20,
                    address(asset()),
                    txn.amount,
                    txn.minOut,
                    gasLimitForWithdrawAndCall,
                    registry,
                    vaultNonce
                );
        } else {
            IWithdrawHelper(IAmanaRegistry(registry).withdrawHelper())
                .handleWithdrawAndCallToStrategy(
                    strategyAddress,
                    txn.receiver,
                    nonEvmAddressByNonce[vaultNonce],
                    txn.withdrawZRC20,
                    txn.withdrawERC20,
                    address(asset()),
                    txn.amount,
                    txn.minOut,
                    gasLimitForWithdrawAndCall,
                    registry,
                    vaultNonce
                );
        }
    }

    /**
     * @dev Confirms a deposit and mints shares for the receiver.
     *      Updates the total assets and receiver's principal accordingly.
     */
    function _confirmDepositAndMint() internal {
        Transaction storage txn = pendingTransactions[lastProcessedNonce + 1];
        userPrincipal[txn.receiver] += txn.amount;
        totalPrincipal += txn.amount;

        latestTotalAssetsUpdateFromStrategy = txn.totalAssetsAfter - txn.amount;

        uint256 shares = previewDeposit(txn.amount);

        _mint(txn.receiver, shares);

        latestTotalAssetsUpdateFromStrategy = txn.totalAssetsAfter;

        emit Deposited(
            txn.receiver,
            txn.amount,
            shares,
            lastProcessedNonce + 1
        );
    }

    /**
     * @dev Withdrawn/redeem common workflow. Handles user withdrawal requests and initiates divestment from the strategy.
     * @param caller The address of the entity initiating the withdrawal.
     * @param user The address of the user receiving the withdrawn assets.
     * @param receiver The address of the receiver of the withdrawn assets.
     * @param withdrawZRC20 The ZRC20 token to be withdrawn.
     * @param minAmountOut The minimum amount of assets expected to be received after withdrawal.
     * @param assets The amount of assets to withdraw.
     * @param slippage The allowed slippage percentage for the withdrawal.
     * @notice Ensures proper allowance checks and calculates fees before initiating strategy divestment.
     */
    function _withdraw(
        address caller, //caller
        address receiver, // receiver
        address user, // owner
        address withdrawZRC20,
        uint256 minAmountOut,
        uint256 assets,
        uint16 slippage
    ) internal override {
        Transaction storage txn = pendingTransactions[vaultNonce];

        uint256 maxAmount = maxWithdraw(txn.user);
        if (txn.amount > maxAmount - pendingWithdrawals[txn.user]) {
            revert ERC4626ExceededMaxWithdraw(txn.user, txn.amount, maxAmount);
        }

        txn.user = caller;
        txn.receiver = receiver;
        txn.withdrawZRC20 = withdrawZRC20;

        txn.withdrawERC20 = asset();
        txn.amount = assets;
        txn.slippage = slippage;
        txn.isDeposit = false;
        txn.minOut = minAmountOut;
        txn.withdrawChainId = uint32(block.chainid);

        pendingWithdrawals[user] += assets;
        uint256 shares = previewWithdraw(assets);
        if (caller != user) {
            _spendAllowance(user, caller, shares);
        }

        IWithdrawHelper(IAmanaRegistry(registry).withdrawHelper())
            .handleDivestCallToStrategy(
                strategyAddress,
                gasLimitForCall,
                address(asset()),
                registry,
                user,
                withdrawZRC20,
                assets,
                minAmountOut,
                vaultNonce
            );

        vaultNonce++;
    }

    /**
     * @dev Withdrawn/redeem common workflow for withdrawals initiated from a connected chain.
     * @notice Validates maximum withdrawal limits and calculates fees before initiating divestment.
     */
    function _withdrawComingFromConnectedChain() internal override {
        Transaction storage txn = pendingTransactions[vaultNonce];

        if (txn.amount == 0) {
            revert AmountCantBeZero();
        }
        uint256 maxAmount = maxWithdraw(txn.user);
        if (txn.amount > maxAmount - pendingWithdrawals[txn.user]) {
            revert ERC4626ExceededMaxWithdraw(txn.user, txn.amount, maxAmount);
        }
        pendingWithdrawals[txn.user] += txn.amount;

        IWithdrawHelper(IAmanaRegistry(registry).withdrawHelper())
            .handleDivestCallToStrategy(
                strategyAddress,
                gasLimitForCall,
                address(asset()),
                registry,
                txn.user,
                txn.withdrawZRC20,
                txn.amount,
                txn.minOut,
                vaultNonce
            );
    }

    /**
     * @dev Confirms the withdrawal process by burning shares, applying fees, and returning assets to the user.

     * @notice Ensures that fees are correctly deducted, shares are burned, and assets are returned to the user.
     */
    function _confirmWithdrawAndBurn() internal {
        Transaction storage txn = pendingTransactions[lastProcessedNonce + 1];
        latestTotalAssetsUpdateFromStrategy = txn.totalAssetsAfter + txn.amount;

        uint256 userShares = balanceOf(txn.user);
        uint256 vaultSharesToBeBurnt = previewWithdraw(txn.amount);
        // (a) Cap burn amount to avoid over-burn
        if (vaultSharesToBeBurnt > userShares) {
            vaultSharesToBeBurnt = userShares;
        }

        // (b) If burning leaves tiny residual shares, burn all instead
        uint256 remainingShares = userShares - vaultSharesToBeBurnt;
        uint256 minResidual = 1e3;

        if (remainingShares > 0 && remainingShares < minResidual) {
            vaultSharesToBeBurnt = userShares;
        }

        uint256 fractionOfUserShares = (vaultSharesToBeBurnt * 1e18) /
            balanceOf(txn.user);
        uint256 principalWithdrawn = (fractionOfUserShares *
            userPrincipal[txn.user]) / 1e18;
        uint256 feeToWithdraw;
        if (txn.amount > principalWithdrawn) {
            feeToWithdraw =
                ((txn.amount - principalWithdrawn) * perfFee) /
                10000;
            emit PerformanceFeePaid(txn.user, feeToWithdraw);
            SafeERC20.safeTransfer(
                IERC20(asset()),
                IAmanaRegistry(registry).treasury(),
                feeToWithdraw
            );
        }
        txn.amount -= feeToWithdraw;

        userPrincipal[txn.user] -= principalWithdrawn;
        totalPrincipal -= principalWithdrawn;

        latestTotalAssetsUpdateFromStrategy = txn.totalAssetsAfter;
        _burn(txn.user, vaultSharesToBeBurnt);

        _returnFundsToUser(lastProcessedNonce + 1);

        emit Withdrawn(
            txn.user,
            txn.amount,
            vaultSharesToBeBurnt,
            lastProcessedNonce + 1
        );
    }
}
