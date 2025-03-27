// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

// import {MessageContext} from "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";

struct NewMessageContext {
    bytes origin;
    bytes sender;
    address senderEVM;
    uint256 chainID;
}

contract OnCallHelper {
    /**
     * @dev Tries to return the EVM sender from the MessageContext.
     * Reverts if `senderEVM` field is not part of the struct (older version).
     */
    function getSenderEVM(
        NewMessageContext calldata ctx
    ) external pure returns (address) {
        return ctx.senderEVM;
    }
}
