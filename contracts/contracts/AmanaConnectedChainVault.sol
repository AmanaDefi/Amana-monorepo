// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./AmanaVaultBase.sol";

/// @title Amana Connected Chain Vault
/// @notice A vault that interacts with ZetaChain-connected strategies
/// @dev Implements ERC4626 with custom cross-chain functionality
contract AmanaConnectedChainVault is AmanaVaultBase {
    using SafeERC20 for IERC20;
    using Math for uint256;

    event TotalAssetsUpdated(uint256 totalAssets);

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
            if (message.length == 96) {
                (
                    address newStrategyAddress,
                    uint256 totalAssetsAfter,
                    uint256 executionNonce
                ) = abi.decode(message, (address, uint256, uint256));
                if (newStrategyAddress == address(0)) {
                    console.log(
                        "Received deposit confirmation with nonce: ",
                        executionNonce
                    );
                    transactions[executionNonce]
                        .totalAssetsAfter = totalAssetsAfter;
                } else {
                    console.log(
                        "Received strategy switch confirmation with nonce: ",
                        executionNonce
                    );
                    transactions[executionNonce]
                        .totalAssetsAfter = totalAssetsAfter;
                    transactions[executionNonce]
                        .withdrawZRC20 = newStrategyAddress;
                }
            } else {
                (
                    uint256 withdrawnAmount,
                    uint256 vaultSharesToBeBurnt,
                    uint256 totalAssetsAfter,
                    uint256 executionNonce
                ) = abi.decode(message, (uint256, uint256, uint256, uint256));
                if (withdrawnAmount == 0) {
                    console.log(
                        "Received asset update with nonce: ",
                        executionNonce
                    );
                    transactions[executionNonce]
                        .vaultSharesToBeBurnt = vaultSharesToBeBurnt;
                    transactions[executionNonce]
                        .totalAssetsAfter = totalAssetsAfter;
                } else {
                    console.log(
                        "Received withdrawal confirmation with nonce: ",
                        executionNonce
                    );
                    console.log(
                        "zrc20 coming back from cc message (vault asset): ",
                        zrc20
                    );
                    console.log(
                        "withdrawZRC20 previously set in txn during initiation: ",
                        transactions[executionNonce].withdrawZRC20
                    );
                    transactions[executionNonce].amount = withdrawnAmount;
                    transactions[executionNonce]
                        .totalAssetsAfter = totalAssetsAfter;
                }
            }

            _processBufferedConfirmations(true);
            // } else {
            //     revert("Invalid strategy message type");
            // }
        } else {
            Transaction storage txn = transactions[vaultNonce];
            if (context.sender == address(0)) revert InvalidAddress();

            txn.user = context.sender; // common to both paths
            txn.amount = amount;
            txn.withdrawZRC20 = zrc20;

            if (message.length == 96) {
                // TODO what is correct length here?
                (address erc20source, uint256 minimumOut, uint16 slippage) = abi
                    .decode(message, (address, uint256, uint16));

                txn.withdrawERC20 = erc20source;
                console.log("Initiating deposit from connected chain");
                _depositComingFromConnectedChain(
                    context.sender,
                    context.chainID,
                    amount,
                    minimumOut,
                    zrc20,
                    slippage
                );
            } else if (message.length == 192) {
                (
                    address withdrawZRC20,
                    address withdrawERC20,
                    uint256 vaultSharesToBeBurnt,
                    uint256 minimumOut,
                    uint16 slippage,
                    bytes32 nonEvmAddress
                ) = abi.decode(
                        message,
                        (address, address, uint256, uint256, uint16, bytes32)
                    );

                txn.withdrawZRC20 = withdrawZRC20;
                txn.withdrawERC20 = withdrawERC20;
                txn.vaultSharesToBeBurnt = vaultSharesToBeBurnt;
                txn.slippage = slippage;
                txn.nonEvmAddress = nonEvmAddress;
                txn.isDeposit = false;
                txn.receiver = context.sender; // could take in a different receiver?
                txn.user = context.sender;

                console.log("Initiating withdrawal from connected chain");
                console.log("with slippage set to: ", slippage);
                _withdrawComingFromConnectedChain(minimumOut);
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
     * @dev Processes a transaction message from the strategy.
     *      This function validates and stores the transaction details for deposit, withdrawal or totalAsset update actions
     *      and then attempts to process all pending confirmations in order.
     */
    // function _processConfirmationFromStrategy(uint256 executionNonce) internal {
    //     // Ensure no duplicate processing
    //     if (
    //         transactions[executionNonce].amount != 0 &&
    //         transactions[executionNonce].totalAssetsAfter != 0
    //     ) revert ConfirmationAlreadyProcessed();

    //     // Attempt to process confirmations
    //     _processBufferedConfirmations(true);
    // }

    /**
     * @dev Allows for manual input of a transaction message, mimicking _processConfirmationFromStrategy.
     * @param user The address of the user associated with the transaction.
     * @param withdrawZRC20 The ZRC20 token address involved in the withdrawal, if applicable.
     * @param withdrawAmount The amount of the ZRC20 token to be withdrawn, if applicable.
     * @param withdrawChainId The chain ID of the withdrawal, if applicable.
     * @param isDeposit A boolean indicating if the transaction is for a deposit (true) or withdrawal (false).
     * @param totalAssetsAfter The total assets in the vault after the operation.
     * @param executionNonce A unique identifier for the transaction to ensure it is processed only once.
     */
    function manuallyAddConfirmation(
        address user,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        uint256 withdrawAmount,
        uint256 vaultSharesToBeBurnt,
        uint32 withdrawChainId,
        bool isDeposit,
        uint256 totalAssetsAfter,
        uint256 executionNonce,
        bytes32 _nonEvmAddress,
        uint16 _slippage,
        bool processEntireBuffer
    ) external onlyOwner {
        // Store the transaction in the buffer
        transactions[executionNonce] = Transaction({
            user: user,
            receiver: receiver,
            withdrawZRC20: withdrawZRC20,
            withdrawERC20: withdrawERC20,
            amount: withdrawAmount,
            vaultSharesToBeBurnt: vaultSharesToBeBurnt,
            withdrawChainId: withdrawChainId,
            isDeposit: isDeposit,
            totalAssetsAfter: totalAssetsAfter,
            nonEvmAddress: _nonEvmAddress,
            slippage: _slippage
        });

        // Attempt to process confirmations
        _processBufferedConfirmations(processEntireBuffer);
    }

    function processExistingConfirmation(
        uint256 executionNonce
    ) external onlyOwner {
        // Ensure the transaction exists
        if (transactions[executionNonce].amount == 0) {
            revert ConfirmationAlreadyProcessed();
        }

        // Attempt to process confirmations
        _processBufferedConfirmations(false);
    }

    /**
     * @dev Processes all buffered confirmations sequentially based on their execution nonce.
     *      This function ensures confirmations are handled in order, either for deposits or withdrawals.
     *      Once a transaction is processed, it is removed from the buffer.
     */
    function _processBufferedConfirmations(bool processEntireBuffer) internal {
        while (true) {
            uint256 nextNonce = lastProcessedNonce + 1;
            console.log(
                "Looking to process confirmation with nonce: ",
                nextNonce
            );
            Transaction memory transaction = transactions[nextNonce];
            // If there's no transaction for the next nonce, stop processing
            if (transaction.totalAssetsAfter == 0 && transaction.amount == 0) {
                console.log("Breaking out of procession tx");
                break;
            }
            //     if (
            //         transactions[executionNonce].amount != 0 &&
            //         transactions[executionNonce].totalAssetsAfter != 0
            //     ) revert ConfirmationAlreadyProcessed();
            // Process the transaction
            if (transaction.isDeposit) {
                console.log("Calling _confirmDepositAndMint");
                _confirmDepositAndMint();
            } else if (
                transaction.user == address(0) &&
                transaction.receiver == address(0)
            ) {
                console.log("transaction.user", transaction.user);
                console.log("transaction.receiver", transaction.receiver);
                if (transaction.withdrawZRC20 == address(0)) {
                    if (transaction.vaultSharesToBeBurnt > 0) {
                        console.log("Updating pendingWithdrawals");
                        pendingWithdrawals[transaction.user] -= transaction
                            .vaultSharesToBeBurnt;
                    }
                    // update total assets
                    console.log("Updating total assets");
                    latestTotalAssetsUpdateFromStrategy = transaction
                        .totalAssetsAfter;
                    emit TotalAssetsUpdated(transaction.totalAssetsAfter);
                } else {
                    console.log("Updating strategy address");
                    strategyAddress = transaction.withdrawZRC20;
                    emit StrategyUpdated(strategyAddress);
                }
            } else {
                console.log("Calling _confirmWithdrawAndBurn");
                _confirmWithdrawAndBurn();
            }

            // Mark this nonce as processed
            lastProcessedNonce = nextNonce; // TODO - check if this is correct
            delete transactions[nextNonce];
            if (!processEntireBuffer) {
                break; // Stop processing if not in processEntireBuffer mode
            }
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
        uint256 minAmountOut
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
        // Transaction storage txn = transactions[vaultNonce];
        // console.log(
        //     "Depositing assets with nonce: ",
        //     vaultNonce,
        //     " and amount: ",
        //     assets
        // );
        // txn.withdrawERC20 = asset(); // we store this in case of a revert, to return funds to user
        // txn.isDeposit = true;
        // txn.amount = assets;
        // txn.receiver = receiver;
        // txn.minAmount = minimumOut;

        SafeERC20.safeTransferFrom(
            IERC20(asset()),
            caller,
            address(this),
            assets
        );
        _investAssets(assets, minimumOut, receiver, asset());
        vaultNonce++;
    }

    /**
     * @dev Initiates cross-chain investment by interacting with the gateway and strategy.
     * @param amount The amount of assets to invest.
     * @param receiver The address of the receiver initiating the investment.
     * @param userZRC20 The ZRC20 token address representing the receiver's assets.
     * @notice Approves and sends assets through the gateway to the strategy's chain.
     */
    function _investAssets(
        uint256 amount,
        uint256 minimumOut,
        address receiver,
        address userZRC20
    ) internal override {
        if (IAmanaRegistry(registry).withdrawHelper() == address(0))
            revert InvalidAddress();

        Transaction storage txn = transactions[vaultNonce];
        console.log(
            "Investing assets with nonce: ",
            vaultNonce,
            " and amount: ",
            amount
        );
        txn.amount = amount;
        txn.withdrawZRC20 = userZRC20;
        txn.withdrawERC20 = asset();

        txn.receiver = receiver;
        txn.isDeposit = true;

        SafeERC20.safeTransfer(
            IERC20(address(asset())),
            IAmanaRegistry(registry).withdrawHelper(),
            amount
        );
        uint256 previewedShares = previewDeposit(amount);
        require(previewedShares <= uint256(type(int256).max), "Overflow");

        pendingShareChange += int256(previewedShares);

        if (depositFeePaidFromGasTank) {
            IWithdrawHelper(IAmanaRegistry(registry).withdrawHelper())
                .handleGasFeeAndWithdrawAndCallToStrategy(
                    strategyAddress,
                    receiver,
                    userZRC20,
                    address(asset()),
                    amount,
                    minimumOut,
                    gasLimitForWithdrawAndCall,
                    registry,
                    vaultNonce
                );
        } else {
            IWithdrawHelper(IAmanaRegistry(registry).withdrawHelper())
                .handleWithdrawAndCallToStrategy(
                    strategyAddress,
                    receiver,
                    userZRC20,
                    address(asset()),
                    amount,
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

        pendingShareChange -= int256(shares);
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
        console.log(
            "Withdrawing assets with nonce: ",
            vaultNonce,
            " and amount: ",
            shares
        );
        txn.user = caller;
        console.log("user: ", user);
        console.log("receiver: ", receiver);
        txn.receiver = receiver;
        txn.withdrawZRC20 = withdrawZRC20;
        console.log("withdrawZRC20 in _withdraw function: ", withdrawZRC20);
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
        console.log(
            "Cross chain Withdrawing assets with nonce: ",
            vaultNonce,
            " and amount: ",
            txn.vaultSharesToBeBurnt
        );
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
        console.log(
            "Executing _confirmWithdrawAndBurn with nonce: ",
            lastProcessedNonce + 1
        );
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
        pendingShareChange += int256(txn.vaultSharesToBeBurnt);
        _returnFundsToUser();

        emit Withdrawn(
            txn.user,
            txn.amount,
            txn.vaultSharesToBeBurnt,
            vaultNonce - 1
        );
    }

    function safeUintToInt(uint256 x) internal pure returns (int256) {
        require(x <= uint256(type(int256).max), "safeUintToInt: overflow");
        return int256(x);
    }
}
