// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IGasTank.sol";
import "./interfaces/IZRC20.sol";
import "./interfaces/IAmanaRegistry.sol";
import "./interfaces/IErrors.sol";
import "./interfaces/ISwapHelper.sol";

contract WithdrawHelper is Ownable {
    using SafeERC20 for IERC20;
    using SafeERC20 for IZRC20;

    address public immutable GATEWAY_ADDRESS;
    address public immutable GAS_TANK;
    address public registry;

    constructor(address _gatewayAddress, address _gasTank) Ownable(msg.sender) {
        GATEWAY_ADDRESS = _gatewayAddress;
        GAS_TANK = _gasTank;
    }

    function setRegistry(address _registry) external onlyOwner {
        require(_registry != address(0), "Invalid address");
        registry = _registry;
    }

    function handleGasFeeAndWithdrawAndCall(
        address targetAddress,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        address tokenToTransfer,
        uint256 amount,
        uint32 userChainId,
        bytes32 _crossChainTxId,
        uint32 gasLimitForWithdrawAndCall
    ) external {
        bytes memory outgoingMessage = abi.encode(
            receiver, // user to receive funds
            withdrawERC20, // token on target chain
            amount, // amount to be sent
            _crossChainTxId
        );

        // Request gas
        (address gas_zrc20, uint256 gasFee) = IZRC20(tokenToTransfer)
            .withdrawGasFeeWithGasLimit(gasLimitForWithdrawAndCall);

        IGasTank(GAS_TANK).getGas(gas_zrc20, gasFee);

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
            CallOptions(gasLimitForWithdrawAndCall, false),
            revertOptions
        );
    }

    function handleWithdrawAndCall(
        address targetAddress,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        address tokenToTransfer,
        uint256 amount,
        uint256 minimumOut,
        uint32 userChainId,
        bytes32 _crossChainTxId,
        uint32 gasLimitForWithdrawAndCall
    ) external {
        bytes memory outgoingMessage = abi.encode(
            address(0),
            receiver,
            address(0),
            address(0),
            amount,
            minimumOut,
            0, // chain ID
            true,
            _crossChainTxId,
            0 // slippage
        );

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

            amountToDeduct = ISwapHelper(IAmanaRegistry(registry).swapHelper())
                .swapExactOut(
                    amount,
                    tokenToTransfer,
                    gasFee,
                    gas_zrc20,
                    500, // TODO remove the hardcoding of no slippage here!
                    address(this),
                    200, //deadline
                    "" // empty bytes param for future-proofing
                );
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
}
