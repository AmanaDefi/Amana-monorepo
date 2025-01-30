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
        address withdrawERC20;
        uint256 amount;
        uint256 fee;
        uint32 withdrawChainId;
        bool isDeposit;
        uint256 totalAssetsAfter;
        bytes32 crossChainTxId;
        uint16 slippage;
    }

    mapping(uint256 => Confirmation) pendingConfirmations; // Buffer for out-of-order confirmations
    mapping(address => uint256) pendingWithdrawals;

    event CrossChainInvestSent(bytes32 indexed crossChainTxId);
    event CrossChainInvestFailed(bytes32 indexed crossChainTxId);
    event DivestSent(bytes32 indexed crossChainTxId);
    event DivestFailed(bytes32 indexed crossChainTxId);
    event TotalAssetsUpdated(uint256 totalAssets);
    event SwitchStrategyFailed(bytes32 indexed crossChainTxId);

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
                uint256 fee,
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
                fee,
                withdrawChainId,
                isDeposit,
                totalAssetsAfter,
                executionNonce,
                _crossChainTxId,
                slippage
            );
        } else {
            if (context.sender == address(0)) revert CantBeZeroAddress();
            if (amount > 0) {
                (
                    address erc20source,
                    uint16 slippage,
                    bytes32 crossChainTxId
                ) = abi.decode(message, (address, uint16, bytes32));
                _depositComingFromConnectedChain(
                    context.sender,
                    context.chainID,
                    amount,
                    zrc20,
                    erc20source,
                    slippage,
                    crossChainTxId
                );
            } else {
                (
                    address withdrawZRC20,
                    address withdrawERC20,
                    uint256 withdrawAmount,
                    uint16 slippage,
                    bytes32 crossChainTxId
                ) = abi.decode(
                        message,
                        (address, address, uint256, uint16, bytes32)
                    );
                _withdrawComingFromConnectedChain(
                    context.sender,
                    withdrawZRC20,
                    withdrawERC20,
                    withdrawAmount,
                    uint32(context.chainID),
                    slippage,
                    crossChainTxId
                );
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
     * @param fee The fee associated with the transaction.
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
        uint256 fee,
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
            fee: fee,
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
     * @param fee The fee associated with the transaction.
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
        uint256 fee,
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
            fee: fee,
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
                    confirmation.fee,
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
        address newStrategyAddress
    ) external override onlyOwner {
        if (newStrategyAddress == address(0)) revert InvalidStrategyAddress();
        if (newStrategyAddress == strategyAddress)
            revert InvalidStrategyAddress();

        if (totalAssets() == 1) {
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

        bytes memory outgoingMessage = abi.encode(
            address(0),
            address(0),
            newStrategyAddress,
            address(0),
            0,
            0,
            0,
            false,
            crossChainTxId,
            0
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            true, // callOnRevert
            address(this), // abortAddress
            abi.encode(
                "_switchStrategyFailed",
                crossChainTxId,
                address(0),
                newStrategyAddress,
                address(0),
                0
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
    }

    /**
     * @dev Returns the total assets currently held by the vault, including assets directly held
     *      and the latest update from the strategy's total assets.
     *      1 unit of virtual assets is added to prevent donation attacks and division by zero.
     * @return The total amount of assets held by the vault.
     * @notice Overrides the {IERC4626-totalAssets} function.
     */
    function totalAssets() public view virtual override returns (uint256) {
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
        address receiver,
        address userZRC20,
        address userERC20,
        uint32 userChainId,
        bytes32 crossChainTxId
    ) internal override {
        (address gas_zrc20, uint256 gasFee) = IZRC20(address(asset()))
            .withdrawGasFeeWithGasLimit(gasLimitForWithdrawAndCall); // ZRC-20 of the gas token of the chain the strategy is on, and the gas fee for the withdrawal

        gasTank.getGas(gas_zrc20, gasFee);

        if (gas_zrc20 != address(asset())) {
            IZRC20(asset()).approve(_GATEWAY_ADDRESS, amount);
            IZRC20(gas_zrc20).approve(_GATEWAY_ADDRESS, gasFee);
        } else {
            IZRC20(asset()).approve(_GATEWAY_ADDRESS, amount + gasFee);
        }

        bytes memory recipient = abi.encodePacked(strategyAddress);

        bytes memory outgoingMessage = abi.encode(
            address(0),
            receiver,
            address(0),
            address(0),
            amount,
            0,
            0,
            true,
            crossChainTxId,
            0
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            true, // callOnRevert
            address(this), // abortAddress
            abi.encode(
                "_crossChainInvestFailed",
                crossChainTxId,
                receiver,
                userZRC20,
                userERC20,
                userChainId
            ),
            uint256(0) // onRevertGasLimit
        );

        CallOptions memory callOptions = CallOptions(
            gasLimitForWithdrawAndCall,
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
        uint256 maxAssets = maxWithdraw(user) - pendingWithdrawals[user];
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxWithdraw(user, assets, maxAssets);
        }
        pendingWithdrawals[user] += assets;

        if (caller != user) {
            _spendAllowance(user, caller, shares);
        }
        uint256 feeToWithdraw = _applyFee(user, assets);

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

        _divestFromStrategy(
            user,
            receiver,
            asset(),
            asset(),
            assets,
            feeToWithdraw,
            uint32(block.chainid),
            0,
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
        uint32 userChainId,
        uint16 slippage,
        bytes32 crossChainTxId
    ) internal override {
        if (shares == 0) {
            revert WithdrawCantBeZero();
        }
        uint256 maxShares = maxRedeem(user);
        if (shares > maxShares) {
            revert ERC4626ExceededMaxRedeem(user, shares, maxShares);
        }

        uint256 assets = previewRedeem(shares);
        pendingWithdrawals[user] += assets;

        uint256 feeToWithdraw = _applyFee(user, assets);

        _divestFromStrategy(
            user,
            user,
            withdrawZRC20,
            withdrawERC20,
            assets,
            feeToWithdraw,
            userChainId,
            slippage,
            crossChainTxId
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
        address withdrawERC20,
        uint256 amount,
        uint256 feeToWithdraw,
        uint32 withdrawChainId,
        uint16 slippage,
        bytes32 crossChainTxId
    ) internal {
        _handleGasFee(gasLimitForCall);

        bytes memory recipient = abi.encodePacked(strategyAddress);

        bytes memory outgoingMessage = abi.encode(
            user,
            receiver,
            withdrawZRC20,
            withdrawERC20,
            amount,
            feeToWithdraw,
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
     * @param amount The amount of assets to be withdrawn.
     * @param fee The performance fee to be applied to the withdrawal.
     * @param userChainId The chain ID of the user's connected chain.
     * @param totalAssetsAfterWithdraw The total assets held by the vault after the withdrawal.
     * @notice Ensures that fees are correctly deducted, shares are burned, and assets are returned to the user.
     */
    function _confirmWithdrawAndBurn(
        address user,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        uint256 amount,
        uint256 fee,
        uint32 userChainId,
        uint256 totalAssetsAfterWithdraw,
        bytes32 _crossChainTxId,
        uint16 slippage
    ) internal {
        latestTotalAssetsUpdateFromStrategy =
            totalAssetsAfterWithdraw +
            amount +
            fee;
        uint256 shares = previewWithdraw(amount);
        uint256 principalWithdrawn = (amount * userPrincipal[user]) /
            convertToAssets(balanceOf(user));

        userPrincipal[user] -= principalWithdrawn;
        totalPrincipal -= principalWithdrawn;

        latestTotalAssetsUpdateFromStrategy = totalAssetsAfterWithdraw;
        _burn(user, shares);
        pendingWithdrawals[user] -= amount;

        uint256 outputAmount = _returnFundsToUser(
            amount,
            userChainId,
            receiver,
            withdrawZRC20,
            withdrawERC20,
            _crossChainTxId,
            slippage
        );

        if (fee > 0) {
            emit PerformanceFeePaid(user, fee);
            SafeERC20.safeTransfer(IERC20(address(asset())), treasury, fee);
        }

        emit Withdrawn(user, receiver, outputAmount, shares, _crossChainTxId);
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
            bytes32 _crossChainTxId,
            address receiver,
            address userZRC20,
            address userERC20,
            uint32 userChainId
        ) = abi.decode(
                context.revertMessage,
                (string, bytes32, address, address, address, uint32)
            );

        if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_crossChainInvestFailed"))
        ) {
            uint16 slippage = 200;
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
