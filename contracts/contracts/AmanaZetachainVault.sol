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
            (address erc20source, uint16 slippage, bytes32 crossChainTxId) = abi
                .decode(message, (address, uint16, bytes32));
            _depositComingFromConnectedChain(
                context.sender,
                context.chainID,
                amount,
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
                uint16 slippage,
                bytes32 crossChainTxId
            ) = abi.decode(
                    message,
                    (address, address, uint256, uint16, bytes32)
                );
            _withdrawComingFromConnectedChain(
                context.sender,
                withdrawZRC20,
                withdrawERC20,
                withdrawAmount,
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
        address newStrategyAddress
    ) external override onlyOwner {
        if (newStrategyAddress == address(0)) revert InvalidStrategyAddress();
        if (newStrategyAddress == strategyAddress)
            revert InvalidStrategyAddress();

        if (IStrategy(strategyAddress).totalUnderlyingAssets() > 0) {
            IStrategy(strategyAddress).withdraw(
                IStrategy(strategyAddress).totalUnderlyingAssets(),
                10 ** 27
            );
            strategyAddress = newStrategyAddress;
            approveOrIncreaseAllowance(
                IERC20(asset()),
                strategyAddress,
                IERC20(asset()).balanceOf(address(this))
            );
            IStrategy(strategyAddress).invest(
                IERC20(asset()).balanceOf(address(this))
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
        uint256 shares
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
        IStrategy(strategyAddress).invest(assets);
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

        IStrategy(strategyAddress).invest(amount);
        emit Deposited(receiver, amount, shares, crossChainTxId);
    }

    /**
     * @dev Withdrawn/redeem common workflow. Handles user withdrawal requests and initiates divestment from the strategy.
     * @param caller The address of the entity initiating the withdrawal.
     * @param user The address of the user receiving the withdrawn assets.
     * @param assets The amount of assets being withdrawn.
     * @param shares The number of shares being redeemed for the withdrawal.
     * @notice Ensures proper allowance checks and calculates fees before initiating strategy divestment.
     */
    function _withdraw(
        address caller, //caller
        address receiver, // receiver
        address user, // owner
        uint256 assets,
        uint256 shares
    ) internal override {
        if (assets == 0) {
            revert WithdrawCantBeZero();
        }
        if (caller != user) {
            _spendAllowance(user, caller, shares);
        }
        uint256 feeToWithdraw = _applyFee(user, assets);

        uint256 amountWithdrawn = _divestZetachainStrategy(
            assets,
            feeToWithdraw
        );

        // Burn the shares after withdrawal to ensure reentrancy-safe execution.
        _burn(user, shares);

        if (feeToWithdraw > 0) {
            emit PerformanceFeePaid(user, feeToWithdraw);
            SafeERC20.safeTransfer(IERC20(asset()), treasury, feeToWithdraw);
        }

        SafeERC20.safeTransfer(
            IERC20(asset()),
            receiver,
            amountWithdrawn - feeToWithdraw
        );

        emit Withdraw(caller, receiver, user, assets, shares);
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

        uint256 assets = previewRedeem(shares);

        uint256 feeToWithdraw = _applyFee(user, assets);
        uint256 amountWithdrawn = _divestZetachainStrategy(
            assets,
            feeToWithdraw
        );

        // Burn the shares after withdrawal to ensure reentrancy-safe execution.
        _burn(user, shares);

        if (feeToWithdraw > 0) {
            emit PerformanceFeePaid(user, feeToWithdraw);
            SafeERC20.safeTransfer(IERC20(asset()), treasury, feeToWithdraw);
        }

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
     * @param assets The amount of assets to withdraw.
     * @param feeToWithdraw The fee to be applied for the withdrawal.
     * @return withdrawnAmt The total amount withdrawn from the strategy.
     */
    function _divestZetachainStrategy(
        uint256 assets,
        uint256 feeToWithdraw
    ) internal returns (uint256 withdrawnAmt) {
        withdrawnAmt = IStrategy(strategyAddress).withdraw(
            assets + feeToWithdraw,
            ((assets + feeToWithdraw) * (10 ** 27)) / totalAssets() + 1
        );

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
