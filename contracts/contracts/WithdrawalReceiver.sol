// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";
import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";

import "./interfaces/IErrors.sol";

contract WithdrawalReceiver is Revertable {
    using SafeERC20 for IERC20;

    address public constant _GATEWAY_ADDRESS =
        0x48B9AACC350b20147001f88821d31731Ba4C30ed;

    event FundsReturned(
        address user,
        address asset,
        uint256 amount,
        bytes32 indexed crossChainTxId
    );

    event CrossChainDepositFailed(bytes32 indexed crossChainTxId);
    event CrossChainWithdrawFailed(bytes32 indexed crossChainTxId);

    modifier onlyGateway() {
        if (msg.sender != _GATEWAY_ADDRESS) {
            revert("Only Gateway can call this function");
        }
        _;
    }

    /**
     * @notice Handles calls from the ZetaChain gateway to return funds to users.
     * @param message Encoded details of the funds to be returned.
     */
    function onCall(
        MessageContext calldata,
        bytes calldata message
    ) external payable onlyGateway returns (bytes memory) {
        (
            address receiver,
            address asset,
            uint256 amount,
            bytes32 crossChainTxId
        ) = abi.decode(message, (address, address, uint256, bytes32));

        // Ensure valid inputs
        require(receiver != address(0), "Invalid receiver address");
        require(amount > 0, "Amount must be greater than zero");

        _returnFundsToUser(amount, receiver, asset, crossChainTxId);

        return abi.encode(true);
    }

    /**
     * @dev Internal function to return funds to a user.
     * @param amount The amount of funds to return.
     * @param receiver The address of the receiver.
     * @param asset The address of the asset to return.
     * @param crossChainTxId The cross-chain transaction ID.
     */
    function _returnFundsToUser(
        uint256 amount,
        address receiver,
        address asset,
        bytes32 crossChainTxId
    ) internal {
        // Logic to return funds to the user
        if (asset == address(0)) {
            // Native asset
            require(
                address(this).balance >= amount,
                "Insufficient native balance"
            );
            (bool success, ) = receiver.call{value: amount}("");
            if (!success) {
                revert IErrors.TransferFailed();
            }
        } else {
            // ERC20 token
            SafeERC20.safeTransfer(IERC20(asset), receiver, amount);
        }

        emit FundsReturned(receiver, asset, amount, crossChainTxId);
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
            address receiver
        ) = abi.decode(context.revertMessage, (string, bytes32, address));

        if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_crossChainDepositFailed"))
        ) {
            _returnFundsToUser(
                context.amount,
                context.asset,
                receiver,
                _crossChainTxId
            );
            emit CrossChainDepositFailed(_crossChainTxId);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_crossChainWithdrawFailed"))
        ) {
            emit CrossChainWithdrawFailed(_crossChainTxId);
        } else {
            revert("Revert not handled");
        }
    }

    /**
     * @notice Allows the contract to receive native assets.
     */
    receive() external payable {}

    /**
     * @notice Fallback function for receiving native assets.
     */
    fallback() external payable {}
}
