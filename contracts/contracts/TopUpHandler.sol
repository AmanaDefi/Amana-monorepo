// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";

import "./interfaces/IErrors.sol";
import "./interfaces/IZRC20.sol";

contract TopUpHandler is
    Initializable,
    Ownable2StepUpgradeable,
    UUPSUpgradeable,
    UniversalContract,
    IErrors
{
    using SafeERC20 for IERC20;

    address constant GATEWAY = 0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E;

    uint256 public zetaThreshold;
    uint256 public zetaTopUpAmount;

    event TopUpHandled(
        address indexed user,
        address indexed smartAccount,
        address indexed token,
        uint256 amount
    );
    event ZetaFunded(address indexed smartAccount, uint256 amount);

    modifier onlyGateway() {
        if (msg.sender != GATEWAY) revert OnlyGateway();
        _;
    }

    receive() external payable {}

    function initialize(
        uint256 zetaThreshold_,
        uint256 zetaTopUpAmount_
    ) external initializer {
        __Ownable_init(msg.sender); // ← this is required
        __Ownable2Step_init();
        __UUPSUpgradeable_init();
        zetaThreshold = zetaThreshold_;
        zetaTopUpAmount = zetaTopUpAmount_;
    }

    function setThresholds(
        uint256 threshold,
        uint256 topUpAmount
    ) external onlyOwner {
        zetaThreshold = threshold;
        zetaTopUpAmount = topUpAmount;
    }

    function withdrawZeta(
        address recipient,
        uint256 amount
    ) external onlyOwner {
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "ZETA withdrawal failed");
    }

    function handleLocalTopUp(
        address smartAccount,
        address token,
        uint256 amount
    ) external payable {
        if (token != address(0)) {
            // ZRC20 transfer
            IERC20(token).safeTransferFrom(msg.sender, smartAccount, amount);
            _maybeFundZeta(smartAccount); // Only fund if user sends ZRC20
        } else {
            // Native ZETA transfer
            (bool sent, ) = payable(smartAccount).call{value: msg.value}("");
            require(sent, "Native token send failed");
            // Skip _maybeFundZeta because user is already funding ZETA
        }

        emit TopUpHandled(msg.sender, smartAccount, token, amount);
    }

    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external override onlyGateway {
        address smartAccount = abi.decode(message, (address));

        if (zrc20 == address(0)) {
            // Native ZETA received
            (bool sent, ) = payable(smartAccount).call{value: amount}("");
            require(sent, "ZETA send failed");
        } else {
            // ZRC20 token received
            IERC20(zrc20).safeTransfer(smartAccount, amount);
        }

        _maybeFundZeta(smartAccount);

        emit TopUpHandled(context.sender, smartAccount, zrc20, amount);
    }

    function _maybeFundZeta(address smartAccount) internal {
        if (
            smartAccount.balance < zetaThreshold &&
            address(this).balance >= zetaTopUpAmount
        ) {
            (bool success, ) = payable(smartAccount).call{
                value: zetaTopUpAmount
            }("");
            require(success, "ZETA top-up failed");
            emit ZetaFunded(smartAccount, zetaTopUpAmount);
        }
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
