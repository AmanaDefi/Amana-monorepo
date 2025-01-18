// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";

contract WithdrawalReceiver {
    using SafeERC20 for IERC20;

    address public constant _GATEWAY_ADDRESS =
        0x48B9AACC350b20147001f88821d31731Ba4C30ed;

    event FundsReturned(
        address user,
        address asset,
        uint256 amount,
        bytes32 indexed crossChainTxId
    );

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
        MessageContext calldata context,
        bytes calldata message
    ) external payable onlyGateway returns (bytes memory) {
        (
            address user,
            address asset,
            uint256 amount,
            bytes32 crossChainTxId
        ) = abi.decode(message, (address, address, uint256, bytes32));

        // Ensure valid inputs
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than zero");

        // Handle native or ERC20 funds
        if (asset == address(0)) {
            // Native asset (e.g., ETH, MATIC, BNB)
            require(
                address(this).balance >= amount,
                "Insufficient native balance"
            );
            payable(user).transfer(amount);
            _sendFundsReturnedConfirmation(
                context.sender,
                user,
                shares,
                crossChainTxId
            );
        } else {
            // ERC20 token
            require(
                IERC20(asset).balanceOf(address(this)) >= amount,
                "Insufficient token balance"
            );
            IERC20(asset).safeTransfer(user, amount);
            _sendFundsReturnedConfirmation(
                context.sender,
                user,
                shares,
                crossChainTxId
            );
        }

        emit FundsReturned(user, asset, amount, crossChainTxId);
        return abi.encode(true);
    }

    function _sendFundsReturnedConfirmation(
        address vault,
        address owner,
        uint256 shares,
        bytes32 _crossChainTxId
    ) internal {
        bytes memory outgoingMessage = abi.encode(
            owner,
            shares,
            _crossChainTxId
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this),
            false,
            address(this),
            abi.encode("_investConfirmFailed", _crossChainTxId),
            uint256(1000000)
        );

        IGatewayEVM(_GATEWAY_ADDRESS).call(
            vault,
            outgoingMessage,
            revertOptions
        );
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
