// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IAavePool.sol";
import "../interfaces/IAaveReceiptToken.sol";
import "./ERC20StrategyParent.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AaveERC20Strategy
/// @notice Contract for ERC20 strategies using Aave and ZetaChain.
/// @dev Handles ERC20 investments and divestments for strategies on EVM-compatible chains.
contract AaveERC20FlashStrategy is ERC20StrategyParent, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct DepositParams {
        uint8 operationType;
        uint256 amount;
        uint256 minSharesOut;
        address receiver;
        uint256 executionNonce;
        bytes32 crossChainTxId;
    }

    struct WithdrawParams {
        uint8 operationType;
        uint256 sharesToWithdraw;
        uint256 repayAmount;
        uint256 minAmountOut;
        address receiver;
        uint256 executionNonce;
        bytes32 crossChainTxId;
        address user;
        uint256 fractionOfTotalShares;
        address withdrawZRC20;
        address withdrawERC20;
        uint32 withdrawChainId;
        uint16 slippage;
    }

    struct TransferParams {
        uint8 operationType;
        uint256 sharesToWithdraw;
        uint256 repayAmount;
        uint256 minAmountOut;
        uint256 minSharesOut;
        address newStrategy;
        uint256 executionNonce;
        bytes32 crossChainTxId;
    }

    IAavePool public immutable zeroLendPool;
    IAaveReceiptToken public immutable receiptToken;
    IERC20 public immutable variableDebtToken;

    uint16 public borrowRatio = 8000; // 80% of supplied funds
    uint16 public flashloanPremium = 5; // 0.05% premium

    event FlashLoanExecuted(uint256 flashLoanAmount, uint256 totalDeposit);
    event FlashLoanRepaid(uint256 repayAmount);

    /// @notice Initializes the strategy contract.
    /// @param _name Name of the strategy.
    /// @param _amanaVault Address of the Amana vault.
    /// @param _receiptTokenAddress Address of the Aave receipt token.
    /// @param _gateway Address of the ZetaChain Gateway.

    constructor(
        string memory _name,
        address _amanaVault,
        address _inputTokenAddress,
        address _receiptTokenAddress,
        address _variableDebtTokenAddress,
        address _gateway
    )
        StrategyParent(_name, _amanaVault, _gateway)
        ERC20StrategyParent(_inputTokenAddress)
    {
        receiptToken = IAaveReceiptToken(_receiptTokenAddress);
        zeroLendPool = IAavePool(receiptToken.POOL());
        variableDebtToken = IERC20(_variableDebtTokenAddress);
    }

    function setBorrowRatio(uint16 _borrowRatio) external onlyOwner {
        require(_borrowRatio <= 10000, "Borrow ratio must be less than 100%");
        borrowRatio = _borrowRatio;
    }

    function setFlashloanPremium(uint16 _flashloanPremium) external onlyOwner {
        require(_flashloanPremium <= 10000, "Premium must be less than 100%");
        flashloanPremium = _flashloanPremium;
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minSharesOut
    ) internal override {}

    function _withdrawFundsFromYieldSource(
        uint256 fractionToWithdraw,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {}

    function _invest(
        address receiver,
        uint256 amount,
        uint256 minSharesOut,
        uint256 executionNonce,
        bytes32 crossChainTxId
    ) internal override {
        inputToken.safeTransferFrom(msg.sender, address(this), amount);
        _executeFlashLoan(
            DepositParams(
                0,
                amount,
                minSharesOut,
                receiver,
                executionNonce,
                crossChainTxId
            )
        );
    }

    function _calculateFlashLoanAmount(
        uint256 amount
    ) internal view returns (uint256) {
        return
            (borrowRatio * amount) / (10000 + flashloanPremium - borrowRatio);
    }

    function _executeFlashLoan(DepositParams memory params) internal {
        bytes memory encodedParams = abi.encode(params);
        zeroLendPool.flashLoanSimple(
            address(this),
            address(inputToken),
            _calculateFlashLoanAmount(params.amount),
            encodedParams,
            0
        );
    }

    function _divest(
        address user,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        uint256 fractionOfTotalShares,
        uint256 minAmountOut,
        uint32 withdrawChainId,
        uint256 executionNonce,
        bytes32 crossChainTxId,
        uint16 slippage
    ) internal override {
        uint256 totalShares = receiptToken.balanceOf(address(this));
        uint256 sharesToWithdraw = (fractionOfTotalShares *
            totalShares +
            5e17) / 1e18;
        sharesToWithdraw = sharesToWithdraw > totalShares
            ? totalShares
            : sharesToWithdraw;

        uint256 fullDebtAmount = IERC20(variableDebtToken).balanceOf(
            address(this)
        );
        uint256 repayAmount = (fractionOfTotalShares * fullDebtAmount) / 1e18;

        WithdrawParams memory params = WithdrawParams(
            1,
            sharesToWithdraw,
            repayAmount,
            minAmountOut,
            receiver,
            executionNonce,
            crossChainTxId,
            user,
            fractionOfTotalShares,
            withdrawZRC20,
            withdrawERC20,
            withdrawChainId,
            slippage
        );

        _executeFlashLoanWithdrawal(params);
    }

    function _executeFlashLoanWithdrawal(
        WithdrawParams memory params
    ) internal {
        bytes memory encodedParams = abi.encode(params);
        zeroLendPool.flashLoanSimple(
            address(this),
            address(inputToken),
            params.repayAmount,
            encodedParams,
            0
        );
    }

    function _executeFlashLoanTransfer(TransferParams memory params) internal {
        bytes memory encodedParams = abi.encode(params);
        zeroLendPool.flashLoanSimple(
            address(this),
            address(inputToken),
            params.repayAmount,
            encodedParams,
            0
        );
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address, //initiator
        bytes memory data
    ) external nonReentrant returns (bool success) {
        require(
            msg.sender == address(zeroLendPool),
            "Unauthorized flash loan caller"
        );
        require(asset == address(inputToken), "Invalid flash loan asset");
        // Extract operation type (first parameter)
        uint8 operationType;

        assembly {
            operationType := mload(add(data, 32)) // Load first 32 bytes
            operationType := byte(31, operationType) // Extract the last byte
        }

        if (operationType == 0) {
            DepositParams memory params = abi.decode(data, (DepositParams));
            _handleDepositExecution(params, amount, premium);
        } else if (operationType == 1) {
            WithdrawParams memory params = abi.decode(data, (WithdrawParams));
            _handleWithdrawalExecution(params, amount, premium);
        } else if (operationType == 2) {
            TransferParams memory params = abi.decode(data, (TransferParams));
            _handleTransferExecution(params, amount, premium);
        } else {
            revert("Invalid operation type");
        }
        return true;
    }

    function _handleDepositExecution(
        DepositParams memory params,
        uint256 amount,
        uint256 premium
    ) internal {
        uint256 totalDeposit = params.amount + amount;
        approveOrIncreaseAllowance(
            inputToken,
            address(zeroLendPool),
            totalDeposit
        );
        zeroLendPool.supply(
            address(inputToken),
            totalDeposit,
            address(this),
            0
        );
        _sendInvestConfirmation(
            params.receiver,
            params.amount,
            totalUnderlyingAssets(),
            params.executionNonce,
            params.crossChainTxId
        );

        emit FundsInvested(
            params.crossChainTxId,
            params.receiver,
            params.amount
        );

        uint256 borrowAmount = amount + premium;
        zeroLendPool.borrow(
            address(inputToken),
            borrowAmount,
            2,
            0,
            address(this)
        );

        approveOrIncreaseAllowance(
            inputToken,
            address(zeroLendPool),
            borrowAmount
        );
        emit FundsInvested(params.crossChainTxId, params.receiver, amount);

        emit FlashLoanExecuted(amount, totalDeposit);
    }

    function _handleWithdrawalExecution(
        WithdrawParams memory params,
        uint256 amount,
        uint256 premium
    ) internal {
        approveOrIncreaseAllowance(
            inputToken,
            address(zeroLendPool),
            params.repayAmount
        );
        zeroLendPool.repay(
            address(inputToken),
            params.repayAmount,
            2,
            address(this)
        );

        uint256 amountWithdrawn = zeroLendPool.withdraw(
            address(inputToken),
            params.sharesToWithdraw,
            address(this)
        );

        uint256 repaymentAmount = amount + premium;
        require(
            amountWithdrawn >= repaymentAmount,
            "Insufficient funds to repay flash loan"
        );

        approveOrIncreaseAllowance(
            inputToken,
            address(zeroLendPool),
            repaymentAmount
        );

        uint256 finalUserAmount = amountWithdrawn - repaymentAmount;
        require(
            finalUserAmount >= params.minAmountOut,
            "Final withdrawal too low"
        );

        _sendFundsAndDivestConfirmation(
            params.user,
            params.receiver,
            params.withdrawZRC20,
            params.withdrawERC20,
            finalUserAmount,
            params.fractionOfTotalShares,
            params.withdrawChainId,
            totalUnderlyingAssets(),
            params.executionNonce,
            params.crossChainTxId,
            params.slippage
        );
        emit FundsDivested(params.crossChainTxId, params.user, finalUserAmount);

        emit FlashLoanRepaid(params.repayAmount);
    }

    function _handleTransferExecution(
        TransferParams memory params,
        uint256 amount,
        uint256 premium
    ) internal {
        approveOrIncreaseAllowance(
            inputToken,
            address(zeroLendPool),
            params.repayAmount
        );
        zeroLendPool.repay(
            address(inputToken),
            params.repayAmount,
            2,
            address(this)
        );

        uint256 amountWithdrawn = zeroLendPool.withdraw(
            address(inputToken),
            params.sharesToWithdraw,
            address(this)
        );

        uint256 repaymentAmount = amount + premium;
        require(
            amountWithdrawn >= repaymentAmount,
            "Insufficient funds to repay flash loan"
        );

        approveOrIncreaseAllowance(
            inputToken,
            address(zeroLendPool),
            repaymentAmount
        );

        uint256 transferAmount = amountWithdrawn - repaymentAmount;
        require(
            transferAmount >= params.minAmountOut,
            "Final withdrawal too low"
        );

        approveOrIncreaseAllowance(
            inputToken,
            params.newStrategy,
            transferAmount
        );
        IStrategy(params.newStrategy).depositFromOldStrategy(
            transferAmount,
            params.minSharesOut,
            params.executionNonce,
            params.crossChainTxId
        );
        emit AssetsTransferredToNewStrategy(
            params.newStrategy,
            amountWithdrawn,
            params.executionNonce,
            params.crossChainTxId
        );
        emit FundsDivested(params.crossChainTxId, address(0), transferAmount);

        emit FlashLoanRepaid(params.repayAmount);
    }

    /**
     * @notice Transfers assets from the current strategy to a new strategy.
     * @dev This function is intended to be overridden in derived contracts to define specific transfer logic.
     * @param newStrategy The address of the new strategy contract.
     * @param currentExecutionNonce The current execution nonce for the transaction.
     * @param _crossChainTxId The cross-chain transaction ID.
     */
    function _transferAssetsToNewStrategy(
        uint256 minAmountOut,
        uint256 minSharesOut,
        address newStrategy,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) internal override {
        uint256 totalShares = receiptToken.balanceOf(address(this));

        uint256 fullDebtAmount = IERC20(variableDebtToken).balanceOf(
            address(this)
        );

        TransferParams memory params = TransferParams(
            2, // transfer
            totalShares,
            fullDebtAmount,
            minAmountOut,
            minSharesOut,
            newStrategy,
            currentExecutionNonce,
            _crossChainTxId
        );

        _executeFlashLoanTransfer(params);
    }

    function getStrategyWithdrawShareAmount(
        uint256 fractionOfTotalShares
    ) public view override returns (uint256) {
        uint256 totalShares = receiptToken.balanceOf(address(this));
        uint256 withdrawShareAmount = (fractionOfTotalShares *
            totalShares +
            5e17) / 1e18;
        if (withdrawShareAmount > totalShares) {
            withdrawShareAmount = totalShares;
        }
        return withdrawShareAmount;
    }

    /// @notice Gets the total assets held in the strategy.
    /// @return Total assets as an unsigned integer.
    function totalUnderlyingAssets() public view override returns (uint256) {
        uint256 totalDebt = variableDebtToken.balanceOf(address(this));
        return receiptToken.balanceOf(address(this)) - totalDebt;
    }

    /// @notice Handles reverts from the Gateway.
    /// @param context Context of the revert.
    function onRevert(
        RevertContext calldata context
    ) external override onlyGateway {
        (string memory revertMessage, bytes32 _crossChainTxId) = abi.decode(
            context.revertMessage,
            (string, bytes32)
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
            _executeFlashLoan(
                DepositParams(0, context.amount, 0, address(0), 0, 0)
            );
            emit ReturnFundsFromStrategyFailed(_crossChainTxId);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_handleRevertOnSendTotalUnderlyingAssets"))
        ) {
            emit SendTotalUnderlyingAssetsFailed();
        } else {
            revert("Revert not handled");
        }
    }
}
