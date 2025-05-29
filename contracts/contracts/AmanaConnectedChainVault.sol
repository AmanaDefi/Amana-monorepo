// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./AmanaVaultBase.sol";

/// @title Amana Connected Chain Vault
/// @notice A vault that interacts with ZetaChain-connected strategies
/// @dev Implements ERC4626 with custom cross-chain functionality
contract AmanaConnectedChainVault is AmanaVaultBase {
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
            gasLimitCall_
        );
        depositFeePaidFromGasTank = depositFeePaidFromGasTank_;
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
                bytes32 txSucceeded
            ) = abi.decode(message, (uint256, uint256, uint256, bytes32));

            if (confirmationNonce == lastProcessedNonce) {
                // this is an update (totalAssetsAfter)
                latestTotalAssetsUpdateFromStrategy = totalAssetsAfter;
                emit TotalAssetsUpdated(totalAssetsAfter, confirmationNonce);
            } else {
                transactions[confirmationNonce]
                    .totalAssetsAfter = totalAssetsAfter;
                if (!transactions[confirmationNonce].isDeposit) {
                    // this is a withdrawal confirmation
                    transactions[confirmationNonce].amount = withdrawnAmount;
                    transactions[confirmationNonce].txSucceeded = txSucceeded; // non-zero means a revert
                }
            }
            if (confirmationNonce == lastProcessedNonce + 1) {
                // Process the confirmation immediately if it's the next one in line
                _processBufferedTransactions(true);
            }
        } else {
            Transaction storage txn = transactions[vaultNonce];
            if (context.sender == address(0)) revert InvalidAddress();

            txn.user = context.sender; // common to both paths
            txn.receiver = context.sender; // could take in a different receiver?
            txn.amount = amount;
            txn.withdrawChainId = uint32(context.chainID);
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

            if (amount > 0) {
                (
                    address erc20source,
                    uint256 minimumOut,
                    uint16 slippage,
                    bytes memory nonEvmAddress
                ) = abi.decode(message, (address, uint256, uint16, bytes));

                txn.withdrawZRC20 = zrc20;
                txn.withdrawERC20 = erc20source;
                txn.slippage = slippage;
                txn.isDeposit = true;
                nonEvmAddressByNonce[vaultNonce] = nonEvmAddress;

                _depositComingFromConnectedChain(minimumOut);
            } else {
                (
                    address withdrawZRC20,
                    address withdrawERC20,
                    uint256 vaultSharesToBeBurnt,
                    uint256 minimumOut,
                    uint16 slippage,
                    bytes memory nonEvmAddress
                ) = abi.decode(
                        message,
                        (address, address, uint256, uint256, uint16, bytes)
                    );

                txn.withdrawZRC20 = withdrawZRC20;
                txn.withdrawERC20 = withdrawERC20;
                txn.vaultSharesToBeBurnt = vaultSharesToBeBurnt;
                txn.slippage = slippage;
                txn.isDeposit = false;
                nonEvmAddressByNonce[vaultNonce] = nonEvmAddress;

                _withdrawComingFromConnectedChain(minimumOut);
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
     * @dev Processes a transaction message from the strategy.
     *      This function validates and stores the transaction details for deposit, withdrawal or totalAsset update actions
     *      and then attempts to process all pending confirmations in order.
     */
    // function _processConfirmationFromStrategy(uint256 confirmationNonce) internal {
    //     // Ensure no duplicate processing
    //     if (
    //         transactions[confirmationNonce].amount != 0 &&
    //         transactions[confirmationNonce].totalAssetsAfter != 0
    //     ) revert ConfirmationAlreadyProcessed();

    //     // Attempt to process confirmations
    //     _processBufferedTransactions(true);
    // }

    /**
     * @dev Allows for manual input of a transaction message, mimicking _processConfirmationFromStrategy.
     * @param amount The amount of the ZRC20 token to be withdrawn, if applicable.
     * @param totalAssetsAfter The total assets in the vault after the operation.
     * @param confirmationNonce A unique identifier for the transaction to ensure it is processed only once.
     * @param _txSucceeded A bytes32 value indicating whether the transaction succeeded or failed.
     */
    function manuallyAddConfirmation(
        uint256 amount,
        uint256 totalAssetsAfter,
        uint256 confirmationNonce,
        bytes32 _txSucceeded
    ) external onlyOwner {
        // Store the transaction in the buffer
        Transaction storage txn = transactions[confirmationNonce];
        txn.amount = amount;
        txn.totalAssetsAfter = totalAssetsAfter;
        txn.txSucceeded = _txSucceeded;
    }

    function processExistingConfirmations(
        uint256 confirmationNonce,
        bool processEntireBuffer
    ) external onlyOwner {
        // Ensure the transaction exists
        if (
            transactions[confirmationNonce].totalAssetsAfter == 0 &&
            transactions[confirmationNonce].amount == 0
        ) {
            revert ConfirmationAlreadyProcessed();
        }

        // Attempt to process confirmations
        _processBufferedTransactions(processEntireBuffer);
    }

    /**
     * @dev Processes all buffered confirmations sequentially based on their execution nonce.
     *      This function ensures confirmations are handled in order, either for deposits or withdrawals.
     *      Once a transaction is processed, it is removed from the buffer.
     */
    function _processBufferedTransactions(bool processEntireBuffer) internal {
        while (true) {
            uint256 nextNonce = lastProcessedNonce + 1;
            Transaction memory transaction = transactions[nextNonce];

            // if (
            //     (nextNonce >= vaultNonce) || // No more transactions to process
            //     (transaction.isDeposit && transaction.amount == 0) || // unconfirmed deposit
            //     (!transaction.isDeposit && transaction.amount == 0) || // unconfirmed withdrawal - this is knocking out switch as well!
            //     (transaction.user == address(0) &&
            //         transaction.receiver == address(0) &&
            //         transaction.totalAssetsAfter == 0) // unconfirmed switch
            // ) {
            //     break;
            // }

            if (transaction.txSucceeded != bytes32(0)) {
                // A revert update from strategy
                pendingWithdrawals[transaction.user] -= transaction
                    .vaultSharesToBeBurnt;
                latestTotalAssetsUpdateFromStrategy = transaction
                    .totalAssetsAfter;
            } else if (transaction.isDeposit) {
                if (transaction.totalAssetsAfter == 0) {
                    break;
                }

                _confirmDepositAndMint();
            } else if (
                transaction.user == address(0) &&
                transaction.receiver == address(0)
            ) {
                if (transaction.totalAssetsAfter == 0) {
                    break;
                }
                emit StrategyUpdated(strategyAddress);
            } else {
                if (transaction.amount == 0) {
                    break;
                }

                _confirmWithdrawAndBurn();
            }
            lastProcessedNonce = nextNonce;
            delete transactions[nextNonce];
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
        uint256 minimumOut
    ) internal override whenNotPaused {
        // If _asset is ERC777, `transferFrom` can trigger a reentrancy BEFORE the transfer happens through the
        // `tokensToSend` hook. On the other hand, the `tokenReceived` hook, triggered after the transfer,
        // calls the vault, which is assumed not malicious.
        // Conclusion: Transfer happens before minting, ensuring reentrancy occurs in a valid state.
        // slither-disable-next-line reentrancy-no-eth
        if (assets == 0) {
            revert AmountCantBeZero();
        }
        Transaction storage txn = transactions[vaultNonce];

        txn.withdrawERC20 = asset(); // we store this in case of a revert, to return funds to user
        txn.withdrawZRC20 = asset();

        txn.isDeposit = true;
        txn.amount = assets;
        txn.receiver = receiver;

        SafeERC20.safeTransferFrom(
            IERC20(asset()),
            caller,
            address(this),
            assets
        );
        _investAssets(minimumOut);
        vaultNonce++;
    }

    /**
     * @dev Initiates cross-chain investment by interacting with the gateway and strategy.
     * @notice Approves and sends assets through the gateway to the strategy's chain.
     */
    function _investAssets(uint256 minimumOut) internal override {
        if (IAmanaRegistry(registry).withdrawHelper() == address(0))
            revert InvalidAddress();
        Transaction storage txn = transactions[vaultNonce];
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
                    address(asset()),
                    txn.amount,
                    minimumOut,
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
                    address(asset()),
                    txn.amount,
                    minimumOut,
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
        Transaction storage txn = transactions[lastProcessedNonce + 1];
        pendingShareChange -= int256(txn.vaultSharesToBeBurnt);
        // TODO -- insert a check here - is previewedShares approx equal to shares?
        userPrincipal[txn.receiver] += txn.amount;
        totalPrincipal += txn.amount;

        if (txn.totalAssetsAfter >= txn.amount) {
            latestTotalAssetsUpdateFromStrategy =
                txn.totalAssetsAfter -
                txn.amount;
        } else {
            latestTotalAssetsUpdateFromStrategy = 0;
        }

        uint256 shares = previewDeposit(txn.amount);

        _mint(txn.receiver, shares);

        latestTotalAssetsUpdateFromStrategy = txn.totalAssetsAfter;
        require(shares <= uint256(type(int256).max), "Overflow");

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
     * @param shares The number of shares being redeemed for the withdrawal.
     * @notice Ensures proper allowance checks and calculates fees before initiating strategy divestment.
     */
    function _withdraw(
        address caller, //caller
        address receiver, // receiver
        address user, // owner
        address withdrawZRC20,
        uint256 minimumOut,
        uint256 shares,
        uint16 slippage
    ) internal override {
        uint256 maxShares = maxRedeem(user);

        if (shares > maxShares - pendingWithdrawals[user]) {
            revert ERC4626ExceededMaxRedeem(user, shares, maxShares);
        }

        Transaction storage txn = transactions[vaultNonce];

        txn.user = caller;
        txn.receiver = receiver;
        txn.withdrawZRC20 = withdrawZRC20;

        txn.withdrawERC20 = asset();
        txn.vaultSharesToBeBurnt = shares;
        txn.slippage = slippage;
        txn.isDeposit = false;
        txn.withdrawChainId = uint32(block.chainid);

        pendingWithdrawals[user] += shares;

        if (caller != user) {
            _spendAllowance(user, caller, shares);
        }

        uint256 amendedTotalSupply = pendingShareChange >= 0
            ? totalSupply() + uint256(pendingShareChange)
            : totalSupply() - uint256(-pendingShareChange);

        IWithdrawHelper(IAmanaRegistry(registry).withdrawHelper())
            .handleDivestCallToStrategy(
                strategyAddress,
                gasLimitForCall,
                amendedTotalSupply,
                address(asset()),
                registry,
                user,
                withdrawZRC20,
                shares,
                minimumOut,
                vaultNonce
            );
        require(shares <= uint256(type(int256).max), "Overflow");

        pendingShareChange -= int256(shares);
        vaultNonce++;
    }

    /**
     * @dev Withdrawn/redeem common workflow for withdrawals initiated from a connected chain.
     * @notice Validates maximum withdrawal limits and calculates fees before initiating divestment.
     */
    function _withdrawComingFromConnectedChain(
        uint256 minimumOut
    ) internal override {
        Transaction storage txn = transactions[vaultNonce];

        if (txn.vaultSharesToBeBurnt == 0) {
            revert AmountCantBeZero();
        }
        uint256 maxShares = maxRedeem(txn.user);
        if (
            txn.vaultSharesToBeBurnt > maxShares - pendingWithdrawals[txn.user]
        ) {
            revert ERC4626ExceededMaxRedeem(
                txn.user,
                txn.vaultSharesToBeBurnt,
                maxShares
            );
        }
        pendingWithdrawals[txn.user] += txn.vaultSharesToBeBurnt;

        uint256 amendedTotalSupply = pendingShareChange >= 0
            ? totalSupply() + uint256(pendingShareChange)
            : totalSupply() - uint256(-pendingShareChange);
        console.log("Total Supply:", totalSupply());
        console.log("Amended Total Supply:", amendedTotalSupply);
        console.log("Shares:", txn.vaultSharesToBeBurnt);
        IWithdrawHelper(IAmanaRegistry(registry).withdrawHelper())
            .handleDivestCallToStrategy(
                strategyAddress,
                gasLimitForCall,
                amendedTotalSupply,
                address(asset()),
                registry,
                txn.user,
                txn.withdrawZRC20,
                txn.vaultSharesToBeBurnt,
                minimumOut,
                vaultNonce
            );
        require(
            txn.vaultSharesToBeBurnt <= uint256(type(int256).max),
            "Overflow"
        );

        pendingShareChange -= int256(txn.vaultSharesToBeBurnt);
    }

    /**
     * @dev Confirms the withdrawal process by burning shares, applying fees, and returning assets to the user.

     * @notice Ensures that fees are correctly deducted, shares are burned, and assets are returned to the user.
     */
    function _confirmWithdrawAndBurn() internal {
        Transaction storage txn = transactions[lastProcessedNonce + 1];

        pendingShareChange += int256(txn.vaultSharesToBeBurnt); // TODO - is this the right place for this?
        uint256 fractionOfUserShares = (txn.vaultSharesToBeBurnt * 1e18) /
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
        pendingWithdrawals[txn.user] -= txn.vaultSharesToBeBurnt;

        latestTotalAssetsUpdateFromStrategy = txn.totalAssetsAfter;
        _burn(txn.user, txn.vaultSharesToBeBurnt);

        require(
            txn.vaultSharesToBeBurnt <= uint256(type(int256).max),
            "Overflow"
        );
        _returnFundsToUser(lastProcessedNonce + 1);

        emit Withdrawn(
            txn.user,
            txn.amount,
            txn.vaultSharesToBeBurnt,
            lastProcessedNonce + 1
        );
    }

    function safeUintToInt(uint256 x) internal pure returns (int256) {
        require(x <= uint256(type(int256).max), "safeUintToInt: overflow");
        return int256(x);
    }

    function adjustPendingShareChange(
        uint256 previewedShares,
        uint256 nonce
    ) public {
        int256 signedShares = safeUintToInt(previewedShares);
        pendingShareChange += signedShares;

        Transaction storage txn = transactions[nonce];
        txn.vaultSharesToBeBurnt = previewedShares;
    }
}
