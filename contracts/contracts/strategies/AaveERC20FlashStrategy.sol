// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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

    IAavePool public immutable zeroLendPool;
    IAaveReceiptToken public immutable receiptToken;
    uint256 public constant BORROW_RATIO = 8000; // 80% of supplied funds

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
        address _gateway
    )
        StrategyParent(_name, _amanaVault, _gateway)
        ERC20StrategyParent(_inputTokenAddress)
    {
        receiptToken = IAaveReceiptToken(_receiptTokenAddress);
        zeroLendPool = IAavePool(receiptToken.POOL());
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minSharesOut
    ) internal override {
        require(amount > 0, "Deposit amount must be greater than zero");

        // Transfer user's deposit to contract
        inputToken.safeTransferFrom(msg.sender, address(this), amount);

        // Calculate flash loan amount needed
        uint256 flashLoanAmount = (amount * 4) / 3;
        uint256 totalDeposit = amount + flashLoanAmount;

        // Prepare parameters (operationType = 0 for deposit)
        bytes memory params = abi.encode(
            0,
            amount,
            flashLoanAmount,
            minSharesOut
        );

        // Request a flash loan from the ZeroLend Pool
        zeroLendPool.flashLoanSimple(
            address(this),
            address(inputToken),
            flashLoanAmount,
            params,
            0
        );
    }

    function _withdrawFundsFromYieldSource(
        uint256 fractionToWithdraw,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 totalShares = receiptToken.balanceOf(address(this));
        uint256 sharesToWithdraw = (fractionToWithdraw * totalShares + 5e17) /
            1e18;

        if (sharesToWithdraw > totalShares) {
            sharesToWithdraw = totalShares;
        }

        // Step 1: Get the current borrowed amount (totalDebtBase)
        (
            ,
            // totalCollateralBase (not needed)
            uint256 totalDebtBase, // This is the borrowed amount // availableBorrowsBase // currentLiquidationThreshold // ltv // healthFactor
            ,
            ,
            ,

        ) = zeroLendPool.getUserAccountData(address(this));

        require(totalDebtBase > 0, "No borrowed amount to unwind");

        // Step 2: Calculate the proportional debt repayment
        uint256 repayAmount = (fractionToWithdraw * totalDebtBase) / 1e18;
        // Prepare parameters (operationType = 1 for withdrawal)
        bytes memory params = abi.encode(
            1,
            sharesToWithdraw,
            repayAmount,
            minAmountOut
        );

        // Request a flash loan to cover proportional repayment
        zeroLendPool.flashLoanSimple(
            address(this),
            address(inputToken),
            repayAmount,
            params,
            0
        );

        return amountWithdrawn;
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes memory data
    ) external override nonReentrant returns (bool success) {
        require(
            msg.sender == address(zeroLendPool),
            "Unauthorized flash loan caller"
        );
        require(asset == address(inputToken), "Invalid flash loan asset");

        // Decode the payload
        (
            uint256 operationType,
            uint256 value1,
            uint256 value2,
            uint256 minAmountOut
        ) = abi.decode(data, (uint256, uint256, uint256, uint256));

        if (operationType == 0) {
            // 🔹 Deposit Flash Loan Execution
            uint256 initialDeposit = value1;
            uint256 flashLoanAmount = value2;

            uint256 totalDeposit = initialDeposit + flashLoanAmount;

            // Approve and deposit into ZeroLend
            inputToken.safeApprove(address(zeroLendPool), totalDeposit);
            zeroLendPool.supply(
                address(inputToken),
                totalDeposit,
                address(this)
            );

            // Borrow 80% of supplied funds
            uint256 borrowAmount = (totalDeposit * BORROW_RATIO) / 10000;
            zeroLendPool.borrow(
                address(inputToken),
                borrowAmount,
                address(this)
            );

            // Repay the flash loan
            uint256 repaymentAmount = flashLoanAmount + premium;
            require(
                borrowAmount >= repaymentAmount,
                "Not enough borrowed to repay flash loan"
            );
            inputToken.safeTransfer(address(zeroLendPool), repaymentAmount);

            emit FlashLoanExecuted(flashLoanAmount, totalDeposit);
            emit LeveragedDeposit(totalDeposit, borrowAmount);
        } else if (operationType == 1) {
            // 🔹 Withdrawal Flash Loan Execution
            uint256 sharesToWithdraw = value1;
            uint256 repayAmount = value2;

            // Use flash loan proceeds to repay proportional borrowed amount
            inputToken.safeApprove(address(zeroLendPool), repayAmount);
            zeroLendPool.repay(address(inputToken), repayAmount, address(this));

            // Withdraw user's requested amount (debt is now partially repaid)
            uint256 amountWithdrawn = zeroLendPool.withdraw(
                address(inputToken),
                sharesToWithdraw,
                address(this)
            );

            // Ensure enough funds to repay the flash loan
            uint256 repaymentAmount = amount + premium;
            require(
                amountWithdrawn >= repaymentAmount,
                "Insufficient funds to repay flash loan"
            );

            // Repay the flash loan
            inputToken.safeTransfer(address(zeroLendPool), repaymentAmount);

            // Send the remaining funds to the user
            uint256 finalUserAmount = amountWithdrawn - repaymentAmount;
            require(
                finalUserAmount >= minAmountOut,
                "Final withdrawal amount too low"
            );

            emit FlashLoanRepaid(repayAmount);
            emit WithdrawCompleted(finalUserAmount);
        }

        return true;
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
        uint256 minimumSharesOut,
        address newStrategy,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) internal override {
        // uint256 strategyTotalBalance = receiptToken.balanceOf(address(this));
        uint256 amountWithdrawn = _withdrawFundsFromYieldSource(
            1e18,
            minAmountOut
        );

        approveOrIncreaseAllowance(inputToken, newStrategy, amountWithdrawn);
        IStrategy(newStrategy).depositFromOldStrategy(
            amountWithdrawn,
            minimumSharesOut,
            currentExecutionNonce,
            _crossChainTxId
        );
        emit AssetsTransferredToNewStrategy(
            newStrategy,
            amountWithdrawn,
            currentExecutionNonce,
            _crossChainTxId
        );
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
        return receiptToken.balanceOf(address(this));
    }
}
