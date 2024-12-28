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
    uint256 lastProcessedNonce;

    struct Confirmation {
        address user;
        address receiver;
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

    event CrossChainInvestSent(uint256 indexed crossChainTxId);
    event CrossChainInvestFailed(uint256 indexed crossChainTxId);
    event DivestSent(uint256 indexed crossChainTxId);
    event DivestFailed(uint256 indexed crossChainTxId);
    event TotalAssetsUpdated(uint256 totalAssets);
    event SwitchStrategyFailed(uint256 indexed crossChainTxId);

    event Deposited(
        address indexed user,
        uint256 amount,
        uint256 shares,
        uint256 indexed crossChainTxId
    );
    event Withdrawn(
        address indexed user,
        address indexed receiver,
        uint256 amount,
        uint256 shares,
        uint256 crossChainTxId
    );

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
                address user,
                address receiver,
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
                user,
                receiver,
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
                _depositComingFromConnectedChain(
                    context.sender,
                    context.chainID,
                    amount,
                    zrc20
                );
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
     * @param user The address of the user associated with the confirmation.
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
        address user,
        address receiver,
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
        if (
            pendingConfirmations[executionNonce].totalAssetsBefore != 0 &&
            pendingConfirmations[executionNonce].totalAssetsAfter != 0
        ) revert ConfirmationAlreadyProcessed();
        // Store the confirmation in the buffer
        pendingConfirmations[executionNonce] = Confirmation({
            user: user,
            receiver: receiver,
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

    function manuallyAddConfirmation(
        address user,
        address receiver,
        address withdrawZRC20,
        uint256 withdrawAmount,
        uint256 fee,
        uint32 withdrawChainId,
        bool isDeposit,
        uint256 totalAssetsBefore,
        uint256 totalAssetsAfter,
        uint256 executionNonce,
        uint256 _crossChainTxId
    ) external onlyOwner {
        // Ensure no duplicate processing
        if (
            pendingConfirmations[executionNonce].totalAssetsBefore != 0 &&
            pendingConfirmations[executionNonce].totalAssetsAfter != 0
        ) revert ConfirmationAlreadyProcessed();
        // Store the confirmation in the buffer
        pendingConfirmations[executionNonce] = Confirmation({
            user: user,
            receiver: receiver,
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
            if (
                confirmation.totalAssetsBefore == 0 &&
                confirmation.totalAssetsAfter == 0
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
                VaultStorage storage $ = _getVaultStorage();
                emit StrategyUpdated($.strategyAddress, $.strategyChainId);
            } else if (confirmation.isDeposit) {
                _confirmDepositAndMint(
                    confirmation.receiver,
                    confirmation.amount,
                    confirmation.totalAssetsBefore,
                    confirmation.totalAssetsAfter,
                    confirmation.crossChainTxId
                );
            } else {
                _confirmWithdrawAndBurn(
                    confirmation.user,
                    confirmation.receiver,
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
     * @dev Switches the strategy of the vault. Can only be called by the owner.
     *      Divests from the current strategy and invests in the new one.
     * @param newStrategyAddress The address of the new strategy.
     * @notice Reverts if the new strategy address is invalid or unchanged.
     * @notice Emits a `StrategyUpdated` event upon success.
     */
    function switchStrategy(
        address newStrategyAddress
    ) external override onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (newStrategyAddress == address(0)) revert InvalidStrategyAddress();
        if (newStrategyAddress == $.strategyAddress)
            revert InvalidStrategyAddress();

        address oldStrategyAddress = $.strategyAddress;
        $.strategyAddress = newStrategyAddress;

        uint256 currentCrossChainTxId = crossChainTxId;
        crossChainTxId++;

        _handleGasFee(GAS_LIMIT_FOR_CALL);

        bytes memory recipient = abi.encodePacked(oldStrategyAddress);

        bytes memory outgoingMessage = abi.encode(
            address(0),
            newStrategyAddress,
            0,
            0,
            0,
            false,
            currentCrossChainTxId
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            true, // callOnRevert
            address(this), // abortAddress
            abi.encode(
                "_switchStrategyFailed",
                currentCrossChainTxId,
                address(0),
                newStrategyAddress,
                0
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

        _investAssets(assets, receiver, asset(), VAULT_CHAIN_ID);
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
        address receiver,
        address userZRC20,
        uint32 userChainId
    ) internal override {
        uint256 currentCrossChainTxId = crossChainTxId;
        crossChainTxId++;

        VaultStorage storage $ = _getVaultStorage();

        (address gas_zrc20, uint256 gasFee) = IZRC20(address(asset()))
            .withdrawGasFeeWithGasLimit(GAS_LIMIT_FOR_WITHDRAW_AND_CALL); // ZRC-20 of the gas token of the chain the strategy is on, and the gas fee for the withdrawal

        gasTank.getGas(gas_zrc20, gasFee);

        if (gas_zrc20 != address(asset())) {
            IZRC20(asset()).approve(_GATEWAY_ADDRESS, amount);
            IZRC20(gas_zrc20).approve(_GATEWAY_ADDRESS, gasFee);
        } else {
            IZRC20(asset()).approve(_GATEWAY_ADDRESS, amount + gasFee);
        }

        bytes memory recipient = abi.encodePacked($.strategyAddress);

        bytes memory outgoingMessage = abi.encode(
            address(0),
            receiver,
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
                receiver,
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
     * @dev Confirms a deposit and mints shares for the receiver.
     *      Updates the total assets and receiver's principal accordingly.
     * @param receiver The address of the receiver making the deposit.
     * @param depositAmount The amount of assets deposited by the receiver.
     * @param totalAssetsBeforeDeposit The total assets in the vault before the deposit.
     * @param totalAssetsAfterDeposit The total assets in the vault after the deposit.
     */
    function _confirmDepositAndMint(
        address receiver,
        uint256 depositAmount,
        uint256 totalAssetsBeforeDeposit,
        uint256 totalAssetsAfterDeposit,
        uint256 _crossChainTxId
    ) internal {
        VaultStorage storage $ = _getVaultStorage();

        $.userPrincipal[receiver] += depositAmount;
        $.totalPrincipal += depositAmount;

        latestTotalAssetsUpdateFromStrategy = totalAssetsBeforeDeposit;

        uint256 shares = previewDeposit(depositAmount);
        _mint(receiver, shares);

        latestTotalAssetsUpdateFromStrategy = totalAssetsAfterDeposit;

        emit Deposited(receiver, depositAmount, shares, _crossChainTxId);
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
        address caller, //caller
        address receiver, // receiver
        address user, // owner
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

        _divestFromStrategy(
            user,
            receiver,
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
    ) internal override {
        if (assets == 0) {
            revert WithdrawCantBeZero();
        }
        uint256 maxAssets = maxWithdraw(user);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxWithdraw(user, assets, maxAssets);
        }
        uint256 feeToWithdraw = _applyFee(user, assets);

        _divestFromStrategy(
            user,
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
    function _divestFromStrategy(
        address user,
        address receiver,
        address withdrawZRC20,
        uint256 amount,
        uint256 feeToWithdraw,
        uint32 withdrawChainId
    ) internal {
        VaultStorage storage $ = _getVaultStorage();
        uint256 currentCrossChainTxId = crossChainTxId;
        crossChainTxId++;

        _handleGasFee(GAS_LIMIT_FOR_CALL);

        bytes memory recipient = abi.encodePacked($.strategyAddress);

        bytes memory outgoingMessage = abi.encode(
            user,
            receiver,
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
     * @param user The address of the user requesting the withdrawal.
     * @param withdrawZRC20 The ZRC20 token address representing the withdrawal asset.
     * @param amount The amount of assets to be withdrawn.
     * @param fee The performance fee to be applied to the withdrawal.
     * @param userChainId The chain ID of the user's connected chain.
     * @param totalAssetsBeforeWithdraw The total assets held by the vault before the withdrawal.
     * @param totalAssetsAfterWithdraw The total assets held by the vault after the withdrawal.
     * @notice Ensures that fees are correctly deducted, shares are burned, and assets are returned to the user.
     */
    function _confirmWithdrawAndBurn(
        address user,
        address receiver,
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
        uint256 principalWithdrawn = (amount * $.userPrincipal[user]) /
            convertToAssets(balanceOf(user));

        $.userPrincipal[user] -= principalWithdrawn;
        $.totalPrincipal -= principalWithdrawn;

        latestTotalAssetsUpdateFromStrategy = totalAssetsAfterWithdraw;
        _burn(user, shares);

        uint256 outputAmount = _returnFundsToUser(
            amount,
            userChainId,
            receiver,
            withdrawZRC20,
            _crossChainTxId
        );

        if (fee > 0) {
            emit PerformanceFeePaid(user, fee);
            SafeERC20.safeTransfer(IERC20(address(asset())), $.treasury, fee);
        }

        emit Withdrawn(user, receiver, outputAmount, shares, _crossChainTxId);
    }

    function _handleRevertEvent(
        string memory revertMessage,
        uint256 _crossChainTxId,
        address user,
        address userZRC20,
        uint32 userChainId,
        uint256 amount
    ) internal {
        bytes32 messageHash = keccak256(bytes(revertMessage));

        if (messageHash == keccak256(bytes("_crossChainInvestFailed"))) {
            _returnFundsToUser(
                amount,
                userChainId,
                user,
                userZRC20,
                _crossChainTxId
            );
            emit CrossChainInvestFailed(_crossChainTxId);
        } else if (
            messageHash ==
            keccak256(bytes("_divestConnectedChainStrategyFailed"))
        ) {
            emit DivestFailed(_crossChainTxId);
        } else if (
            messageHash == keccak256(bytes("_returnFundsToUserFailed"))
        ) {
            emit ReturnFundsToUserFailed(_crossChainTxId);
        } else if (messageHash == keccak256(bytes("_switchStrategyFailed"))) {
            emit SwitchStrategyFailed(_crossChainTxId);
        } else {
            revert("Revert not handled");
        }
    }

    function _handleGasFee(
        uint256 gasLimit
    ) private returns (address gasZRC20, uint256 gasFee) {
        (gasZRC20, gasFee) = IZRC20(address(asset()))
            .withdrawGasFeeWithGasLimit(gasLimit);
        gasTank.getGas{gas: 200000}(gasZRC20, gasFee);
        IZRC20(gasZRC20).approve(_GATEWAY_ADDRESS, gasFee);
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
            address user,
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
                user,
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
