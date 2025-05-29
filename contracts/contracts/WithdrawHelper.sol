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
import "hardhat/console.sol";

contract WithdrawHelper is Revertable {
    using SafeERC20 for IERC20;
    using SafeERC20 for IZRC20;

    address public immutable GATEWAY_ADDRESS;
    uint256 public gasLimitForRevertCall = 200000;

    enum TxType {
        Deposit,
        Withdraw,
        Switch,
        Revert
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
        bytes recipient,
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

    function setGasLimitForRevertCall(uint256 _gasLimitForRevertCall) external {
        // TODO - add access control
        gasLimitForRevertCall = _gasLimitForRevertCall;
    }

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
                address(0),
                amount,
                address(0),
                withdrawZRC20,
                address(0),
                registry,
                msg.sender,
                vaultNonce,
                recipient
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
        address strategyAddress,
        address receiver,
        bytes memory nonEvmAddress,
        address withdrawZRC20,
        address vaultAsset,
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
        (address gas_zrc20, uint256 gasFee) = IZRC20(vaultAsset)
            .withdrawGasFeeWithGasLimit(gasLimitForWithdrawAndCall);
        IGasTank(IAmanaRegistry(registry).gasTank()).getGas(gas_zrc20, gasFee);
        if (gas_zrc20 != vaultAsset) {
            approveOrIncreaseAllowance(
                IERC20(gas_zrc20),
                GATEWAY_ADDRESS,
                gasFee
            );
            approveOrIncreaseAllowance(
                IERC20(vaultAsset),
                GATEWAY_ADDRESS,
                amount
            );
        } else {
            approveOrIncreaseAllowance(
                IERC20(vaultAsset),
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

        bytes memory recipient = abi.encodePacked(strategyAddress);

        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(this),
            callOnRevert: true,
            abortAddress: address(this),
            revertMessage: abi.encode(
                "_crossChainInvestFailed",
                strategyAddress,
                amount,
                receiver,
                withdrawZRC20,
                vaultAsset,
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
            vaultAsset,
            outgoingMessage,
            CallOptions(gasLimitForWithdrawAndCall, false),
            revertOptions
        );
        emit CrossChainInvestSent(vaultNonce, msg.sender, receiver, amount);
    }

    function handleWithdrawAndCallToStrategy(
        address strategyAddress,
        address receiver,
        bytes memory nonEvmAddress,
        address withdrawZRC20,
        address vaultAsset,
        uint256 amount,
        uint256 minimumOut,
        uint32 gasLimitForWithdrawAndCall,
        address registry,
        uint256 vaultNonce
    ) external {
        (address gas_zrc20, uint256 gasFee) = IZRC20(vaultAsset)
            .withdrawGasFeeWithGasLimit(gasLimitForWithdrawAndCall);
        uint256 amountToDeduct = gasFee;

        if (gas_zrc20 != vaultAsset) {
            if (IAmanaRegistry(registry).swapHelper() == address(0))
                revert IErrors.InvalidAddress();

            SafeERC20.safeTransfer(
                IERC20(vaultAsset),
                IAmanaRegistry(registry).swapHelper(),
                amount
            );

            try
                ISwapHelper(IAmanaRegistry(registry).swapHelper()).swapExactOut(
                    amount,
                    vaultAsset,
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
                            vaultAsset,
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

        if (gas_zrc20 == vaultAsset) {
            approveOrIncreaseAllowance(
                IERC20(vaultAsset),
                GATEWAY_ADDRESS,
                amount
            );
        } else {
            approveOrIncreaseAllowance(
                IERC20(vaultAsset),
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
        bytes memory recipient = abi.encodePacked(strategyAddress);

        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(this),
            callOnRevert: true,
            abortAddress: address(this),
            revertMessage: abi.encode(
                "_crossChainInvestFailed",
                strategyAddress,
                amount - amountToDeduct,
                receiver,
                withdrawZRC20,
                vaultAsset,
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
            vaultAsset,
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
                strategyAddress,
                vaultSharesToBeBurnt,
                user,
                withdrawZRC20,
                vaultAsset,
                registry,
                msg.sender,
                vaultNonce,
                bytes("0x")
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
                strategyAddress,
                0,
                address(0),
                address(0),
                vaultAsset,
                registry,
                msg.sender,
                vaultNonce,
                bytes("0x")
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

    function _sendRevertToStrategy(
        address strategy,
        address vaultAsset,
        uint256 vaultNonce,
        address registry
    ) private {
        _handleGasFee(gasLimitForRevertCall, vaultAsset, registry); // we combine these two limits as this tx involves a divest and an invest

        bytes memory outgoingMessage = abi.encode(
            TxType.Revert,
            0,
            0, // no amount or shares to revert
            address(0),
            vaultNonce
        );
        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: msg.sender,
            callOnRevert: true,
            abortAddress: address(this),
            revertMessage: abi.encode(
                "_sendRevertToStrategyFailed",
                address(0),
                0,
                address(0),
                vaultAsset,
                address(0),
                address(0),
                msg.sender,
                vaultNonce,
                bytes("0x")
            ),
            onRevertGasLimit: 0
        });
        IGatewayZEVM(GATEWAY_ADDRESS).call(
            abi.encodePacked(strategy), // recipient
            vaultAsset,
            outgoingMessage, // revert message
            CallOptions(gasLimitForRevertCall, false), // TODO - check what this should be!
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
            address strategyAddress,
            uint256 amount,
            address receiver,
            address withdrawZRC20,
            address vaultAsset,
            address registry,
            address vault,
            uint256 vaultNonce,
            bytes memory nonEvmAddress
        ) = abi.decode(
                context.revertMessage,
                (
                    string,
                    address,
                    uint256,
                    address,
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
                recipient = abi.encodePacked(receiver);
            }
            handleGasFeeAndWithdrawToUser(
                recipient,
                withdrawZRC20,
                context.amount,
                registry,
                vaultNonce
            );
            _sendRevertToStrategy(
                strategyAddress,
                vaultAsset,
                vaultNonce,
                registry
            );
            emit CrossChainInvestFailed(
                vaultNonce,
                vault,
                receiver,
                context.amount
            );
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_divestConnectedChainStrategyFailed"))
        ) {
            IAmanaVault(vault).decreasePendingWithdrawals(receiver, amount);
            _sendRevertToStrategy(
                strategyAddress,
                vaultAsset,
                vaultNonce,
                registry
            );
            emit DivestFailed(vaultNonce, vault, receiver, amount);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_returnFundsToUserFailed"))
        ) {
            emit ReturnFundsToUserFailed(
                vaultNonce,
                vault,
                nonEvmAddress,
                context.amount
            );
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_switchStrategyFailed"))
        ) {
            IAmanaVault(vault).setStrategy(strategyAddress);
            _sendRevertToStrategy(
                strategyAddress,
                vaultAsset,
                vaultNonce,
                registry
            );
            emit SwitchStrategyFailed(vaultNonce, vault);
        } else {
            revert("Revert not handled");
        }
    }

    function onAbort(AbortContext calldata context) external onlyGateway {
        (
            string memory revertMessage,
            address strategyAddress,
            uint256 amount,
            address receiver,
            address withdrawZRC20,
            address vaultAsset,
            address registry,
            address vault,
            uint256 vaultNonce,
            bytes memory nonEvmAddress
        ) = abi.decode(
                context.revertMessage,
                (
                    string,
                    address,
                    uint256,
                    address,
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
                recipient = abi.encodePacked(receiver);
            }
            handleGasFeeAndWithdrawToUser(
                recipient,
                withdrawZRC20,
                context.amount,
                registry,
                vaultNonce
            );
            _sendRevertToStrategy(
                strategyAddress,
                vaultAsset,
                vaultNonce,
                registry
            );
            emit CrossChainInvestFailed(vaultNonce, vault, receiver, amount);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_divestConnectedChainStrategyFailed"))
        ) {
            IAmanaVault(vault).decreasePendingWithdrawals(receiver, amount);
            _sendRevertToStrategy(
                strategyAddress,
                vaultAsset,
                vaultNonce,
                registry
            );
            emit DivestFailed(vaultNonce, vault, receiver, amount);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_returnFundsToUserFailed"))
        ) {
            emit ReturnFundsToUserFailed(
                vaultNonce,
                vault,
                nonEvmAddress,
                context.amount
            );
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_switchStrategyFailed"))
        ) {
            IAmanaVault(vault).setStrategy(strategyAddress);
            _sendRevertToStrategy(
                strategyAddress,
                vaultAsset,
                vaultNonce,
                registry
            );
            emit SwitchStrategyFailed(vaultNonce, vault);
        } else {
            revert("Revert not handled");
        }
    }
}
