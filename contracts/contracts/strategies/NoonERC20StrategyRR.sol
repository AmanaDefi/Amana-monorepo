// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./ERC20StrategyParent.sol";

import "../interfaces/ISwapHelper.sol";
import "../interfaces/I4626Vault.sol";
import "../interfaces/INoonWithdrawHelper.sol";

contract NoonERC20Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    address public constant USN_ADDRESS =
        0xdA67B4284609d2d48e5d10cfAc411572727dc1eD;
    address public constant USDT_ADDRESS =
        0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant WITHDRAWHELPER =
        0x0DaBc0D9B270c9B0C4C77AaCeAa712b56D0F9178;

    function initialize(
        string memory _name,
        address _gatewayAddress,
        address _amanaVault,
        address _withdrawHelper,
        address _swapHelper,
        address _receiptTokenAddress, // this is YUSD
        address _inputTokenAddress, // inputToken
        address, // _liquidityGaugeAddress - not needed
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
        // USN_ADDRESS = 0xdA67B4284609d2d48e5d10cfAc411572727dc1eD; // USN address on Ethereum
        // USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7; // USDT address on Ethereum
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minAmountOut
    ) internal override {
        require(amount > 0, "Deposit amount must be greater than zero");

        // approveOrIncreaseAllowance(inputToken, receiptTokenAddress, amount);

        // uint256 amountOut = I4626Vault(receiptTokenAddress).deposit(
        //     amount,
        //     address(this)
        // );
        SafeERC20.safeTransfer(IERC20(inputToken), address(swapHelper), amount);

        // Swap input token to receipt token (sUSN) via Uni v4
        uint256 amountOut = ISwapHelper(swapHelper)
            .swapViaUniV3SpecificIntermediateTokens(
                address(inputToken),
                USDT_ADDRESS, // USDT as intermediate token
                USN_ADDRESS, // USN as intermediate token
                amount,
                receiptTokenAddress,
                10000,
                address(this),
                9999,
                "0x"
            );
        require(amountOut >= minAmountOut, "Insufficient output amount");
    }

    function _unstakeFundsFromYieldSource(
        uint256 amount,
        uint256 minAmountOut
    ) internal override returns (uint256 requestId) {
        require(amount > 0, "Unstake amount must be greater than zero");

        // approveOrIncreaseAllowance(receiptTokenAddress, inputToken, amount);
        // this is a withdraw call, so it will withdraw USN from the vault, so amount can be used directly
        requestId = INoonWithdrawHelper(WITHDRAWHELPER).getUserNextRequestId(
            address(this)
        );
        uint256 amountUnstaked = I4626Vault(receiptTokenAddress).withdraw(
            amount,
            address(this),
            address(this)
        );
        // SafeERC20.safeTransfer(IERC20(receiptTokenAddress), address(swapHelper), amount);

        // Swap receipt token (sUSN) to input token (USDT) via Uni v4
        // uint256 amountOut = ISwapHelper(swapHelper)
        //     .swapViaUniV3SpecificIntermediateTokens(
        //         receiptTokenAddress,
        //         USN_ADDRESS, // USN as intermediate token
        //         USDT_ADDRESS, // USDT as intermediate token
        //         amount,
        //         address(inputToken),
        //         10000,
        //         address(this),
        //         9999,
        //         "0x"
        //     );
        require(amountUnstaked >= minAmountOut, "Insufficient output amount");
    }

    function _withdrawFundsFromYieldSource(
        uint256 amount,
        uint256 requestId
    ) internal override returns (uint256 amountWithdrawn) {
        INoonWithdrawHelper(WITHDRAWHELPER).claimWithdrawal(requestId);
        return amount; // amount is already the amount withdrawn
    }

    function _transferAssetsToNewStrategy() internal override {
        BufferedTx memory txn = pendingByNonce[lastProcessedNonce + 1];

        if (IStrategy(txn.newStrategy).amanaVault() != amanaVault)
            revert InvalidAmanaVault();

        harvest();

        // Withdraw all BPT from the liquidity gauge
        uint256 totalinYusd = IERC20(receiptTokenAddress).balanceOf(
            address(this)
        );

        // Transfer the LP tokens to the new strategy
        IERC20(receiptTokenAddress).transfer(txn.newStrategy, totalinYusd);

        IStrategy(txn.newStrategy).depositFromOldStrategy(
            totalinYusd,
            txn.minimumOut,
            lastProcessedNonce + 1
        );

        emit AssetsTransferredToNewStrategy(
            txn.newStrategy,
            totalinYusd,
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
        if (address(inputToken) == receiptTokenAddress || shares == 0) {
            return shares;
        }
        uint256 totalInUsn = I4626Vault(receiptTokenAddress).convertToAssets(
            shares
        );
        uint256 totalInUsdt = totalInUsn / 10 ** 12; // assuming USN:USDT is 1:1
        return totalInUsdt;
        // try
        //     ISwapHelper(swapHelper).getPathV3(receiptTokenAddress, address(inputToken))
        // returns (
        //     address[] memory path,
        //     uint24[] memory feeTiers,
        //     bytes memory /* encodedPath */
        // ) {
        //     if (path.length == 0 || feeTiers.length == 0) {
        //         return shares; // fallback to 1:1 if no path found
        //     }

        //     try
        //         ISwapHelper(swapHelper).getAmountOutV3(shares, path, feeTiers)
        //     returns (uint amountOut) {
        //         return amountOut;
        //     } catch {
        //         return shares; // fallback if price estimation fails
        //     }
        // } catch {
        //     return shares; // fallback if path retrieval fails
        // }
    }

    function convertToShares(
        uint256 assets
    ) public view override returns (uint256 shares) {
        if (address(inputToken) == receiptTokenAddress || assets == 0) {
            return assets;
        }
        uint256 totalinUsn = assets * 10 ** 12; // assuming USN:USDT is 1:1
        uint256 totalinSusn = I4626Vault(receiptTokenAddress).convertToShares(
            totalinUsn
        );
        return totalinSusn;
        // try
        //     ISwapHelper(swapHelper).getPathV3(address(inputToken), receiptTokenAddress)
        // returns (
        //     address[] memory path,
        //     uint24[] memory feeTiers,
        //     bytes memory /* encodedPath */
        // ) {
        //     if (path.length == 0 || feeTiers.length == 0) {
        //         return assets; // fallback to 1:1 if no path found
        //     }

        //     try
        //         ISwapHelper(swapHelper).getAmountOutV3(assets, path, feeTiers)
        //     returns (uint amountOut) {
        //         return amountOut;
        //     } catch {
        //         return assets; // fallback if price estimation fails
        //     }
        // } catch {
        //     return assets; // fallback if path retrieval fails
        // }
    }

    function getStrategyWithdrawShareAmount(
        uint256 assetAmount
    ) public view override returns (uint256 withdrawShareAmount) {
        uint256 totalShares = IERC20(receiptTokenAddress).balanceOf(
            address(this)
        );
        uint256 sharesToWithdraw = convertToShares(assetAmount);
        if (sharesToWithdraw > totalShares) {
            sharesToWithdraw = totalShares;
        }
        if (totalShares > 0 && totalShares - sharesToWithdraw <= 1e9) {
            sharesToWithdraw = totalShares;
        }
        return sharesToWithdraw;
    }
}
