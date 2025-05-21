// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IGasTank.sol";
import "./interfaces/IZRC20.sol";
import "./interfaces/IAmanaRegistry.sol";
import "./interfaces/IErrors.sol";
import "./interfaces/ISwapHelper.sol";
import "./interfaces/IAmanaVault.sol";

contract WithdrawHelper is Revertable {
    using SafeERC20 for IERC20;
    using SafeERC20 for IZRC20;

    address public immutable GATEWAY_ADDRESS;
    // uint256 public gasLimitForWithdrawAndCallToReceiver = 500000;

    enum TxType {
        Deposit,
        Withdraw,
        Switch
    }

    modifier onlyGateway() {
        if (msg.sender != GATEWAY_ADDRESS) revert IErrors.OnlyGateway();
        _;
    }

    event ReturnFundsToUserSent(
        uint256 indexed vaultNonce,
        address vault,
        bytes32 recipient,
        uint256 amount
    );
    event ReturnFundsToUserFailed(
        uint256 indexed vaultNonce,
        address vault,
        address receiver,
        uint256 amount
    );
    event CrossChainInvestSent(
        uint256 indexed vaultNonce,
        address vault,
        address receiver,
        uint256 amount
    );
    event CrossChainInvestFailed(
        uint256 indexed vaultNonce,
        address vault,
        address receiver,
        uint256 amount
    );
    event DivestSent(
        uint256 indexed vaultNonce,
        address vault,
        address user,
        uint256 shares
    );
    event DivestFailed(
        uint256 indexed vaultNonce,
        address vault,
        address user,
        uint256 shares
    );
    event SwitchStrategyFailed(uint256 indexed vaultNonce, address vault);

    constructor(address _gatewayAddress) {
        GATEWAY_ADDRESS = _gatewayAddress;
    }

    // function updateGasLimitForWithdrawAndCallToReceiver(
    //     uint256 _gasLimitForWithdrawAndCallToReceiver
    // ) external {
    //     gasLimitForWithdrawAndCallToReceiver = _gasLimitForWithdrawAndCallToReceiver;
    // }

    // function handleGasFeeAndWithdrawAndCallToReceiver(
    //     address targetAddress,
    //     address receiver,
    //     address withdrawZRC20,
    //     address withdrawERC20,
    //     address tokenToTransfer,
    //     uint256 amount,
    //     uint32 userChainId,
    //     address registry
    // ) external {
    //     bytes memory outgoingMessage = abi.encode(
    //         receiver, // user to receive funds
    //         withdrawERC20, // token on target chain
    //         amount // amount to be sent
    //     );

    //     // Request gas
    //     (address gas_zrc20, uint256 gasFee) = IZRC20(tokenToTransfer)
    //         .withdrawGasFeeWithGasLimit(gasLimitForWithdrawAndCallToReceiver);

    //     IGasTank(IAmanaRegistry(registry).gasTank()).getGas(gas_zrc20, gasFee);

    //     approveOrIncreaseAllowance(
    //         IERC20(tokenToTransfer),
    //         GATEWAY_ADDRESS,
    //         amount + gasFee
    //     );

    //     if (gas_zrc20 != tokenToTransfer) {
    //         approveOrIncreaseAllowance(
    //             IERC20(gas_zrc20),
    //             GATEWAY_ADDRESS,
    //             gasFee
    //         );
    //     }

    //     bytes memory recipient = abi.encodePacked(targetAddress);

    //     RevertOptions memory revertOptions = RevertOptions({
    //         revertAddress: address(this),
    //         callOnRevert: true,
    //         abortAddress: address(this),
    //         revertMessage: abi.encode(
    //             "_returnFundsToUserFailed",
    //             amount,
    //             receiver,
    //             withdrawZRC20,
    //             withdrawERC20,
    //             tokenToTransfer,
    //             userChainId,
    //             registry,
    //             msg.sender
    //         ),
    //         onRevertGasLimit: 0
    //     });

    //     IGatewayZEVM(GATEWAY_ADDRESS).withdrawAndCall(
    //         recipient,
    //         amount,
    //         tokenToTransfer,
    //         outgoingMessage,
    //         CallOptions(gasLimitForWithdrawAndCallToReceiver, false),
    //         revertOptions
    //     );
    //     emit ReturnFundsToUserSent(vaultNonce, receiver, amount);
    // }

    function handleGasFeeAndWithdrawToUser(
        bytes memory recipient,
        address withdrawZRC20,
        uint256 amount,
        address registry,
        uint256 vaultNonce
    ) public {
        // TODO does this need an access modifier? do any of the others need to have public?
        // Request gas
        (address gas_zrc20, uint256 gasFee) = IZRC20(withdrawZRC20)
            .withdrawGasFeeWithGasLimit(IZRC20(withdrawZRC20).GAS_LIMIT());
        IGasTank(IAmanaRegistry(registry).gasTank()).getGas(gas_zrc20, gasFee);

        approveOrIncreaseAllowance(
            IERC20(withdrawZRC20),
            GATEWAY_ADDRESS,
            amount + gasFee
        );

        if (gas_zrc20 != withdrawZRC20) {
            approveOrIncreaseAllowance(
                IERC20(gas_zrc20),
                GATEWAY_ADDRESS,
                gasFee
            );
        }

        // bytes memory recipient = abi.encodePacked(receiver);

        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(this),
            callOnRevert: true,
            abortAddress: address(this),
            revertMessage: abi.encode(
                "_returnFundsToUserFailed",
                amount,
                recipient,
                withdrawZRC20,
                registry,
                msg.sender,
                vaultNonce
            ),
            onRevertGasLimit: 0
        });

        IGatewayZEVM(GATEWAY_ADDRESS).withdraw(
            recipient,
            amount,
            withdrawZRC20,
            revertOptions
        );
        emit ReturnFundsToUserSent(
            vaultNonce,
            msg.sender,
            bytes32(recipient),
            amount
        );
    }

    function handleGasFeeAndWithdrawAndCallToStrategy(
        address targetAddress,
        address receiver,
        bytes memory nonEvmAddress,
        address withdrawZRC20,
        address tokenToTransfer,
        uint256 amount,
        uint256 minimumOut,
        uint32 gasLimitForWithdrawAndCall,
        address registry,
        uint256 vaultNonce
    ) external {
        uint256 previewedShares = IAmanaVault(msg.sender).previewDeposit(
            amount
        );
        require(previewedShares <= uint256(type(int256).max), "Overflow");

        IAmanaVault(msg.sender).adjustPendingShareChange(
            previewedShares,
            vaultNonce
        ); //+= int256(previewedShares)

        // Request gas
        (address gas_zrc20, uint256 gasFee) = IZRC20(tokenToTransfer)
            .withdrawGasFeeWithGasLimit(gasLimitForWithdrawAndCall);
        IGasTank(IAmanaRegistry(registry).gasTank()).getGas(gas_zrc20, gasFee);
        if (gas_zrc20 != tokenToTransfer) {
            approveOrIncreaseAllowance(
                IERC20(gas_zrc20),
                GATEWAY_ADDRESS,
                gasFee
            );
            approveOrIncreaseAllowance(
                IERC20(tokenToTransfer),
                GATEWAY_ADDRESS,
                amount
            );
        } else {
            approveOrIncreaseAllowance(
                IERC20(tokenToTransfer),
                GATEWAY_ADDRESS,
                amount + gasFee
            );
        }

        bytes memory outgoingMessage = abi.encode(
            uint8(TxType.Deposit),
            amount,
            minimumOut,
            address(0), // placeholder for newStrategy (not needed for deposits)
            vaultNonce
        );

        bytes memory recipient = abi.encodePacked(targetAddress);

        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(this),
            callOnRevert: true,
            abortAddress: address(this),
            revertMessage: abi.encode(
                "_crossChainInvestFailed",
                amount,
                receiver,
                withdrawZRC20,
                registry,
                msg.sender,
                vaultNonce,
                nonEvmAddress
            ),
            onRevertGasLimit: 0
        });
        IGatewayZEVM(GATEWAY_ADDRESS).withdrawAndCall(
            recipient,
            amount,
            tokenToTransfer,
            outgoingMessage,
            CallOptions(gasLimitForWithdrawAndCall, false),
            revertOptions
        );
        emit CrossChainInvestSent(vaultNonce, msg.sender, receiver, amount);
    }

    function handleWithdrawAndCallToStrategy(
        address targetAddress,
        address receiver,
        bytes memory nonEvmAddress,
        address withdrawZRC20,
        address tokenToTransfer,
        uint256 amount,
        uint256 minimumOut,
        uint32 gasLimitForWithdrawAndCall,
        address registry,
        uint256 vaultNonce
    ) external {
        (address gas_zrc20, uint256 gasFee) = IZRC20(tokenToTransfer)
            .withdrawGasFeeWithGasLimit(gasLimitForWithdrawAndCall);
        uint256 amountToDeduct = gasFee;

        if (gas_zrc20 != tokenToTransfer) {
            if (IAmanaRegistry(registry).swapHelper() == address(0))
                revert IErrors.InvalidAddress();

            SafeERC20.safeTransfer(
                IERC20(tokenToTransfer),
                IAmanaRegistry(registry).swapHelper(),
                amount
            );

            try
                ISwapHelper(IAmanaRegistry(registry).swapHelper()).swapExactOut(
                    amount,
                    tokenToTransfer,
                    gasFee,
                    gas_zrc20,
                    250, // first attempt slippage
                    address(this),
                    200, // deadline
                    "" // future-proofing param
                )
            returns (uint256 result) {
                amountToDeduct = result;
            } catch {
                try
                    ISwapHelper(IAmanaRegistry(registry).swapHelper())
                        .swapExactOut(
                            amount,
                            tokenToTransfer,
                            gasFee,
                            gas_zrc20,
                            750, // fallback slippage
                            address(this),
                            200, // deadline
                            ""
                        )
                returns (uint256 result) {
                    amountToDeduct = result;
                } catch {
                    revert("Swap failed at both slippage levels");
                }
            }
        }
        if (amountToDeduct > amount) {
            revert("AmountTooLowToPayForGas");
        }

        uint256 previewedShares = IAmanaVault(msg.sender).previewDeposit(
            amount
        );
        require(previewedShares <= uint256(type(int256).max), "Overflow");

        IAmanaVault(msg.sender).adjustPendingShareChange(
            previewedShares,
            vaultNonce
        ); //+= int256(previewedShares)

        if (gas_zrc20 == tokenToTransfer) {
            approveOrIncreaseAllowance(
                IERC20(tokenToTransfer),
                GATEWAY_ADDRESS,
                amount
            );
        } else {
            approveOrIncreaseAllowance(
                IERC20(tokenToTransfer),
                GATEWAY_ADDRESS,
                amount - amountToDeduct
            );
            approveOrIncreaseAllowance(
                IERC20(gas_zrc20),
                GATEWAY_ADDRESS,
                gasFee
            );
        }

        bytes memory outgoingMessage = abi.encode(
            uint8(TxType.Deposit),
            amount - amountToDeduct,
            minimumOut,
            address(0), // placeholder for newStrategy (not needed for deposits)
            vaultNonce
        );
        bytes memory recipient = abi.encodePacked(targetAddress);

        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(this),
            callOnRevert: true,
            abortAddress: address(this),
            revertMessage: abi.encode(
                "_crossChainInvestFailed",
                amount - amountToDeduct,
                receiver,
                withdrawZRC20,
                registry,
                msg.sender,
                vaultNonce,
                nonEvmAddress
            ),
            onRevertGasLimit: 0
        });

        IGatewayZEVM(GATEWAY_ADDRESS).withdrawAndCall(
            recipient,
            amount - amountToDeduct,
            tokenToTransfer,
            outgoingMessage,
            CallOptions(gasLimitForWithdrawAndCall, false),
            revertOptions
        );
        emit CrossChainInvestSent(vaultNonce, msg.sender, receiver, amount);
    }

    function handleDivestCallToStrategy(
        address strategyAddress,
        uint256 gasLimitForCall,
        uint256 adjustedTotalSupply,
        address vaultAsset,
        address registry,
        address user,
        address withdrawZRC20,
        uint256 vaultSharesToBeBurnt,
        uint256 minimumOut,
        uint256 vaultNonce
    ) external {
        _handleGasFee(gasLimitForCall, vaultAsset, registry);

        bytes memory recipient = abi.encodePacked(strategyAddress);
        uint256 numerator = vaultSharesToBeBurnt *
            1e18 +
            adjustedTotalSupply /
            2;
        uint256 fractionOfTotalShares = numerator / adjustedTotalSupply;

        bytes memory outgoingMessage = abi.encode(
            uint8(TxType.Withdraw),
            fractionOfTotalShares,
            minimumOut,
            address(0),
            vaultNonce
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            true, // callOnRevert
            address(this), // abortAddress
            abi.encode(
                "_divestConnectedChainStrategyFailed",
                vaultSharesToBeBurnt,
                user,
                withdrawZRC20,
                registry,
                msg.sender,
                vaultNonce
            ),
            uint256(0)
        );

        CallOptions memory callOptions = CallOptions(gasLimitForCall, false);
        IGatewayZEVM(GATEWAY_ADDRESS).call(
            recipient,
            address(vaultAsset),
            outgoingMessage,
            callOptions,
            revertOptions
        );
        emit DivestSent(vaultNonce, msg.sender, user, vaultSharesToBeBurnt);
    }

    function handleSwitchCallToStrategy(
        address strategyAddress,
        address newStrategyAddress,
        uint256 gasLimitForCall,
        uint256 gasLimitForWithdrawAndCall,
        address vaultAsset,
        address registry,
        uint256 minAmountOut,
        uint256 minSharesOut,
        uint256 vaultNonce
    ) external {
        _handleGasFee(
            gasLimitForCall + gasLimitForWithdrawAndCall,
            vaultAsset,
            registry
        ); // we combine these two limits as this tx involves a divest and an invest

        bytes memory recipient = abi.encodePacked(strategyAddress);

        // bool isSwitch = true;

        bytes memory outgoingMessage = abi.encode(
            uint8(TxType.Switch),
            minAmountOut,
            minSharesOut,
            newStrategyAddress,
            vaultNonce
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            true, // callOnRevert
            address(this), // abortAddress
            abi.encode(
                "_switchStrategyFailed",
                0,
                newStrategyAddress,
                address(0),
                registry,
                msg.sender,
                vaultNonce
            ),
            uint256(0) // onRevertGasLimit - NA on ZEVM
        );

        CallOptions memory callOptions = CallOptions(
            gasLimitForCall + gasLimitForWithdrawAndCall,
            false
        );
        IGatewayZEVM(GATEWAY_ADDRESS).call(
            recipient,
            address(vaultAsset),
            outgoingMessage,
            callOptions,
            revertOptions
        );
    }

    /**
     * @dev Approves or increases the allowance of a token for a spender.
     * @param token The token to approve.
     * @param spender The address to approve.
     * @param amount The amount to approve.
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

    /**
     * @dev Handles gas fee calculation and approval for cross-chain operations.
     *      This function retrieves the gas fee for the given gas limit, ensures the required amount is available,
     *      and approves the gateway to use the gas fee.
     * @param gasLimit The maximum amount of gas to be used for the transaction.
     * @return gasZRC20 The address of the ZRC20 token representing the gas fee.
     * @return gasFee The amount of gas fee required for the transaction.
     **/
    function _handleGasFee(
        uint256 gasLimit,
        address vaultAsset,
        address registry
    ) private returns (address gasZRC20, uint256 gasFee) {
        (gasZRC20, gasFee) = IZRC20(vaultAsset).withdrawGasFeeWithGasLimit(
            gasLimit
        );
        IGasTank(IAmanaRegistry(registry).gasTank()).getGas(gasZRC20, gasFee);
        approveOrIncreaseAllowance(IERC20(gasZRC20), GATEWAY_ADDRESS, gasFee);
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
            uint256 amount,
            address receiverOrOldStrategy,
            address withdrawZRC20,
            address registry,
            address vault,
            uint256 vaultNonce,
            bytes memory nonEvmAddress
        ) = abi.decode(
                context.revertMessage,
                (
                    string,
                    uint256,
                    address,
                    address,
                    address,
                    address,
                    uint256,
                    bytes
                )
            );
        if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_crossChainInvestFailed"))
        ) {
            bytes memory recipient;
            if (nonEvmAddress.length > 0) {
                recipient = abi.encode(nonEvmAddress);
            } else {
                recipient = abi.encodePacked(receiverOrOldStrategy);
            }
            handleGasFeeAndWithdrawToUser(
                recipient,
                withdrawZRC20,
                context.amount,
                registry,
                vaultNonce
            );
            emit CrossChainInvestFailed(
                vaultNonce,
                vault,
                receiverOrOldStrategy,
                context.amount
            );
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_divestConnectedChainStrategyFailed"))
        ) {
            IAmanaVault(vault).decreasePendingWithdrawals(
                receiverOrOldStrategy,
                amount
            );
            emit DivestFailed(vaultNonce, vault, receiverOrOldStrategy, amount);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_returnFundsToUserFailed"))
        ) {
            emit ReturnFundsToUserFailed(
                vaultNonce,
                vault,
                receiverOrOldStrategy,
                context.amount
            );
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_switchStrategyFailed"))
        ) {
            IAmanaVault(vault).setStrategy(receiverOrOldStrategy);
            emit SwitchStrategyFailed(vaultNonce, vault);
        } else {
            revert("Revert not handled");
        }
    }

    function onAbort(AbortContext calldata context) external onlyGateway {
        (
            string memory revertMessage,
            uint256 amount,
            address receiverOrOldStrategy,
            address withdrawZRC20,
            address registry,
            address vault,
            uint256 vaultNonce,
            bytes memory nonEvmAddress
        ) = abi.decode(
                context.revertMessage,
                (
                    string,
                    uint256,
                    address,
                    address,
                    address,
                    address,
                    uint256,
                    bytes
                )
            );

        if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_crossChainInvestFailed"))
        ) {
            bytes memory recipient;
            if (nonEvmAddress.length > 0) {
                recipient = abi.encode(nonEvmAddress);
            } else {
                recipient = abi.encodePacked(receiverOrOldStrategy);
            }
            handleGasFeeAndWithdrawToUser(
                recipient,
                withdrawZRC20,
                context.amount,
                registry,
                vaultNonce
            );
            emit CrossChainInvestFailed(
                vaultNonce,
                vault,
                receiverOrOldStrategy,
                amount
            );
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_divestConnectedChainStrategyFailed"))
        ) {
            IAmanaVault(vault).decreasePendingWithdrawals(
                receiverOrOldStrategy,
                amount
            );
            // pendingWithdrawals[receiverOrOldStrategy] -= amount;
            emit DivestFailed(vaultNonce, vault, receiverOrOldStrategy, amount);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_returnFundsToUserFailed"))
        ) {
            emit ReturnFundsToUserFailed(
                vaultNonce,
                vault,
                receiverOrOldStrategy,
                context.amount
            );
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_switchStrategyFailed"))
        ) {
            IAmanaVault(vault).setStrategy(receiverOrOldStrategy);
            emit SwitchStrategyFailed(vaultNonce, vault);
        } else {
            revert("Revert not handled");
        }
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
    // function manualCallWithdrawalReceiver(
    //     address receiver,
    //     address asset,
    //     address targetChainZRC20,
    //     uint256 amount,
    //     bytes32 crossChainTxId
    // ) external onlyOwner {
    //     (address gasZRC20, uint256 gasFee) = IZRC20(targetChainZRC20)
    //         .withdrawGasFeeWithGasLimit(gasLimitForCall);

    //     IGasTank(IAmanaRegistry(registry).gasTank()).getGas(gasZRC20, gasFee);
    //     approveOrIncreaseAllowance(IERC20(gasZRC20), _GATEWAY_ADDRESS, gasFee);

    //     bytes memory recipient = abi.encodePacked(
    //         IAmanaRegistry(registry).withdrawalReceiver()
    //     );

    //     bytes memory outgoingMessage = abi.encode(
    //         receiver,
    //         asset,
    //         amount,
    //         crossChainTxId
    //     );

    //     RevertOptions memory revertOptions = RevertOptions(
    //         address(this), // revert address
    //         true, // callOnRevert
    //         address(this), // abortAddress
    //         abi.encode("_manualCallFailed", crossChainTxId),
    //         uint256(0) // onRevertGasLimit - NA on ZEVM
    //     );

    //     CallOptions memory callOptions = CallOptions(gasLimitForCall, false);
    //     IGatewayZEVM(_GATEWAY_ADDRESS).call(
    //         recipient,
    //         address(targetChainZRC20),
    //         outgoingMessage,
    //         callOptions,
    //         revertOptions
    //     );
    // }
}
