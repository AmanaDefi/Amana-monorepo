// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./AmanaVaultBase.sol";

/// @title Amana Connected Chain Vault
/// @notice A vault that interacts with ZetaChain-connected strategies
/// @dev Implements ERC4626 with custom cross-chain functionality
contract AmanaConnectedChainVault is AmanaVaultBase {
    using SafeERC20 for IERC20;
    using Math for uint256;

    uint256 latestTotalAssetsUpdateFromStrategy;
    uint256 public lastProcessedNonce;
    struct Confirmation {
        address user;
        address receiver;
        address withdrawZRC20;
        address withdrawERC20;
        uint256 amount;
        uint256 fractionOfTotalShares;
        uint32 withdrawChainId;
        bool isDeposit;
        uint256 totalAssetsAfter;
        bytes32 crossChainTxId;
        uint16 slippage;
    }

    mapping(uint256 => Confirmation) pendingConfirmations; // Buffer for out-of-order confirmations
    mapping(address => uint256) pendingWithdrawals;
    bool public depositFeePaidFromGasTank;

    event CrossChainInvestSent(bytes32 indexed crossChainTxId);
    event CrossChainInvestFailed(bytes32 indexed crossChainTxId);
    event DivestSent(bytes32 indexed crossChainTxId);
    event DivestFailed(bytes32 indexed crossChainTxId);
    event TotalAssetsUpdated(uint256 totalAssets);
    event SwitchStrategyFailed(bytes32 indexed crossChainTxId);

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
        // __ERC20_init(name, symbol);
        // __Ownable_init(msg.sender);
        // __ERC4626_init(asset);
        // __UUPSUpgradeable_init();
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
        depositFeePaidFromGasTank_;
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
                address user,
                address receiver,
                address withdrawZRC20,
                address withdrawERC20,
                uint256 withdrawAmount,
                uint256 fractionOfTotalShares,
                uint32 withdrawChainId,
                bool isDeposit,
                uint256 totalAssetsAfter,
                uint256 executionNonce,
                bytes32 _crossChainTxId,
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
                        uint32,
                        bool,
                        uint256,
                        uint256,
                        bytes32,
                        uint16
                    )
                );
            _processConfirmationFromStrategy(
                user,
                receiver,
                withdrawZRC20,
                withdrawERC20,
                withdrawAmount,
                fractionOfTotalShares,
                withdrawChainId,
                isDeposit,
                totalAssetsAfter,
                executionNonce,
                _crossChainTxId,
                slippage
            );
        } else {
            if (context.sender == address(0)) revert InvalidAddress();
            if (message.length == 128) {
                (
                    address erc20source,
                    uint256 minimumOut,
                    uint16 slippage,
                    bytes32 crossChainTxId
                ) = abi.decode(message, (address, uint256, uint16, bytes32));
                _depositComingFromConnectedChain(
                    context.sender,
                    context.chainID,
                    amount,
                    minimumOut,
                    zrc20,
                    erc20source,
                    slippage,
                    crossChainTxId
                );
            } else if (message.length == 192) {
                (
                    address withdrawZRC20,
                    address withdrawERC20,
                    uint256 shares,
                    uint256 minimumOut,
                    uint16 slippage,
                    bytes32 crossChainTxId
                ) = abi.decode(
                        message,
                        (address, address, uint256, uint256, uint16, bytes32)
                    );
                _withdrawComingFromConnectedChain(
                    context.sender,
                    withdrawZRC20,
                    withdrawERC20,
                    shares,
                    minimumOut,
                    uint32(context.chainID),
                    slippage,
                    crossChainTxId
                );
            } else {
                revert InvalidMessage();
            }
        }
    }

    /**
     * @dev Processes a confirmation message from the strategy.
     *      This function validates and stores the confirmation details for deposit, withdrawal or totalAsset update actions
     *      and then attempts to process all pending confirmations in order.
     * @param user The address of the user associated with the confirmation.
     * @param withdrawZRC20 The ZRC20 token address involved in the withdrawal, if applicable.
     * @param withdrawAmount The amount of the ZRC20 token to be withdrawn, if applicable.
     * @param withdrawChainId The chain ID of the withdrawal, if applicable.
     * @param isDeposit A boolean indicating if the confirmation is for a deposit (true) or withdrawal (false).
     * @param totalAssetsAfter The total assets in the vault after the operation.
     * @param executionNonce A unique identifier for the confirmation to ensure it is processed only once.
     */
    function _processConfirmationFromStrategy(
        address user,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        uint256 withdrawAmount,
        uint256 fractionOfTotalShares,
        uint32 withdrawChainId,
        bool isDeposit,
        uint256 totalAssetsAfter,
        uint256 executionNonce,
        bytes32 _crossChainTxId,
        uint16 _slippage
    ) internal {
        // Ensure no duplicate processing
        if (
            pendingConfirmations[executionNonce].amount != 0 &&
            pendingConfirmations[executionNonce].totalAssetsAfter != 0
        ) revert ConfirmationAlreadyProcessed();
        // Store the confirmation in the buffer
        pendingConfirmations[executionNonce] = Confirmation({
            user: user,
            receiver: receiver,
            withdrawZRC20: withdrawZRC20,
            withdrawERC20: withdrawERC20,
            amount: withdrawAmount,
            fractionOfTotalShares: fractionOfTotalShares,
            withdrawChainId: withdrawChainId,
            isDeposit: isDeposit,
            totalAssetsAfter: totalAssetsAfter,
            crossChainTxId: _crossChainTxId,
            slippage: _slippage
        });

        // Attempt to process confirmations
        _processBufferedConfirmations();
    }

    /**
     * @dev Allows for manual input of a confirmation message, mimicking _processConfirmationFromStrategy.
     * @param user The address of the user associated with the confirmation.
     * @param withdrawZRC20 The ZRC20 token address involved in the withdrawal, if applicable.
     * @param withdrawAmount The amount of the ZRC20 token to be withdrawn, if applicable.
     * @param withdrawChainId The chain ID of the withdrawal, if applicable.
     * @param isDeposit A boolean indicating if the confirmation is for a deposit (true) or withdrawal (false).
     * @param totalAssetsAfter The total assets in the vault after the operation.
     * @param executionNonce A unique identifier for the confirmation to ensure it is processed only once.
     */
    function manuallyAddConfirmation(
        address user,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        uint256 withdrawAmount,
        uint256 fractionOfTotalShares,
        uint32 withdrawChainId,
        bool isDeposit,
        uint256 totalAssetsAfter,
        uint256 executionNonce,
        bytes32 _crossChainTxId,
        uint16 _slippage
    ) external onlyOwner {
        // Ensure no duplicate processing
        if (
            pendingConfirmations[executionNonce].amount != 0 &&
            pendingConfirmations[executionNonce].totalAssetsAfter != 0
        ) revert ConfirmationAlreadyProcessed();
        // Store the confirmation in the buffer
        pendingConfirmations[executionNonce] = Confirmation({
            user: user,
            receiver: receiver,
            withdrawZRC20: withdrawZRC20,
            withdrawERC20: withdrawERC20,
            amount: withdrawAmount,
            fractionOfTotalShares: fractionOfTotalShares,
            withdrawChainId: withdrawChainId,
            isDeposit: isDeposit,
            totalAssetsAfter: totalAssetsAfter,
            crossChainTxId: _crossChainTxId,
            slippage: _slippage
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
            if (
                confirmation.totalAssetsAfter == 0 && confirmation.amount == 0
            ) {
                break;
            }
            // Process the confirmation
            if (confirmation.crossChainTxId == 0) {
                // update total assets
                latestTotalAssetsUpdateFromStrategy = confirmation
                    .totalAssetsAfter;
                emit TotalAssetsUpdated(confirmation.totalAssetsAfter);
            } else if (
                confirmation.user == address(0) &&
                confirmation.receiver == address(0)
            ) {
                strategyAddress = confirmation.withdrawZRC20;
                emit StrategyUpdated(strategyAddress);
            } else if (confirmation.isDeposit) {
                _confirmDepositAndMint(
                    confirmation.receiver,
                    confirmation.amount,
                    confirmation.totalAssetsAfter,
                    confirmation.crossChainTxId
                );
            } else {
                _confirmWithdrawAndBurn(
                    confirmation.user,
                    confirmation.receiver,
                    confirmation.withdrawZRC20,
                    confirmation.withdrawERC20,
                    confirmation.amount,
                    confirmation.fractionOfTotalShares,
                    confirmation.withdrawChainId,
                    confirmation.totalAssetsAfter,
                    confirmation.crossChainTxId,
                    confirmation.slippage
                );
            }

            // Mark this nonce as processed
            lastProcessedNonce = nextNonce;
            delete pendingConfirmations[nextNonce];
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
        _handleGasFee(gasLimitForCall + gasLimitForWithdrawAndCall); // we combine these two limits as this tx involves a divest and an invest

        bytes memory recipient = abi.encodePacked(strategyAddress);

        // Generate a unique crossChainTxId
        bytes32 crossChainTxId = keccak256(
            abi.encodePacked(
                strategyAddress,
                newStrategyAddress,
                block.timestamp, // Current timestamp
                block.number // Current block number
            )
        );
        strategyAddress = newStrategyAddress;
        bytes memory outgoingMessage = abi.encode(
            address(0),
            address(0),
            newStrategyAddress,
            address(0),
            minAmountOut,
            minSharesOut,
            0, // chain ID
            false,
            crossChainTxId,
            0 // slippage
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            true, // callOnRevert
            address(this), // abortAddress
            abi.encode(
                "_switchStrategyFailed",
                crossChainTxId,
                0,
                address(0),
                newStrategyAddress,
                address(0),
                0
            ),
            uint256(0) // onRevertGasLimit - NA on ZEVM
        );

        CallOptions memory callOptions = CallOptions(
            gasLimitForCall + gasLimitForWithdrawAndCall,
            false
        );
        IGatewayZEVM(_GATEWAY_ADDRESS).call(
            recipient,
            address(asset()),
            outgoingMessage,
            callOptions,
            revertOptions
        );
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

        // Generate a unique crossChainTxId
        bytes32 crossChainTxId = keccak256(
            abi.encodePacked(
                caller,
                receiver,
                assets,
                block.timestamp, // Current timestamp
                block.number // Current block number
            )
        );

        SafeERC20.safeTransferFrom(
            IERC20(asset()),
            caller,
            address(this),
            assets
        );

        _investAssets(
            assets,
            minimumOut,
            receiver,
            asset(),
            asset(),
            uint32(block.chainid),
            crossChainTxId
        );
    }

    /**
     * @dev Initiates cross-chain investment by interacting with the gateway and strategy.
     * @param amount The amount of assets to invest.
     * @param receiver The address of the receiver initiating the investment.
     * @param userZRC20 The ZRC20 token address representing the receiver's assets.
     * @param userChainId The chain ID of the receiver's connected chain.
     * @notice Approves and sends assets through the gateway to the strategy's chain.
     */
    function _investAssets(
        uint256 amount,
        uint256 minimumOut,
        address receiver,
        address userZRC20,
        address userERC20,
        uint32 userChainId,
        bytes32 crossChainTxId
    ) internal override {
        if (IAmanaRegistry(registry).withdrawHelper() == address(0))
            revert InvalidAddress();

        SafeERC20.safeTransfer(
            IERC20(address(asset())),
            IAmanaRegistry(registry).withdrawHelper(),
            amount
        );
        if (depositFeePaidFromGasTank) {
            IWithdrawHelper(IAmanaRegistry(registry).withdrawHelper())
                .handleGasFeeAndWithdrawAndCall(
                    strategyAddress,
                    receiver,
                    userZRC20,
                    userERC20,
                    address(asset()),
                    amount,
                    userChainId,
                    crossChainTxId,
                    gasLimitForWithdrawAndCall,
                    registry
                );
        } else {
            IWithdrawHelper(IAmanaRegistry(registry).withdrawHelper())
                .handleWithdrawAndCall(
                    strategyAddress,
                    receiver,
                    userZRC20,
                    userERC20,
                    address(asset()),
                    amount,
                    minimumOut,
                    userChainId,
                    crossChainTxId,
                    gasLimitForWithdrawAndCall,
                    registry
                );
        }

        emit CrossChainInvestSent(crossChainTxId);
    }

    /**
     * @dev Confirms a deposit and mints shares for the receiver.
     *      Updates the total assets and receiver's principal accordingly.
     * @param receiver The address of the receiver making the deposit.
     * @param depositAmount The amount of assets deposited by the receiver.
     * @param totalAssetsAfterDeposit The total assets in the vault after the deposit.
     */
    function _confirmDepositAndMint(
        address receiver,
        uint256 depositAmount,
        uint256 totalAssetsAfterDeposit,
        bytes32 _crossChainTxId
    ) internal {
        userPrincipal[receiver] += depositAmount;
        totalPrincipal += depositAmount;

        if (totalAssetsAfterDeposit >= depositAmount) {
            latestTotalAssetsUpdateFromStrategy =
                totalAssetsAfterDeposit -
                depositAmount;
        } else {
            latestTotalAssetsUpdateFromStrategy = 0;
        }

        uint256 shares = previewDeposit(depositAmount);
        _mint(receiver, shares);

        latestTotalAssetsUpdateFromStrategy = totalAssetsAfterDeposit;

        emit Deposited(receiver, depositAmount, shares, _crossChainTxId);
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
        pendingWithdrawals[user] += shares;

        if (caller != user) {
            _spendAllowance(user, caller, shares);
        }

        // Generate a unique crossChainTxId
        bytes32 crossChainTxId = keccak256(
            abi.encodePacked(
                caller,
                receiver,
                shares,
                block.timestamp, // Current timestamp
                block.number // Current block number
            )
        );

        _divestFromStrategy(
            user,
            receiver,
            withdrawZRC20,
            withdrawZRC20,
            shares,
            minimumOut,
            uint32(block.chainid),
            slippage,
            crossChainTxId
        );
    }

    /**
     * @dev Withdrawn/redeem common workflow for withdrawals initiated from a connected chain.
     * @param user The address of the user receiving the withdrawn assets.
     * @param withdrawZRC20 The ZRC20 token address representing the withdrawal asset.
     * @param shares The amount of shares being withdrawn.
     * @param userChainId The chain ID of the user's connected chain.
     * @notice Validates maximum withdrawal limits and calculates fees before initiating divestment.
     */
    function _withdrawComingFromConnectedChain(
        address user,
        address withdrawZRC20,
        address withdrawERC20,
        uint256 shares,
        uint256 minimumOut,
        uint32 userChainId,
        uint16 slippage,
        bytes32 crossChainTxId
    ) internal override {
        if (shares == 0) {
            revert AmountCantBeZero();
        }
        uint256 maxShares = maxRedeem(user);
        if (shares > maxShares - pendingWithdrawals[user]) {
            revert ERC4626ExceededMaxRedeem(user, shares, maxShares);
        }

        pendingWithdrawals[user] += shares;

        _divestFromStrategy(
            user,
            user,
            withdrawZRC20,
            withdrawERC20,
            shares,
            minimumOut,
            userChainId,
            slippage,
            crossChainTxId
        );
    }

    /**
     * @dev Initiates the process to divest assets from the strategy on a connected chain.
     * @param user The address of the user requesting the withdrawal.
     * @param withdrawZRC20 The ZRC20 token address representing the withdrawal asset.
     * @param shares The amount of assets to be withdrawn.
     * @param withdrawChainId The chain ID of the chain where the withdrawal is taking place.
     * @notice Sends a cross-chain call to the strategy to initiate divestment, ensuring gas fees are handled appropriately.
     */
    function _divestFromStrategy(
        address user,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        uint256 shares,
        uint256 minimumOut,
        uint32 withdrawChainId,
        uint16 slippage,
        bytes32 crossChainTxId
    ) internal {
        _handleGasFee(gasLimitForCall);

        bytes memory recipient = abi.encodePacked(strategyAddress);

        uint256 fractionOfTotalShares = (shares * 1e18 + totalSupply() / 2) /
            totalSupply(); // // we add totalSupply() / 2 to prevent truncation errors

        bytes memory outgoingMessage = abi.encode(
            user,
            receiver,
            withdrawZRC20,
            withdrawERC20,
            fractionOfTotalShares,
            minimumOut,
            withdrawChainId,
            false,
            crossChainTxId,
            slippage
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            true, // callOnRevert
            address(this), // abortAddress
            abi.encode(
                "_divestConnectedChainStrategyFailed",
                crossChainTxId,
                shares,
                user,
                withdrawZRC20,
                withdrawERC20,
                withdrawChainId
            ),
            uint256(0) // onRevertGasLimit - NA on ZEVM
        );

        CallOptions memory callOptions = CallOptions(gasLimitForCall, false);
        IGatewayZEVM(_GATEWAY_ADDRESS).call(
            recipient,
            address(asset()),
            outgoingMessage,
            callOptions,
            revertOptions
        );
        emit DivestSent(crossChainTxId);
    }

    /**
     * @dev Confirms the withdrawal process by burning shares, applying fees, and returning assets to the user.
     * @param user The address of the user requesting the withdrawal.
     * @param withdrawZRC20 The ZRC20 token address representing the withdrawal asset.
     * @param fractionOfTotalShares The amount of assets to be withdrawn.
     * @param userChainId The chain ID of the user's connected chain.
     * @param totalAssetsAfterWithdraw The total assets held by the vault after the withdrawal.
     * @notice Ensures that fees are correctly deducted, shares are burned, and assets are returned to the user.
     */
    function _confirmWithdrawAndBurn(
        address user,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        uint256 amountWithdrawn,
        uint256 fractionOfTotalShares,
        uint32 userChainId,
        uint256 totalAssetsAfterWithdraw,
        bytes32 _crossChainTxId,
        uint16 slippage
    ) internal {
        uint256 shares = (fractionOfTotalShares *
            totalSupply() +
            totalSupply() /
            2) / 1e18; // we add totalSupply() to prevent truncation errors
        if (shares > balanceOf(user)) {
            shares = balanceOf(user);
        }
        uint256 fractionOfUserShares = (shares * 1e18) / balanceOf(user);
        uint256 principalWithdrawn = (fractionOfUserShares *
            userPrincipal[user]) / 1e18;
        uint256 feeToWithdraw;
        if (amountWithdrawn > principalWithdrawn) {
            feeToWithdraw =
                ((amountWithdrawn - principalWithdrawn) * perfFee) /
                10000;
            emit PerformanceFeePaid(user, feeToWithdraw);
            SafeERC20.safeTransfer(
                IERC20(asset()),
                IAmanaRegistry(registry).treasury(),
                feeToWithdraw
            );
        }
        userPrincipal[user] -= principalWithdrawn;
        totalPrincipal -= principalWithdrawn;

        latestTotalAssetsUpdateFromStrategy = totalAssetsAfterWithdraw;
        _burn(user, shares);
        if (pendingWithdrawals[user] >= shares) {
            pendingWithdrawals[user] -= shares;
        } else {
            pendingWithdrawals[user] = 0; // Prevent underflow
        }
        _returnFundsToUser(
            amountWithdrawn - feeToWithdraw,
            userChainId,
            receiver,
            withdrawZRC20,
            withdrawERC20,
            _crossChainTxId,
            slippage
        );

        emit Withdrawn(user, amountWithdrawn, shares, _crossChainTxId);
    }

    /**
     * @dev Handles gas fee calculation and approval for cross-chain operations.
     *      This function retrieves the gas fee for the given gas limit, ensures the required amount is available,
     *      and approves the gateway to use the gas fee.
     * @param gasLimit The maximum amount of gas to be used for the transaction.
     * @return gasZRC20 The address of the ZRC20 token representing the gas fee.
     * @return gasFee The amount of gas fee required for the transaction.
     **/
    function _handleGasFee(
        uint256 gasLimit
    ) private returns (address gasZRC20, uint256 gasFee) {
        (gasZRC20, gasFee) = IZRC20(address(asset()))
            .withdrawGasFeeWithGasLimit(gasLimit);
        IGasTank(IAmanaRegistry(registry).gasTank()).getGas(gasZRC20, gasFee);
        approveOrIncreaseAllowance(IERC20(gasZRC20), _GATEWAY_ADDRESS, gasFee);
    }

    // This function makes a manual call to the withdrawal receiver.
    // It is used to handle cases where the cross-chain transaction fails or needs to be retried.
    // It allows the owner to specify the receiver, asset, target chain ZRC20, amount, and cross-chain transaction ID.
    // The function retrieves the gas fee for the specified target chain ZRC20 and approves it for the gateway.
    // It then constructs the outgoing message with the provided parameters and calls the gateway to send the message.
    // The function also includes revert options to handle any potential failures during the call.
    // The revert options specify the address to revert to, whether to call on revert, the abort address,
    // the revert message, and the gas limit for the revert.
    // The function emits an event indicating the manual call to the withdrawal receiver.
    // @param receiver The address of the receiver to send the funds to.
    // @param asset The address of the asset to be sent.
    // @param targetChainZRC20 The address of the target chain ZRC20 token.
    // @param amount The amount of the asset to be sent.
    // @param crossChainTxId The ID of the cross-chain transaction.
    // @notice This function is only callable by the owner of the contract.
    function manualCallWithdrawalReceiver(
        address receiver,
        address asset,
        address targetChainZRC20,
        uint256 amount,
        bytes32 crossChainTxId
    ) external onlyOwner {
        (address gasZRC20, uint256 gasFee) = IZRC20(targetChainZRC20)
            .withdrawGasFeeWithGasLimit(gasLimitForCall);

        IGasTank(IAmanaRegistry(registry).gasTank()).getGas(gasZRC20, gasFee);
        approveOrIncreaseAllowance(IERC20(gasZRC20), _GATEWAY_ADDRESS, gasFee);

        bytes memory recipient = abi.encodePacked(
            IAmanaRegistry(registry).withdrawalReceiver()
        );

        bytes memory outgoingMessage = abi.encode(
            receiver,
            asset,
            amount,
            crossChainTxId
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            true, // callOnRevert
            address(this), // abortAddress
            abi.encode("_manualCallFailed", crossChainTxId),
            uint256(0) // onRevertGasLimit - NA on ZEVM
        );

        CallOptions memory callOptions = CallOptions(gasLimitForCall, false);
        IGatewayZEVM(_GATEWAY_ADDRESS).call(
            recipient,
            address(targetChainZRC20),
            outgoingMessage,
            callOptions,
            revertOptions
        );
    }

    /**
     * @dev Handles revert scenarios during cross-chain operations.
     * @param context The revert context containing details about the revert scenario.
     * @notice Executes appropriate recovery steps based on the revert message.
     */
    function onRevert(
        RevertContext calldata context
    ) external override onlyGateway {
        (
            string memory revertMessage,
            bytes32 _crossChainTxId,
            uint256 amount,
            address receiver,
            address userZRC20,
            address userERC20,
            uint32 userChainId
        ) = abi.decode(
                context.revertMessage,
                (string, bytes32, uint256, address, address, address, uint32)
            );

        if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_crossChainInvestFailed"))
        ) {
            uint16 slippage = 1000;
            _returnFundsToUser(
                context.amount,
                userChainId,
                receiver,
                userZRC20,
                userERC20,
                _crossChainTxId,
                slippage
            );
            emit CrossChainInvestFailed(_crossChainTxId);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_divestConnectedChainStrategyFailed"))
        ) {
            pendingWithdrawals[receiver] -= amount;
            emit DivestFailed(_crossChainTxId);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_returnFundsToUserFailed"))
        ) {
            emit ReturnFundsToUserFailed(_crossChainTxId);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_switchStrategyFailed"))
        ) {
            emit SwitchStrategyFailed(_crossChainTxId);
        } else {
            revert("Revert not handled");
        }
    }
}
