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

        // Handle native or ERC20 funds
        if (asset == address(0)) {
            // Native asset (e.g., ETH, MATIC, BNB)
            require(
                address(this).balance >= amount,
                "Insufficient native balance"
            );
            payable(receiver).transfer(amount);
        } else {
            // ERC20 token
            require(
                IERC20(asset).balanceOf(address(this)) >= amount,
                "Insufficient token balance"
            );
            IERC20(asset).safeTransfer(receiver, amount);
        }

        emit FundsReturned(receiver, asset, amount, crossChainTxId);
        return abi.encode(true);
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
