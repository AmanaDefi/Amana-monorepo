// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";
import "../interfaces/IWETH.sol";
import "../interfaces/I4626Vault.sol";

/// @title StrategyParent
/// @notice Base contract for cross-chain investment strategies.
/// @dev Handles common logic for investing, divesting, and cross-chain messaging.
abstract contract StrategyParent is Ownable {
    using SafeERC20 for IERC20;

    string public name;
    address public immutable amanaVault;
    uint256 public executionNonce = 1;

    event FundsInvested(
        uint256 indexed crossChainTxId,
        address userAddress,
        uint256 amount
    );
    event FundsDivested(
        uint256 indexed crossChainTxId,
        address userAddress,
        uint256 amount
    );
    event InvestConfirmFailed(uint256 indexed crossChainTxId);
    event ReturnFundsFromStrategyFailed(uint256 indexed crossChainTxId);

    error ApprovalFailed();

    address immutable _GATEWAY_ADDRESS;

    modifier onlyGateway() {
        require(
            msg.sender == _GATEWAY_ADDRESS,
            "Only Gateway contract can call"
        );
        _;
    }

    constructor(
        string memory _name,
        address _amanaVault,
        address _gateway
    ) Ownable(msg.sender) {
        require(_amanaVault != address(0), "Invalid amanaVault address");
        name = _name;
        amanaVault = _amanaVault;
        _GATEWAY_ADDRESS = _gateway;
    }

    /// @notice Processes calls from the Gateway for deposits or withdrawals.
    /// @param context The message context from the Gateway.
    /// @param message Encoded data specifying the transaction details.
    function onCall(
        MessageContext calldata context,
        bytes calldata message
    ) external payable onlyGateway returns (bytes memory) {
        (
            address userAddress,
            address ZRC20Address,
            uint256 amount,
            uint256 fee,
            uint32 withdrawChainId,
            bool isDeposit,
            uint256 crossChainTxId
        ) = abi.decode(
                message,
                (address, address, uint256, uint256, uint32, bool, uint256)
            );

        if (context.sender != address(amanaVault)) {
            revert("Only Vault contract can call the strategy");
        }

        uint256 currentExecutionNonce = executionNonce;
        executionNonce++;

        if (isDeposit) {
            _invest(userAddress, amount, currentExecutionNonce, crossChainTxId);
            return abi.encode(true);
        } else {
            _divest(
                userAddress,
                ZRC20Address,
                amount,
                fee,
                withdrawChainId,
                currentExecutionNonce,
                crossChainTxId
            );
            return abi.encode(true);
        }
    }

    function totalUnderlyingAssets() public view virtual returns (uint256);

    /// @notice Invests ETH into the Aave pool.
    /// @param userAddress Address of the user whose funds are being invested.
    /// @param amount Amount of ETH to invest.
    /// @param _executionNonce Current execution nonce for the transaction.
    /// @param _crossChainTxId Cross-chain transaction ID.
    function _invest(
        address userAddress,
        uint256 amount,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) internal virtual;

    function _depositFundsIntoYieldSource(uint256 amount) internal virtual;

    /// @notice Withdraws funds from the Aave pool.
    /// @param userAddress Address of the user whose funds are being withdrawn.
    /// @param ZRC20Address ZRC20 token address for the withdrawal.
    /// @param amount Amount to withdraw.
    /// @param fee Gas fee for the transaction.
    /// @param withdrawChainId Chain ID for the withdrawal.
    /// @param _executionNonce Current execution nonce for the transaction.
    /// @param _crossChainTxId Cross-chain transaction ID.
    function _divest(
        address userAddress,
        address ZRC20Address,
        uint256 amount,
        uint256 fee,
        uint32 withdrawChainId,
        uint256 _executionNonce,
        uint256 _crossChainTxId
    ) internal virtual;

    function _withdrawFundsFromYieldSource(uint256 amount) internal virtual;

    /// @notice Handles reverts from the Gateway.
    /// @param context Context of the revert.
    function onRevert(RevertContext calldata context) external {
        (string memory revertMessage, uint256 _crossChainTxId) = abi.decode(
            context.revertMessage,
            (string, uint256)
        );

        if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_investConfirmFailed"))
        ) {
            emit InvestConfirmFailed(_crossChainTxId);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_returnFundsFromStrategyFailed"))
        ) {
            _depositFundsIntoYieldSource(context.amount);
            emit ReturnFundsFromStrategyFailed(_crossChainTxId);
        } else {
            revert("Revert not handled");
        }
    }
}
