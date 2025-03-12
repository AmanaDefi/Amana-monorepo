// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import "./interfaces/IGasTank.sol";
import "./interfaces/IZRC20.sol";

contract WithdrawHelper {
    address public immutable GATEWAY_ADDRESS;

    constructor(address _gatewayAddress) {
        GATEWAY_ADDRESS = _gatewayAddress;
    }

    function handleWithdrawAndCall(
        address gasTank,
        address targetAddress,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        address tokenToTransfer,
        uint256 amount,
        uint32 userChainId,
        bytes32 _crossChainTxId,
        string memory revertMessage,
        bytes memory outgoingMessage,
        uint32 gasLimitForWithdrawAndCall
    ) external {
        bytes memory recipient = abi.encodePacked(targetAddress);

        RevertOptions memory revertOptions = RevertOptions(
            msg.sender, // Vault address (since it's called via delegatecall)
            true,
            msg.sender,
            abi.encode(
                revertMessage,
                _crossChainTxId,
                amount,
                receiver,
                withdrawZRC20,
                withdrawERC20,
                userChainId
            ),
            0
        );

        (address gas_zrc20, uint256 gasFee) = IZRC20(tokenToTransfer)
            .withdrawGasFeeWithGasLimit(gasLimitForWithdrawAndCall);

        IGasTank(gasTank).getGas(gas_zrc20, gasFee);

        approveOrIncreaseAllowance(
            IERC20(tokenToTransfer),
            GATEWAY_ADDRESS,
            amount + gasFee
        );
        if (gas_zrc20 != tokenToTransfer)
            approveOrIncreaseAllowance(
                IERC20(gas_zrc20),
                GATEWAY_ADDRESS,
                gasFee
            );

        IGatewayZEVM(GATEWAY_ADDRESS).withdrawAndCall(
            recipient,
            amount,
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
        if (currentAllowance == 0) {
            token.approve(spender, amount);
        } else {
            token.approve(spender, 0);
            token.approve(spender, amount);
        }
    }
}
