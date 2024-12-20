// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./AmanaVaultBase.sol";

/// @title AmanaZetachainVault
/// @notice An ERC4626-compliant vault for managing cross-chain assets on ZetaChain.
/// @dev The vault interacts with connected chain strategies and supports ZRC20 assets.
contract AmanaZetachainVault is AmanaVaultBase {
    using SafeERC20 for IERC20;
    using Math for uint256;

    error NoAssetsToSwitch(); // TODO move this to base?

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
            _depositComingFromConnectedChain(context.sender, amount, zrc20);
        } else {
            (address withdrawZRC20, uint256 withdrawAmount) = abi.decode(
                message,
                (address, uint256)
            );
            _withdrawComingFromConnectedChain(
                context.sender,
                withdrawZRC20,
                withdrawAmount,
                uint32(context.chainID)
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
        VaultStorage storage $ = _getVaultStorage();
        if (newStrategyAddress == address(0)) revert InvalidStrategyAddress();
        if (newStrategyAddress == $.strategyAddress)
            revert InvalidStrategyAddress();

        if (IStrategy($.strategyAddress).totalUnderlyingAssets() > 0) {
            IStrategy($.strategyAddress).withdraw(
                IStrategy($.strategyAddress).totalUnderlyingAssets(),
                10 ** 27
            );
            $.strategyAddress = newStrategyAddress;
            bool success = IZRC20(asset()).approve(
                $.strategyAddress,
                IERC20(asset()).balanceOf(address(this))
            );
            if (!success) revert ApprovalFailed();
            IStrategy($.strategyAddress).invest(
                IERC20(asset()).balanceOf(address(this))
            );
        } else {
            $.strategyAddress = newStrategyAddress;
        }

        emit StrategyUpdated(newStrategyAddress, VAULT_CHAIN_ID);
    }

    /**
     * @notice Gets the total assets managed by the vault.
     * @return The total assets in the vault and strategy combined.
     */
    function totalAssets() public view virtual override returns (uint256) {
        VaultStorage storage $ = _getVaultStorage();
        uint256 assetBalanceInStrategy = IStrategy($.strategyAddress)
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
        VaultStorage storage $ = _getVaultStorage();
        $.userPrincipal[receiver] += assets;
        $.totalPrincipal += assets;

        SafeERC20.safeTransferFrom(
            IERC20(asset()),
            caller,
            address(this),
            assets
        );

        _mint(receiver, shares);

        bool success = IERC20(asset()).approve($.strategyAddress, assets);
        if (!success) revert ApprovalFailed();
        IStrategy($.strategyAddress).invest(assets);
        emit Deposit(caller, receiver, assets, shares);
    }

    function _investAssets(
        uint256 amount,
        address receiver,
        address,
        uint32
    ) internal override {
        VaultStorage storage $ = _getVaultStorage();
        uint256 shares = previewDeposit(amount);
        $.userPrincipal[receiver] += amount;
        $.totalPrincipal += amount;
        _mint(receiver, shares);

        bool success = IERC20(asset()).approve($.strategyAddress, amount);
        if (!success) revert ApprovalFailed();
        IStrategy($.strategyAddress).invest(amount);
        emit Deposit(address(0), receiver, amount, shares);
    }

    /**
     * @dev Withdrawn/redeem common workflow for withdrawals initiated from a connected chain.
     * @param user The address of the user receiving the withdrawn assets.
     * @param withdrawZRC20 The ZRC20 token address representing the withdrawal asset.
     * @param assets The amount of assets being withdrawn.
     * @param userChainId The chain ID of the user's connected chain.
     * @notice Validates maximum withdrawal limits and calculates fees before initiating divestment.
     */
    function _withdrawComingFromConnectedChain(
        address user,
        address withdrawZRC20,
        uint256 assets,
        uint32 userChainId
    ) internal override {
        if (assets == 0) {
            revert WithdrawCantBeZero();
        }
        uint256 maxAssets = maxWithdraw(user);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxWithdraw(user, assets, maxAssets);
        }
        uint256 feeToWithdraw = _applyFee(user, assets);
        uint256 shares = previewWithdraw(assets);

        _divestFromStrategy(
            user,
            withdrawZRC20,
            assets,
            feeToWithdraw,
            shares,
            userChainId
        );
    }

    function _divestFromStrategy(
        address user,
        address withdrawZRC20,
        uint256 amount,
        uint256 feeToWithdraw,
        uint256 shares,
        uint32 chainID
    ) internal override {
        uint256 currentCrossChainTxId = crossChainTxId;
        crossChainTxId += 1;
        uint256 withdrawnAmt = _divestZetachainStrategy(
            amount,
            feeToWithdraw,
            user,
            shares
        );
        _returnFundsToUser(
            amount,
            chainID,
            user,
            withdrawZRC20,
            currentCrossChainTxId
        );

        emit Withdraw(user, user, user, withdrawnAmt - feeToWithdraw, shares);
    }

    /**
     * @notice Divests assets from the connected Zetachain strategy and burns shares.
     * @param assets The amount of assets to withdraw.
     * @param feeToWithdraw The fee to be applied for the withdrawal.
     * @param user The address of the user initiating the withdrawal.
     * @param shares The amount of shares to burn.
     * @return withdrawnAmt The total amount withdrawn from the strategy.
     */
    function _divestZetachainStrategy(
        uint256 assets,
        uint256 feeToWithdraw,
        address user,
        uint256 shares
    ) internal returns (uint256 withdrawnAmt) {
        VaultStorage storage $ = _getVaultStorage();

        uint256 fractionToWithdraw = ((assets + feeToWithdraw) * (10 ** 27)) /
            totalAssets() +
            1;
        withdrawnAmt = IStrategy($.strategyAddress).withdraw(
            assets + feeToWithdraw,
            fractionToWithdraw
        );
        if (feeToWithdraw > 0) {
            emit PerformanceFeePaid(user, feeToWithdraw);
            SafeERC20.safeTransfer(IERC20(asset()), $.treasury, feeToWithdraw);
        }

        // Burn the shares after withdrawal to ensure reentrancy-safe execution.
        _burn(user, shares);
        return withdrawnAmt;
    }

    /**
     * @notice Handles the revert of a transaction.
     * @param context The revert context containing details about the transaction.
     */
    function onRevert(RevertContext calldata context) external override {
        (string memory revertMessage, uint256 _crossChainTxId) = abi.decode(
            context.revertMessage,
            (string, uint256)
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
