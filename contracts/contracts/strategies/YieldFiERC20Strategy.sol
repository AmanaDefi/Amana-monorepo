// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./ERC20StrategyParent.sol";

import "../interfaces/ISwapHelper.sol";
import "../interfaces/I4626Vault.sol";

import "hardhat/console.sol";

interface IManager {
    function deposit(
        address _yToken,
        address _asset,
        uint256 _amount,
        address _receiver,
        address _callback,
        bytes calldata _callbackData,
        bytes32 _referralCode
    ) external;

    function redeem(
        address caller,
        address _yToken,
        address _asset,
        uint256 _shares,
        address _receiver,
        address _callback,
        bytes calldata _callbackData
    ) external;

    function minSharesInYToken(address _yToken) external view returns (uint256);
}

contract YieldFiERC20Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    address public manager;

    function initialize(
        string memory _name,
        address _gatewayAddress,
        address _amanaVault,
        address _withdrawHelper,
        address _swapHelper,
        address _receiptTokenAddress, // this is YUSD
        address _inputTokenAddress, // inputToken
        address, // _liquidityGaugeAddress, // this is the YUSD staking gauge
        address /* _rewardsTokenAddress — not needed */,
        uint256 // _inputTokenIndex - not needed
    ) external initializer {
        __StrategyParent_init(
            _name,
            _amanaVault,
            _gatewayAddress,
            _withdrawHelper,
            _inputTokenAddress,
            _receiptTokenAddress
        );

        swapHelper = _swapHelper;

        manager = 0x03ACc35286bAAE6D73d99a9f14Ef13752208C8dC;
    }

    function _processNextBufferedTransaction()
        internal
        override
        returns (bool didProcess)
    {
        uint256 nextNonce = lastProcessedNonce + 1;
        BufferedTx storage txData = pendingByNonce[nextNonce];

        if (
            txData.txType == TxType(0) &&
            txData.assetAmount == 0 &&
            txData.minimumOut == 0 &&
            txData.newStrategy == address(0)
        ) {
            return false;
        }

        if (txData.txType == TxType.Deposit) {
            _invest();
        } else if (txData.txType == TxType.Withdraw) {
            _divest();
            return false;
        } else if (txData.txType == TxType.Switch) {
            _transferAssetsToNewStrategy();
        } else if (txData.txType == TxType.Revert) {
            _sendUpdateToVault(nextNonce, TX_DEPOSIT_REVERTED);
        } else {
            revert("Unknown TxType");
        }

        delete pendingByNonce[nextNonce];
        lastProcessedNonce = nextNonce;
        return true;
    }

    function _divest() internal override {
        BufferedTx storage txData = pendingByNonce[lastProcessedNonce + 1];
        _withdrawFundsFromYieldSource(txData.assetAmount, txData.minimumOut);
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minAmountOut,
        TxType txType
    ) internal override {
        require(amount > 0, "Deposit amount must be greater than zero");

        approveOrIncreaseAllowance(inputToken, receiptTokenAddress, amount);

        uint256 amountOut = I4626Vault(receiptTokenAddress).deposit(
            amount,
            address(this)
        );
        if (txType == TxType.Deposit) {
            pendingDepositAmount -= amount;
        }
        // approveOrIncreaseAllowance(IERC20(inputToken), manager, amount);
        // uint256 inputTokenBalanceBefore = inputToken.balanceOf(address(this));
        // IManager(manager).deposit(
        //     receiptTokenAddress,
        //     address(inputToken),
        //     amount,
        //     address(this),
        //     address(this),
        //     "",
        //     bytes32(0)
        // );

        // uint256 inputTokenBalanceAfter = inputToken.balanceOf(address(this));
        // uint256 amountOut = inputTokenBalanceBefore - inputTokenBalanceAfter;
        require(amountOut >= minAmountOut, "Insufficient output amount");
    }

    function _withdrawFundsFromYieldSource(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        uint256 vyusdToWithdraw = getStrategyWithdrawShareAmount(assetAmount);

        // approveOrIncreaseAllowance(
        //     IERC20(receiptTokenAddress),
        //     address(this),
        //     vyusdToWithdraw
        // );
        uint256 inputTokenBalanceBefore = inputToken.balanceOf(address(this));
        console.log("Input token balance before: %s", inputTokenBalanceBefore);
        // uint256 amountOut = I4626Vault(receiptTokenAddress).redeem(
        //     vyusdToWithdraw,
        //     address(this),
        //     address(this)
        // );

        IERC20(receiptTokenAddress).approve(manager, type(uint256).max);
        console.log("Requesting redemption of %s YUSD", vyusdToWithdraw);
        console.log(
            "Current balance: %s YUSD",
            IERC20(receiptTokenAddress).balanceOf(address(this))
        );
        IManager(manager).redeem(
            address(this),
            receiptTokenAddress,
            address(inputToken),
            vyusdToWithdraw,
            address(this),
            address(this),
            abi.encodeWithSelector(this.execWithdraw.selector)
        );
        console.log("Redemption Request sent");
        console.log(
            "New balance: %s YUSD",
            IERC20(receiptTokenAddress).balanceOf(address(this))
        );
        console.log(
            "Input token balance after: %s",
            inputToken.balanceOf(address(this))
        );
        // 🔄 Return 0 for now; actual assets will arrive asynchronously
        return 0;
    }

    function execWithdraw() external {
        uint256 nextNonce = lastProcessedNonce + 1;
        BufferedTx storage bufferedTx = pendingByNonce[nextNonce];
        if (bufferedTx.txType != TxType.Withdraw) {
            revert InvalidTxType();
        }
        uint256 amount = bufferedTx.assetAmount;
        uint256 totalUnderlyingAssetsAfter = totalUnderlyingAssets();
        uint256 inputTokenBalanceBefore = inputToken.balanceOf(address(this));
        uint256 amountToReturnToUser = inputTokenBalanceBefore -
            pendingDepositAmount;
        uint256 tolerance = 1e6; // Example tolerance (e.g., 0.000001 for 18 decimals, 1 USDC for 6 decimals)

        if (_absDiff(amountToReturnToUser, amount) > tolerance) {
            revert IncorrectAmount();
        }
        _sendFundsAndDivestConfirmation(
            amountToReturnToUser,
            totalUnderlyingAssetsAfter,
            lastProcessedNonce + 1
        );

        emit FundsDivested(
            lastProcessedNonce + 1,
            amountToReturnToUser,
            totalUnderlyingAssetsAfter
        );
        delete pendingByNonce[nextNonce];
        lastProcessedNonce = nextNonce;
        _processBufferedTransactions();
    }

    function _transferAssetsToNewStrategy() internal override {
        BufferedTx memory txn = pendingByNonce[lastProcessedNonce + 1];

        if (IStrategy(txn.newStrategy).amanaVault() != amanaVault)
            revert InvalidAmanaVault();

        // Withdraw all BPT from the liquidity gauge
        uint256 totalinvyUsd = IERC20(receiptTokenAddress).balanceOf(
            address(this)
        );

        // Transfer the LP tokens to the new strategy
        IERC20(receiptTokenAddress).transfer(txn.newStrategy, totalinvyUsd);

        IStrategy(txn.newStrategy).depositFromOldStrategy(
            totalinvyUsd,
            txn.minimumOut,
            lastProcessedNonce + 1
        );

        emit AssetsTransferredToNewStrategy(
            txn.newStrategy,
            totalinvyUsd,
            lastProcessedNonce + 1
        );
    }

    /**
     * @dev Handles deposits from an old strategy into this strategy during a strategy switch.
     *      This function ensures the deposit comes from the old strategy, updates the execution nonce, and invests the funds.
     * @param currentExecutionNonce The current execution nonce from the old strategy.
     */
    function depositFromOldStrategy(
        uint256 amount,
        uint256 minimumSharesOut,
        uint256 currentExecutionNonce
    ) external override {
        if (oldStrategy == address(0)) revert OldStrategyNotSet();
        if (msg.sender != oldStrategy) revert NotAuthorized();

        lastProcessedNonce = currentExecutionNonce;

        emit AssetsReceivedFromOldStrategy(
            oldStrategy,
            amount,
            currentExecutionNonce
        );

        oldStrategy = address(0);
    }

    function totalUnderlyingAssets() public view override returns (uint256) {
        uint256 total = IERC20(receiptTokenAddress).balanceOf(address(this));
        return total > 0 ? convertToAssets(total) : 0;
    }

    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256 assets) {
        assets = I4626Vault(receiptTokenAddress).convertToAssets(shares);
    }

    function convertToShares(
        uint256 assets
    ) public view override returns (uint256 shares) {
        shares = I4626Vault(receiptTokenAddress).convertToShares(assets);
    }

    function getStrategyWithdrawShareAmount(
        uint256 assetAmount
    ) public view override returns (uint256 yusdToWithdraw) {
        uint256 totalinvyUsd = IERC20(receiptTokenAddress).balanceOf(
            address(this)
        );
        yusdToWithdraw = convertToShares(assetAmount);

        if (yusdToWithdraw > totalinvyUsd) {
            yusdToWithdraw = totalinvyUsd;
        }

        // Fetch minShares from YieldFi Manager
        uint256 minShares = IManager(manager).minSharesInYToken(
            receiptTokenAddress
        );
        console.log("Min shares in YToken: %s", minShares);
        if (totalinvyUsd > 0 && totalinvyUsd - yusdToWithdraw <= minShares) {
            yusdToWithdraw = totalinvyUsd;
        }
    }

    // Utility function
    function _absDiff(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }
}
