// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IGatewayEVM, RevertOptions} from "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";
import {IErrors} from "../interfaces/IErrors.sol";

library StrategyHelper {
    using SafeERC20 for IERC20;

    // =========================
    // === ERC20 Utilities ====
    // =========================

    function safeTransfer(address token, address to, uint256 amount) internal {
        IERC20(token).safeTransfer(to, amount);
    }

    function safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) internal {
        IERC20(token).safeTransferFrom(from, to, amount);
    }

    function getBalance(
        address token,
        address account
    ) internal view returns (uint256) {
        return IERC20(token).balanceOf(account);
    }

    function getAllowance(
        address token,
        address owner,
        address spender
    ) internal view returns (uint256) {
        return IERC20(token).allowance(owner, spender);
    }

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

    // =========================
    // === Message Utilities ===
    // =========================

    bytes32 public constant TX_DEPOSIT_CONFIRMED =
        keccak256("DepositConfirmed");
    bytes32 public constant TX_WITHDRAW_CONFIRMED =
        keccak256("WithdrawConfirmed");
    bytes32 public constant TX_SWITCH_CONFIRMED = keccak256("SwitchConfirmed");
    bytes32 public constant TX_DEPOSIT_REVERTED = keccak256("DepositReverted");
    bytes32 public constant TX_WITHDRAW_REVERTED =
        keccak256("WithdrawReverted");
    bytes32 public constant TX_SWITCH_REVERTED = keccak256("SwitchReverted");
    bytes32 public constant TX_TOTAL_ASSETS_UPDATE =
        keccak256("TotalAssetsUpdated");

    function encodeConfirmationMessage(
        uint256 value1,
        uint256 value2,
        uint256 nonce,
        bytes32 status
    ) internal pure returns (bytes memory) {
        return abi.encode(value1, value2, nonce, status);
    }

    function buildRevertOptions(
        address revertTarget,
        bool callOnRevert,
        string memory tag,
        uint256 val1,
        uint256 val2,
        uint256 val3,
        uint256 gasLimit
    ) internal pure returns (RevertOptions memory) {
        return
            RevertOptions({
                revertAddress: revertTarget,
                callOnRevert: callOnRevert,
                abortAddress: revertTarget,
                revertMessage: abi.encode(tag, val1, val2, val3),
                onRevertGasLimit: gasLimit
            });
    }

    function sendConfirmation(
        IGatewayEVM gateway,
        address destination,
        bytes memory message,
        RevertOptions memory revertOptions
    ) internal {
        gateway.call(destination, message, revertOptions);
    }

    function sendInvestConfirmation(
        IGatewayEVM gateway,
        address vault,
        uint256 beforeAssets,
        uint256 afterAssets,
        uint256 nonce
    ) internal {
        bytes memory message = encodeConfirmationMessage(
            beforeAssets,
            afterAssets,
            nonce,
            TX_DEPOSIT_CONFIRMED
        );
        RevertOptions memory revertOptions = buildRevertOptions(
            address(this),
            false,
            "_investConfirmFailed",
            0,
            afterAssets,
            nonce,
            1_000_000
        );
        sendConfirmation(gateway, vault, message, revertOptions);
    }

    function sendFundsAndDivestConfirmation(
        IGatewayEVM gateway,
        address vault,
        uint256 amountWithdrawn,
        uint256 afterAssets,
        uint256 nonce
    ) internal {
        bytes memory message = encodeConfirmationMessage(
            amountWithdrawn,
            afterAssets,
            nonce,
            TX_WITHDRAW_CONFIRMED
        );
        RevertOptions memory revertOptions = buildRevertOptions(
            address(this),
            true,
            "_returnFundsFromStrategyFailed",
            amountWithdrawn,
            afterAssets,
            nonce,
            1_500_000
        );
        sendConfirmation(gateway, vault, message, revertOptions);
    }

    function sendUpdateToVault(
        IGatewayEVM gateway,
        address vault,
        IERC20 inputToken,
        uint256 nonce,
        bytes32 txStatus
    ) internal {
        uint256 balance = inputToken.balanceOf(address(this));
        bytes memory message = encodeConfirmationMessage(
            0,
            balance,
            nonce,
            txStatus
        );
        RevertOptions memory revertOptions = buildRevertOptions(
            address(this),
            false,
            "_handleRevertOnSendTotalUnderlyingAssets",
            0,
            balance,
            nonce,
            1_000_000
        );
        sendConfirmation(gateway, vault, message, revertOptions);
    }
}
