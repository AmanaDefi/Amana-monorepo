// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import "./interfaces/IGasTank.sol";
import "./interfaces/IZRC20.sol";
import "hardhat/console.sol";

contract WithdrawHelper {
    address public immutable GATEWAY_ADDRESS;
    address public immutable GAS_TANK;

    constructor(address _gatewayAddress, address _gasTank) {
        GATEWAY_ADDRESS = _gatewayAddress;
        GAS_TANK = _gasTank;
    }

    function handleWithdrawAndCall(
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
        uint32 gasLimitForWithdrawAndCall,
        bytes calldata data
    ) external {
        // Request gas
        (address gas_zrc20, uint256 gasFee) = IZRC20(tokenToTransfer)
            .withdrawGasFeeWithGasLimit(gasLimitForWithdrawAndCall);

        console.log("Requesting gas fee from GasTank");
        IGasTank(GAS_TANK).getGas(gas_zrc20, gasFee);

        console.log("Approving token and gas to Gateway");
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
                revertMessage,
                _crossChainTxId,
                amount,
                receiver,
                withdrawZRC20,
                withdrawERC20,
                userChainId
            ),
            onRevertGasLimit: 0
        });

        console.log("Calling withdrawAndCall");
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
        if (currentAllowance < amount) {
            token.approve(spender, 0);
            token.approve(spender, amount);
        }
    }
}
