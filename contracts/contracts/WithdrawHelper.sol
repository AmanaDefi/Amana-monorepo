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
import "hardhat/console.sol";

contract WithdrawHelper {
    using SafeERC20 for IERC20;
    using SafeERC20 for IZRC20;

    address public immutable GATEWAY_ADDRESS;
    uint256 public gasLimitForWithdrawAndCallToReceiver = 500000;

    constructor(address _gatewayAddress) {
        GATEWAY_ADDRESS = _gatewayAddress;
    }

    function updateGasLimitForWithdrawAndCallToReceiver(
        uint256 _gasLimitForWithdrawAndCallToReceiver
    ) external {
        gasLimitForWithdrawAndCallToReceiver = _gasLimitForWithdrawAndCallToReceiver;
    }

    function handleGasFeeAndWithdrawAndCallToReceiver(
        address targetAddress,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        address tokenToTransfer,
        uint256 amount,
        uint32 userChainId,
        bytes32 _crossChainTxId,
        address registry
    ) external {
        bytes memory outgoingMessage = abi.encode(
            receiver, // user to receive funds
            withdrawERC20, // token on target chain
            amount, // amount to be sent
            _crossChainTxId
        );

        // Request gas
        (address gas_zrc20, uint256 gasFee) = IZRC20(tokenToTransfer)
            .withdrawGasFeeWithGasLimit(gasLimitForWithdrawAndCallToReceiver);

        IGasTank(IAmanaRegistry(registry).gasTank()).getGas(gas_zrc20, gasFee);

        approveOrIncreaseAllowance(
            IERC20(tokenToTransfer),
            GATEWAY_ADDRESS,
            amount + gasFee
        );

        if (gas_zrc20 != tokenToTransfer) {
            approveOrIncreaseAllowance(
                IERC20(gas_zrc20),
                GATEWAY_ADDRESS,
                gasFee
            );
        }

        bytes memory recipient = abi.encodePacked(targetAddress);

        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: msg.sender,
            callOnRevert: true,
            abortAddress: msg.sender,
            revertMessage: abi.encode(
                "_returnFundsToUserFailed",
                _crossChainTxId,
                amount,
                receiver,
                withdrawZRC20,
                withdrawERC20,
                userChainId
            ),
            onRevertGasLimit: 0
        });

        IGatewayZEVM(GATEWAY_ADDRESS).withdrawAndCall(
            recipient,
            amount,
            tokenToTransfer,
            outgoingMessage,
            CallOptions(gasLimitForWithdrawAndCallToReceiver, false),
            revertOptions
        );
    }

    function handleGasFeeAndWithdrawToUser(
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        address tokenToTransfer,
        uint256 amount,
        uint32 userChainId,
        bytes32 _crossChainTxId,
        address registry
    ) external {
        // Request gas
        (address gas_zrc20, uint256 gasFee) = IZRC20(tokenToTransfer)
            .withdrawGasFeeWithGasLimit(IZRC20(tokenToTransfer).GAS_LIMIT());
        console.log("gasFee", gasFee);
        IGasTank(IAmanaRegistry(registry).gasTank()).getGas(gas_zrc20, gasFee);

        approveOrIncreaseAllowance(
            IERC20(tokenToTransfer),
            GATEWAY_ADDRESS,
            amount + gasFee
        );

        if (gas_zrc20 != tokenToTransfer) {
            approveOrIncreaseAllowance(
                IERC20(gas_zrc20),
                GATEWAY_ADDRESS,
                gasFee
            );
        }

        bytes memory recipient = abi.encodePacked(receiver);

        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: msg.sender,
            callOnRevert: true,
            abortAddress: msg.sender,
            revertMessage: abi.encode(
                "_returnFundsToUserFailed",
                _crossChainTxId,
                amount,
                receiver,
                withdrawZRC20,
                withdrawERC20,
                userChainId
            ),
            onRevertGasLimit: 0
        });

        IGatewayZEVM(GATEWAY_ADDRESS).withdraw(
            recipient,
            amount,
            tokenToTransfer,
            revertOptions
        );
    }

    function handleGasFeeAndWithdrawAndCallToStrategy(
        address targetAddress,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        address tokenToTransfer,
        uint256 amount,
        uint256 minimumOut,
        uint32 userChainId,
        bytes32 _crossChainTxId,
        uint32 gasLimitForWithdrawAndCall,
        address registry
    ) external {
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
            address(0),
            receiver,
            address(0),
            address(0),
            amount,
            0, // on withdrawals this is used for fractionOfTotalShares
            minimumOut,
            0, // chain ID
            true,
            _crossChainTxId,
            0 // slippage
        );

        bytes memory recipient = abi.encodePacked(targetAddress);

        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: msg.sender,
            callOnRevert: true,
            abortAddress: msg.sender,
            revertMessage: abi.encode(
                "_crossChainInvestFailed",
                _crossChainTxId,
                amount,
                receiver,
                withdrawZRC20,
                withdrawERC20,
                userChainId
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
    }

    function handleWithdrawAndCallToStrategy(
        address targetAddress,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        address tokenToTransfer,
        uint256 amount,
        uint256 minimumOut,
        uint32 userChainId,
        bytes32 _crossChainTxId,
        uint32 gasLimitForWithdrawAndCall,
        address registry
    ) external {
        (address gas_zrc20, uint256 gasFee) = IZRC20(tokenToTransfer)
            .withdrawGasFeeWithGasLimit(gasLimitForWithdrawAndCall);
        console.log("amount", amount);
        console.log("gasFee", gasFee);
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
            address(0),
            receiver,
            address(0),
            address(0),
            amount - amountToDeduct,
            0, // on withdrawals this is used for fractionOfTotalShares
            minimumOut,
            0, // chain ID
            true,
            _crossChainTxId,
            0 // slippage
        );

        bytes memory recipient = abi.encodePacked(targetAddress);

        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: msg.sender,
            callOnRevert: true,
            abortAddress: msg.sender,
            revertMessage: abi.encode(
                "_crossChainInvestFailed",
                _crossChainTxId,
                amount - amountToDeduct,
                receiver,
                withdrawZRC20,
                withdrawERC20,
                userChainId
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
    }

    function handleDivestCallToStrategy(
        address strategyAddress,
        uint256 gasLimitForCall,
        uint256 totalSupply,
        address vaultAsset,
        address registry,
        address user,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        uint256 vaultSharesToBeBurnt,
        uint256 minimumOut,
        uint32 withdrawChainId,
        uint16 slippage,
        bytes32 crossChainTxId
    ) external {
        _handleGasFee(gasLimitForCall, vaultAsset, registry);

        bytes memory recipient = abi.encodePacked(strategyAddress);

        uint256 fractionOfTotalShares = (vaultSharesToBeBurnt *
            1e18 +
            totalSupply /
            2) / totalSupply; // // we add totalSupply() / 2 to prevent truncation errors

        bytes memory outgoingMessage = abi.encode(
            user,
            receiver,
            withdrawZRC20,
            withdrawERC20,
            vaultSharesToBeBurnt,
            fractionOfTotalShares,
            minimumOut,
            withdrawChainId,
            false,
            crossChainTxId,
            slippage
        );

        RevertOptions memory revertOptions = RevertOptions(
            msg.sender, // revert address
            true, // callOnRevert
            msg.sender, // abortAddress
            abi.encode(
                "_divestConnectedChainStrategyFailed",
                crossChainTxId,
                vaultSharesToBeBurnt,
                user,
                withdrawZRC20,
                withdrawERC20,
                withdrawChainId
            ),
            uint256(0) // onRevertGasLimit - NA on ZEVM
        );

        CallOptions memory callOptions = CallOptions(gasLimitForCall, false);
        IGatewayZEVM(GATEWAY_ADDRESS).call(
            recipient,
            address(vaultAsset),
            outgoingMessage,
            callOptions,
            revertOptions
        );
    }

    function handleSwitchCallToStrategy(
        address strategyAddress,
        address newStrategyAddress,
        uint256 gasLimitForCall,
        uint256 gasLimitForWithdrawAndCall,
        address vaultAsset,
        address registry,
        uint256 minAmountOut,
        uint256 minSharesOut
    ) external {
        _handleGasFee(
            gasLimitForCall + gasLimitForWithdrawAndCall,
            vaultAsset,
            registry
        ); // we combine these two limits as this tx involves a divest and an invest

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
            minAmountOut,
            minSharesOut,
            0, // chain ID
            false,
            crossChainTxId,
            0 // slippage
        );

        RevertOptions memory revertOptions = RevertOptions(
            msg.sender, // revert address
            true, // callOnRevert
            msg.sender, // abortAddress
            abi.encode(
                "_switchStrategyFailed",
                crossChainTxId,
                0,
                strategyAddress,
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
        uint256 currentAllowance = token.allowance(address(this), spender);
        if (currentAllowance < amount) {
            token.approve(spender, 0);
            token.approve(spender, amount);
        }
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
