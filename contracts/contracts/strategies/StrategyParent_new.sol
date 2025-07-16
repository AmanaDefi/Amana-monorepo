// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./StrategyHelper.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IErrors} from "../interfaces/IErrors.sol";
import {IDistributor} from "../interfaces/IDistributor.sol";

abstract contract StrategyParent is
    Initializable,
    Ownable2StepUpgradeable,
    UUPSUpgradeable,
    IErrors
{
    using SafeERC20 for IERC20;

    string public name;
    address public amanaVault;
    address public withdrawHelper;
    address public oldStrategy;
    address public rewardsDistributor;
    address public gateway;
    address public swapHelper;
    IERC20 public inputToken;
    address internal receiptTokenAddress;
    uint256 public lastProcessedNonce;
    uint16 public harvestSwapSlippage;
    uint256 public minClaimableReward;

    enum TxType {
        Deposit,
        Withdraw,
        Switch,
        Revert
    }

    struct BufferedTx {
        TxType txType;
        uint256 assetAmount;
        uint256 minimumOut;
        address newStrategy;
    }

    mapping(uint256 => BufferedTx) public pendingByNonce;

    event FundsDivested(
        uint256 indexed vaultNonce,
        uint256 amount,
        uint256 totalAssetsAfter
    );
    event InvestConfirmFailed(
        uint256 indexed vaultNonce,
        uint256 totalAssetsAfter
    );
    event ReturnFundsFromStrategyFailed(
        uint256 indexed vaultNonce,
        uint256 withdrawnAmount,
        uint256 totalAssetsAfter
    );
    event SendTotalUnderlyingAssetsFailed(
        uint256 indexed vaultNonce,
        uint256 totalAssetsAfter
    );
    event TotalUnderlyingAssetsSent(
        uint256 indexed vaultNonce,
        uint256 totalUnderlyingAssets
    );

    modifier onlyGateway() {
        require(msg.sender == gateway, "Only gateway");
        _;
    }

    function __StrategyParent_init(
        string memory _name,
        address _amanaVault,
        address _gateway,
        address _withdrawHelper,
        address _inputTokenAddress,
        address _receiptTokenAddress
    ) internal onlyInitializing {
        __Ownable_init(msg.sender);
        name = _name;
        amanaVault = _amanaVault;
        gateway = _gateway;
        withdrawHelper = _withdrawHelper;
        inputToken = IERC20(_inputTokenAddress);
        receiptTokenAddress = _receiptTokenAddress;
        minClaimableReward = 5;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function onCall(
        MessageContext calldata context,
        bytes calldata message
    ) external payable onlyGateway returns (bytes memory result) {
        require(
            context.sender == amanaVault || context.sender == withdrawHelper,
            "OnlyVault"
        );
        (
            TxType txType,
            uint256 assetAmount,
            uint256 minimumOut,
            address newStrategy,
            uint256 vaultNonce
        ) = abi.decode(message, (TxType, uint256, uint256, address, uint256));

        if (txType == TxType.Deposit && msg.value == 0) {
            inputToken.safeTransferFrom(msg.sender, address(this), assetAmount);
        }

        pendingByNonce[vaultNonce] = BufferedTx({
            txType: txType,
            assetAmount: assetAmount,
            minimumOut: minimumOut,
            newStrategy: newStrategy
        });

        if (vaultNonce == lastProcessedNonce + 1) {
            _processBufferedTransactions();
        }

        return abi.encode(true);
    }

    function _processBufferedTransactions() internal {
        while (true) {
            uint256 nextNonce = lastProcessedNonce + 1;
            BufferedTx storage txData = pendingByNonce[nextNonce];

            if (
                txData.txType == TxType(0) &&
                txData.assetAmount == 0 &&
                txData.minimumOut == 0 &&
                txData.newStrategy == address(0)
            ) break;

            if (txData.txType == TxType.Deposit) {
                _invest();
            } else if (txData.txType == TxType.Withdraw) {
                _divest();
            } else if (txData.txType == TxType.Switch) {
                _transferAssetsToNewStrategy();
            } else if (txData.txType == TxType.Revert) {
                sendUpdateToVault(
                    nextNonce,
                    StrategyHelper.TX_DEPOSIT_REVERTED
                );
            } else {
                revert("Unknown TxType");
            }

            delete pendingByNonce[nextNonce];
            lastProcessedNonce = nextNonce;
        }
    }

    function _divest() internal virtual {
        BufferedTx storage txData = pendingByNonce[lastProcessedNonce + 1];
        uint256 amountWithdrawn = _withdrawFundsFromYieldSource(
            txData.assetAmount,
            txData.minimumOut
        );
        uint256 totalAssetsAfter = totalUnderlyingAssets();

        sendFundsAndDivestConfirmation(
            amountWithdrawn,
            totalAssetsAfter,
            lastProcessedNonce + 1
        );

        emit FundsDivested(
            lastProcessedNonce + 1,
            amountWithdrawn,
            totalAssetsAfter
        );
    }

    function sendInvestConfirmation(
        uint256 beforeAssets,
        uint256 afterAssets,
        uint256 vaultNonce
    ) internal {
        StrategyHelper.sendInvestConfirmation(
            IGatewayEVM(gateway),
            amanaVault,
            beforeAssets,
            afterAssets,
            vaultNonce
        );
    }

    function sendFundsAndDivestConfirmation(
        uint256 amountWithdrawn,
        uint256 afterAssets,
        uint256 vaultNonce
    ) internal {
        StrategyHelper.sendFundsAndDivestConfirmation(
            IGatewayEVM(gateway),
            amanaVault,
            amountWithdrawn,
            afterAssets,
            vaultNonce
        );
    }

    function sendUpdateToVault(uint256 vaultNonce, bytes32 txStatus) internal {
        StrategyHelper.sendUpdateToVault(
            IGatewayEVM(gateway),
            amanaVault,
            inputToken,
            vaultNonce,
            txStatus
        );
        emit TotalUnderlyingAssetsSent(
            vaultNonce,
            inputToken.balanceOf(address(this))
        );
    }

    function _approveTokenIfNeeded(address spender, uint256 amount) internal {
        StrategyHelper.approveOrIncreaseAllowance(inputToken, spender, amount);
    }

    function totalUnderlyingAssets() public view virtual returns (uint256);

    function _invest() internal virtual;

    function _withdrawFundsFromYieldSource(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal virtual returns (uint256);

    function _transferAssetsToNewStrategy() internal virtual;
}
