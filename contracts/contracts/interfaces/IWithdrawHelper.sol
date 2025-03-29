// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IWithdrawHelper {
    function handleWithdrawAndCall(
        address targetAddress,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        address tokenToTransfer,
        uint256 amount,
        uint32 userChainId,
        bytes32 crossChainTxId,
        string memory revertMessage,
        bytes memory outgoingMessage,
        uint32 gasLimitForWithdrawAndCall,
        bytes calldata data
    ) external;
}
