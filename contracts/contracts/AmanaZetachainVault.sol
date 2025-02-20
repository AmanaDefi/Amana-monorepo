// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./AmanaVaultBase.sol";
import "./interfaces/IStrategy.sol";

/// @title AmanaZetachainVault
/// @notice An ERC4626-compliant vault for managing cross-chain assets on ZetaChain.
/// @dev The vault interacts with connected chain strategies and supports ZRC20 assets.
contract AmanaZetachainVault is AmanaVaultBase {
    using SafeERC20 for IERC20;
    using Math for uint256;

    /**
     * @notice Handles incoming messages from connected chains.
     * @param context Context of the cross-chain message.
     * @param zrc20 Address of the ZRC20 asset.
     * @param amount Amount of the asset received.
     * @param message Additional data sent in the message.
     */
    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external override onlyGateway {
        if (amount > 0) {
            (
                address erc20source,
                uint256 minimumOut,
                uint16 slippage,
                bytes32 crossChainTxId
            ) = abi.decode(message, (address, uint256, uint16, bytes32));
            _depositComingFromConnectedChain(
                context.sender,
                context.chainID,
                amount,
                minimumOut,
                zrc20,
                erc20source,
                slippage,
                crossChainTxId
            );
        } else {
            (
                address withdrawZRC20,
                address withdrawERC20,
                uint256 withdrawAmount,
                uint256 minimumOut,
                uint16 slippage,
                bytes32 crossChainTxId
            ) = abi.decode(
                    message,
                    (address, address, uint256, uint256, uint16, bytes32)
                );
            _withdrawComingFromConnectedChain(
                context.sender,
                withdrawZRC20,
                withdrawERC20,
                withdrawAmount,
                minimumOut,
                uint32(context.chainID),
                slippage,
                crossChainTxId
            );
        }
    }

    /**
     * @notice Switches the strategy used by the vault.
     * @param newStrategyAddress Address of the new strategy.
     */
    function switchStrategy(
        address newStrategyAddress,
        uint256 minAmountOut,
        uint256 minSharesOut
    ) external override onlyOwner {
        if (newStrategyAddress == address(0)) revert InvalidStrategyAddress();
        if (newStrategyAddress == strategyAddress)
            revert InvalidStrategyAddress();

        if (IStrategy(strategyAddress).totalUnderlyingAssets() > 0) {
            IStrategy(strategyAddress).withdraw(10 ** 18, minAmountOut);
            strategyAddress = newStrategyAddress;
            approveOrIncreaseAllowance(
                IERC20(asset()),
                strategyAddress,
                IERC20(asset()).balanceOf(address(this))
            );
            IStrategy(strategyAddress).invest(
                IERC20(asset()).balanceOf(address(this)),
                minSharesOut
            );
        } else {
            strategyAddress = newStrategyAddress;
        }

        emit StrategyUpdated(newStrategyAddress);
    }

    /**
     * @notice Gets the total assets managed by the vault.
     * @return The total assets in the vault and strategy combined.
     */
    function totalAssets() public view virtual override returns (uint256) {
        uint256 assetBalanceInStrategy = IStrategy(strategyAddress)
            .totalUnderlyingAssets();
        return assetBalanceInStrategy + 1;
    }

    /**
     * @notice Handles the deposit and minting of shares.
     * @param caller The address initiating the deposit.
     * @param receiver The address receiving the shares.
     * @param assets The amount of assets to deposit.
     * @param shares The amount of shares to mint.
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares,
        uint256 minimumOut
    ) internal override {
        if (assets == 0) {
            revert DepositCantBeZero();
        }
        userPrincipal[receiver] += assets;
        totalPrincipal += assets;

        SafeERC20.safeTransferFrom(
            IERC20(asset()),
            caller,
            address(this),
            assets
        );

        _mint(receiver, shares);
        approveOrIncreaseAllowance(IERC20(asset()), strategyAddress, assets);
        IStrategy(strategyAddress).invest(assets, minimumOut);
        emit Deposit(caller, receiver, assets, shares);
    }

    /**
     * @dev Handles the investment of assets into the strategy and mints shares for the receiver.
     *      This function updates the vault's internal accounting, approves the strategy to spend the assets,
     *      and calls the strategy's `invest` function to deposit the assets.
     * @param amount The amount of assets to invest.
     * @param receiver The address of the user receiving the shares.
     **/
    function _investAssets(
        uint256 amount,
        uint256 minimumOut,
        address receiver,
        address,
        address,
        uint32,
        bytes32 crossChainTxId
    ) internal override {
        uint256 shares = previewDeposit(amount);
        userPrincipal[receiver] += amount;
        totalPrincipal += amount;
        _mint(receiver, shares);

        approveOrIncreaseAllowance(IERC20(asset()), strategyAddress, amount);

        IStrategy(strategyAddress).invest(amount, minimumOut);
        emit Deposited(receiver, amount, shares, crossChainTxId);
    }

    /**
     * @dev Withdrawn/redeem common workflow. Handles user withdrawal requests and initiates divestment from the strategy.
     * @param caller The address of the entity initiating the withdrawal.
     * @param user The address of the user receiving the withdrawn assets.
     * @param shares The number of shares being redeemed for the withdrawal.
     * @notice Ensures proper allowance checks and calculates fees before initiating strategy divestment.
     */
    function _withdraw(
        address caller, //caller
        address receiver, // receiver
        address user, // owner
        address withdrawZRC20,
        uint256 minimumOut,
        uint256 shares,
        uint16 slippage
    ) internal override {
        if (caller != user) {
            _spendAllowance(user, caller, shares);
        }

        uint256 fractionToWithdraw = (shares * 1e18) / totalSupply();

        uint256 amountWithdrawn = _divestZetachainStrategy(
            fractionToWithdraw,
            minimumOut
        );

        // Burn the shares after withdrawal to ensure reentrancy-safe execution.
        _burn(user, shares);

        uint256 fractionUserPrincipal = (fractionToWithdraw *
            userPrincipal[user]) / 1e18;
        uint256 feeToWithdraw;
        if (amountWithdrawn > fractionUserPrincipal) {
            feeToWithdraw =
                ((amountWithdrawn - fractionUserPrincipal) * perfFee) /
                10000;
            emit PerformanceFeePaid(user, feeToWithdraw);
            SafeERC20.safeTransfer(IERC20(asset()), treasury, feeToWithdraw);
        }
        userPrincipal[user] -= fractionUserPrincipal;

        _returnFundsToUser(
            amountWithdrawn - feeToWithdraw,
            uint32(block.chainid),
            receiver,
            withdrawZRC20,
            withdrawZRC20,
            0,
            slippage
        );

        emit Withdraw(
            caller,
            receiver,
            user,
            amountWithdrawn - feeToWithdraw,
            shares
        );
    }

    /**
     * @dev Withdrawn/redeem common workflow for withdrawals initiated from a connected chain.
     * @param user The address of the user receiving the withdrawn assets.
     * @param withdrawZRC20 The ZRC20 token address representing the withdrawal asset.
     * @param shares The amount of shares being withdrawn.
     * @param userChainId The chain ID of the user's connected chain.
     * @notice Validates maximum withdrawal limits and calculates fees before initiating divestment.
     */
    function _withdrawComingFromConnectedChain(
        address user,
        address withdrawZRC20,
        address withdrawERC20,
        uint256 shares,
        uint256 minimumOut,
        uint32 userChainId,
        uint16 slippage,
        bytes32 crossChainTxId
    ) internal override {
        if (shares == 0) {
            revert WithdrawCantBeZero();
        }
        uint256 maxShares = maxRedeem(user);
        if (shares > maxShares) {
            revert ERC4626ExceededMaxRedeem(user, shares, maxShares);
        }
        uint256 fractionToWithdraw = (shares * 1e18) / totalSupply();

        uint256 amountWithdrawn = _divestZetachainStrategy(
            fractionToWithdraw,
            minimumOut
        );

        // Burn the shares after withdrawal to ensure reentrancy-safe execution.
        _burn(user, shares);

        uint256 fractionUserPrincipal = (fractionToWithdraw *
            userPrincipal[user]) / 1e18;
        uint256 feeToWithdraw;
        if (amountWithdrawn > fractionUserPrincipal) {
            feeToWithdraw =
                ((amountWithdrawn - fractionUserPrincipal) * perfFee) /
                10000;
            emit PerformanceFeePaid(user, feeToWithdraw);
            SafeERC20.safeTransfer(IERC20(asset()), treasury, feeToWithdraw);
        }
        userPrincipal[user] -= fractionUserPrincipal;

        _returnFundsToUser(
            amountWithdrawn - feeToWithdraw,
            userChainId,
            user,
            withdrawZRC20,
            withdrawERC20,
            crossChainTxId,
            slippage
        );

        emit Withdrawn(user, amountWithdrawn, shares, crossChainTxId);
    }

    /**
     * @notice Divests assets from the connected Zetachain strategy and burns shares.
     * @param shares The amount of assets to withdraw.
     * @return withdrawnAmt The total amount withdrawn from the strategy.
     */
    function _divestZetachainStrategy(
        uint256 shares,
        uint256 minimumOut
    ) internal returns (uint256 withdrawnAmt) {
        uint256 fractionToWithdraw = (shares * 1e18) / totalSupply();
        withdrawnAmt = IStrategy(strategyAddress).withdraw(
            fractionToWithdraw,
            minimumOut
        );
        if (withdrawnAmt < minimumOut) {
            revert IErrors.InsufficientOut();
        }
        return withdrawnAmt;
    }

    /**
     * @dev Handles revert scenarios during cross-chain operations.
     * @param context The revert context containing details about the revert scenario.
     * @notice Executes appropriate recovery steps based on the revert message.
     */
    function onRevert(
        RevertContext calldata context
    ) external override onlyGateway {
        (
            string memory revertMessage,
            bytes32 _crossChainTxId,
            uint256 amount,
            address receiver,
            address userZRC20,
            address userERC20,
            uint32 userChainId
        ) = abi.decode(
                context.revertMessage,
                (string, bytes32, uint256, address, address, address, uint32)
            );

        if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_returnFundsToUserFailed"))
        ) {
            emit ReturnFundsToUserFailed(_crossChainTxId);
        } else {
            revert("Revert not handled");
        }
    }
}
