// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./ERC4626RewardsUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";

import "./interfaces/ISystem.sol";
import "./interfaces/IStrategy.sol";
import "./interfaces/IGasTank.sol";

import "./libraries/SwapHelperLib.sol";

/// @title AmanaZetachainVault
/// @notice An ERC4626-compliant vault for managing cross-chain assets on ZetaChain.
/// @dev The vault interacts with connected chain strategies and supports ZRC20 assets.
contract AmanaZetachainVault is
    ERC4626RewardsUpgradeable,
    UUPSUpgradeable,
    UniversalContract,
    Revertable
{
    using SafeERC20 for IERC20;
    using Math for uint256;

    error InvalidStrategyAddress();
    error InvalidTreasuryAddress();
    error FeeExceedsLimit();
    error ApprovalFailed();
    error NothingToWithdraw();
    error InvalidZRC20Address();
    error CantBeZeroAddress();
    error OnlyGateway();

    address constant _GATEWAY_ADDRESS =
        0x6c533f7fE93fAE114d0954697069Df33C9B74fD7; // ZetaChain Gateway address
    ISystem systemContract; // ZetaChain system contract instance
    bytes32 private constant VAULT_STORAGE_LOCATION =
        0x1a0ee6983e121525fbe4b5f5f8fd996faa9a018f8e366b3f036f295ddafb46df; // Storage slot for vault data
    address constant UNISWAP_V2_ROUTER_02_ADDRESS =
        0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe; // Uniswap router address
    IGasTank gasTank; // Gas tank for managing gas fees
    uint32 constant VAULT_CHAIN_ID = 7001; // ZetaChain testnet chain ID
    uint256 crossChainTxId; // Cross-chain transaction ID tracker

    /// @notice Modifier to restrict access to the ZetaChain Gateway.
    modifier onlyGateway() {
        if (msg.sender != _GATEWAY_ADDRESS) revert OnlyGateway();
        _;
    }

    struct VaultStorage {
        address strategyAddress; // Address of the strategy contract
        address treasury; // Address of the treasury for fees
        uint16 perfFee; // Performance fee rate (in basis points)
        uint256 totalPrincipal; // Total principal amount
        mapping(address => uint256) userPrincipal; // Principal per user
    }

    /// @notice Retrieves the vault storage using the predefined slot.
    function _getVaultStorage() private pure returns (VaultStorage storage $) {
        assembly {
            $.slot := VAULT_STORAGE_LOCATION
        }
    }

    /// @notice Gets the address of the strategy used by the vault.
    /// @return The address of the strategy.
    function getStrategy() external view returns (address) {
        VaultStorage storage $ = _getVaultStorage();
        return $.strategyAddress;
    }

    /// @notice Gets the address of the treasury.
    /// @return The address of the treasury.
    function getTreasury() external view returns (address) {
        VaultStorage storage $ = _getVaultStorage();
        return $.treasury;
    }

    /// @notice Gets the current performance fee rate.
    /// @return The performance fee rate (in basis points).
    function getPerfFee() external view returns (uint16) {
        VaultStorage storage $ = _getVaultStorage();
        return $.perfFee;
    }

    event StrategyUpdated(address indexed newStrategyAddress);
    event PerformanceFeePaid(address indexed user, uint256 amount);
    event PerformanceFeeUpdated(uint256 newFeeRate);
    event VaultInitialized(uint8 decimals, uint256 perfFee);
    event ContextDataRevert(RevertContext context);
    event WithdrawFromStrategy(
        address indexed user,
        uint256 amount,
        uint256 fee,
        uint256 shares
    );
    event ReturnFundsToUserSent(uint256 indexed crossChainTxId);
    event ReturnFundsToUserFailed(uint256 indexed crossChainTxId);

    /// @dev Disables initializers in the constructor for upgradeable contracts.
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the vault with its name, symbol, and configurations.
     * @dev This function is used in place of a constructor in upgradeable contracts.
     * @param name_ Name of the ERC20 token.
     * @param symbol_ Symbol of the ERC20 token.
     * @param asset_ Underlying asset of the vault.
     * @param treasury_ Address of the treasury.
     * @param perfFee_ Performance fee rate (in basis points).
     * @param system_contract_ Address of the ZetaChain system contract.
     * @param gasTank_ Address of the gas tank contract.
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        IERC20 asset_,
        address treasury_,
        uint16 perfFee_,
        address system_contract_,
        address gasTank_
    ) external initializer {
        if (treasury_ == address(0)) revert InvalidTreasuryAddress();
        __ERC20_init(name_, symbol_);
        __ERC4626_init(asset_);
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        VaultStorage storage $ = _getVaultStorage();
        $.treasury = treasury_;
        $.perfFee = perfFee_;
        systemContract = ISystem(system_contract_);
        gasTank = IGasTank(gasTank_);

        emit VaultInitialized(decimals(), perfFee_);
    }

    /**
     * @notice Authorizes upgrades for the contract.
     * @dev This function is restricted to the owner.
     * @param newImplementation Address of the new contract implementation.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

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
        if (context.sender == address(0)) revert CantBeZeroAddress();
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
     * @notice Sets the address of the strategy used by the vault.
     * @param _strategyAddress Address of the new strategy.
     */
    function setStrategy(address _strategyAddress) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (_strategyAddress == address(0)) revert InvalidStrategyAddress();
        $.strategyAddress = _strategyAddress;
        emit StrategyUpdated(_strategyAddress);
    }

    /**
     * @notice Updates the treasury address.
     * @param _treasury Address of the new treasury.
     */
    function updateTreasuryAddress(address _treasury) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (_treasury == address(0)) revert InvalidTreasuryAddress();
        $.treasury = _treasury;
    }

    /**
     * @notice Sets the performance fee rate.
     * @param newFeeRate New performance fee rate (in basis points).
     */
    function setPerformanceFee(uint16 newFeeRate) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (newFeeRate > 2000) revert FeeExceedsLimit();
        $.perfFee = newFeeRate;
        emit PerformanceFeeUpdated(newFeeRate);
    }

    /**
     * @notice Sets the gas tank contract address.
     * @param newGasTank Address of the new gas tank contract.
     */
    function setGasTank(address newGasTank) external onlyOwner {
        if (newGasTank == address(0)) revert CantBeZeroAddress();
        gasTank = IGasTank(newGasTank);
    }

    /**
     * @notice Switches the strategy used by the vault.
     * @param newStrategyAddress Address of the new strategy.
     */
    function switchStrategy(address newStrategyAddress) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (newStrategyAddress == address(0)) revert InvalidStrategyAddress();
        if (newStrategyAddress == $.strategyAddress)
            revert InvalidStrategyAddress();

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

        emit StrategyUpdated(newStrategyAddress);
    }

    /**
     * @notice Emergency withdraws an ERC20 token from the vault.
     * @param _token Address of the token to withdraw.
     */
    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance == 0) revert NothingToWithdraw();
        SafeERC20.safeTransfer(IERC20(_token), owner(), balance);
    }

    /**
     * @notice Gets the total assets managed by the vault.
     * @return The total assets in the vault and strategy combined.
     */
    function totalAssets() public view virtual override returns (uint256) {
        VaultStorage storage $ = _getVaultStorage();
        uint256 assetBalanceOnVault = IERC20(asset()).balanceOf(address(this));
        uint256 assetBalanceInStrategy = IStrategy($.strategyAddress)
            .totalUnderlyingAssets();
        return assetBalanceOnVault + assetBalanceInStrategy;
    }

    /**
     * @notice Applies performance fees to the given amount of assets.
     * @param user The address of the user withdrawing the assets.
     * @param assets The total amount of assets to withdraw.
     * @return feeToWithdraw The calculated fee to withdraw.
     */
    function _applyFee(
        address user,
        uint256 assets
    ) internal view returns (uint256 feeToWithdraw) {
        VaultStorage storage $ = _getVaultStorage();
        uint256 principal = $.userPrincipal[user];
        uint256 totalUserAssets = convertToAssets(balanceOf(user));
        uint256 principalWithdrawn;
        uint256 profit;
        uint256 fee;

        if (totalUserAssets > principal) {
            profit = totalUserAssets - principal;

            fee = (profit * $.perfFee) / (10000 - $.perfFee);

            principalWithdrawn = (assets * principal) / totalUserAssets;
            uint256 profitWithdrawn = assets - principalWithdrawn;

            feeToWithdraw =
                (profit * $.perfFee * profitWithdrawn) /
                (profit * (10000 - $.perfFee));
        } else {
            principalWithdrawn = assets;
            feeToWithdraw = 0;
        }
    }

    /**
     * @notice Converts the given asset amount to shares.
     * @param assets The amount of assets to convert.
     * @param rounding Specifies rounding direction in case of precision loss.
     * @return shares The equivalent amount of shares.
     */
    function _convertToShares(
        uint256 assets,
        Math.Rounding rounding
    ) internal view override returns (uint256 shares) {
        if (totalSupply() == 0) {
            return assets;
        }
        VaultStorage storage $ = _getVaultStorage();
        uint256 totalSupplyWithOffset = totalSupply() + 10 ** _decimalsOffset();
        uint256 totalAssetsWithFee = totalAssets() + 1;

        // Incorporate fee logic only if totalAssets exceeds totalPrincipal
        if (totalAssets() > $.totalPrincipal) {
            totalAssetsWithFee -=
                ((totalAssets() - $.totalPrincipal) * $.perfFee) /
                10000;
        }

        return
            assets.mulDiv(totalSupplyWithOffset, totalAssetsWithFee, rounding);
    }

    /**
     * @notice Converts the given share amount to assets.
     * @param shares The amount of shares to convert.
     * @param rounding Specifies rounding direction in case of precision loss.
     * @return assets The equivalent amount of assets.
     */
    function _convertToAssets(
        uint256 shares,
        Math.Rounding rounding
    ) internal view override returns (uint256 assets) {
        if (totalSupply() == 0) {
            return shares;
        }
        VaultStorage storage $ = _getVaultStorage();
        uint256 totalSupplyWithOffset = totalSupply() + 10 ** _decimalsOffset();
        uint256 totalAssetsWithFee = totalAssets() + 1;

        // Incorporate fee logic only if totalAssets exceeds totalPrincipal
        if (totalAssets() > $.totalPrincipal) {
            totalAssetsWithFee -=
                ((totalAssets() - $.totalPrincipal) * $.perfFee) /
                10000;
        }

        return
            shares.mulDiv(totalAssetsWithFee, totalSupplyWithOffset, rounding);
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

    /**
     * @notice Handles deposits coming from a connected chain.
     * @param receiver The address receiving the shares.
     * @param assets The amount of assets deposited.
     * @param zrc20source The ZRC20 token address from the connected chain.
     */
    function _depositComingFromConnectedChain(
        address receiver,
        uint256 assets,
        address zrc20source
    ) internal {
        uint256 maxAssets = maxDeposit(receiver);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxDeposit(receiver, assets, maxAssets);
        }

        VaultStorage storage $ = _getVaultStorage();

        uint256 outputAmount = assets;
        uint256 minAmountOut = 0; // TODO: Control for slippage in production
        if (zrc20source != address(asset())) {
            outputAmount = SwapHelperLib.swapExactTokensForTokens(
                UNISWAP_V2_ROUTER_02_ADDRESS,
                systemContract.uniswapv2FactoryAddress(),
                zrc20source,
                assets,
                asset(),
                minAmountOut,
                address(this),
                200
            );
        }
        uint256 shares = previewDeposit(outputAmount);
        $.userPrincipal[receiver] += outputAmount;
        $.totalPrincipal += outputAmount;
        _mint(receiver, shares);

        bool success = IERC20(asset()).approve($.strategyAddress, outputAmount);
        if (!success) revert ApprovalFailed();
        IStrategy($.strategyAddress).invest(outputAmount);
        emit Deposit(address(0), receiver, outputAmount, shares);
    }

    /**
     * @notice Handles withdrawals and redemption of shares.
     * @param caller The address initiating the withdrawal.
     * @param receiver The address receiving the withdrawn assets.
     * @param user The address of the user whose assets are being withdrawn.
     * @param assets The amount of assets to withdraw.
     * @param shares The amount of shares to redeem.
     */
    function _withdraw(
        address caller,
        address receiver,
        address user,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (caller != user) {
            _spendAllowance(user, caller, shares);
        }
        uint256 feeToWithdraw = _applyFee(user, assets);
        uint256 withdrawnAmt = _divestZetachainStrategy(
            assets,
            feeToWithdraw,
            user,
            shares
        );
        SafeERC20.safeTransfer(IERC20(asset()), receiver, assets);
        emit Withdraw(
            caller,
            receiver,
            user,
            withdrawnAmt - feeToWithdraw,
            shares
        );
    }

    /**
     * @notice Handles withdrawals coming from a connected chain.
     * @param user The address of the user withdrawing the assets.
     * @param withdrawZRC20 The ZRC20 token address to withdraw.
     * @param assets The amount of assets to withdraw.
     * @param userChainId The chain ID of the connected chain.
     */
    function _withdrawComingFromConnectedChain(
        address user,
        address withdrawZRC20,
        uint256 assets,
        uint32 userChainId
    ) internal {
        uint256 maxAssets = maxWithdraw(user);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxWithdraw(user, assets, maxAssets);
        }

        uint256 shares = previewWithdraw(assets);
        uint256 feeToWithdraw = _applyFee(user, assets);
        _divestZetachainStrategy(assets, feeToWithdraw, user, shares);
        _confirmWithdrawAndBurn(
            user,
            withdrawZRC20,
            assets,
            feeToWithdraw,
            userChainId
        );
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
     * @notice Confirms the withdrawal of assets and burns shares.
     * @param userAddress The address of the user withdrawing assets.
     * @param withdrawZRC20 The ZRC20 token address for withdrawal.
     * @param amount The amount of assets being withdrawn.
     * @param fee The fee applied for the withdrawal.
     * @param userChainId The chain ID of the user's connected chain.
     */
    function _confirmWithdrawAndBurn(
        address userAddress,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 userChainId
    ) internal {
        VaultStorage storage $ = _getVaultStorage();
        if (fee > 0) {
            emit PerformanceFeePaid(userAddress, fee);
            SafeERC20.safeTransfer(IERC20(address(asset())), $.treasury, fee);
        }

        uint256 principalWithdrawn = (amount * $.userPrincipal[userAddress]) /
            convertToAssets(balanceOf(userAddress));

        $.userPrincipal[userAddress] -= principalWithdrawn;
        $.totalPrincipal -= principalWithdrawn;

        uint256 shares = previewWithdraw(amount);

        _burn(userAddress, shares);

        uint256 outputAmount = _returnFundsToUser(
            amount,
            userChainId,
            userAddress,
            withdrawZRC20
        );

        emit Withdraw(
            userAddress,
            userAddress,
            userAddress,
            outputAmount,
            shares
        );
    }

    /**
     * @notice Transfers funds back to the user, either on the current chain or a connected chain.
     * @param amount The amount of funds to return to the user.
     * @param userChainId The chain ID of the user's connected chain.
     * @param userAddress The address of the user receiving the funds.
     * @param withdrawZRC20 The ZRC20 token address for withdrawal.
     * @return outputAmount The actual amount returned to the user.
     */
    function _returnFundsToUser(
        uint256 amount,
        uint32 userChainId,
        address userAddress,
        address withdrawZRC20
    ) internal returns (uint256 outputAmount) {
        outputAmount = amount;

        if (userChainId == VAULT_CHAIN_ID) {
            SafeERC20.safeTransfer(IERC20(asset()), userAddress, outputAmount);
        } else {
            bytes memory recipient = abi.encodePacked(userAddress);

            RevertOptions memory revertOptions = RevertOptions(
                address(this), // revert address
                true, // callOnRevert
                address(this), // abortAddress
                abi.encode("_returnFundsToUserFailed", crossChainTxId),
                uint256(0) // onRevertGasLimit
            );

            uint256 minAmountOut = 0; // TODO: Control for slippage

            if (address(asset()) != withdrawZRC20) {
                outputAmount = SwapHelperLib.swapExactTokensForTokens(
                    UNISWAP_V2_ROUTER_02_ADDRESS,
                    systemContract.uniswapv2FactoryAddress(),
                    address(asset()),
                    amount,
                    withdrawZRC20,
                    minAmountOut,
                    address(this),
                    200
                );
            }
            (address gas_zrc20, uint256 gasFeeForWithdraw) = IZRC20(
                withdrawZRC20
            ).withdrawGasFee(); // ZRC-20 gas token and withdrawal fee

            gasTank.getGas{gas: 200000}(gas_zrc20, gasFeeForWithdraw);

            if (gas_zrc20 != withdrawZRC20) {
                IZRC20(withdrawZRC20).approve(_GATEWAY_ADDRESS, outputAmount);
                IZRC20(gas_zrc20).approve(_GATEWAY_ADDRESS, gasFeeForWithdraw);
            } else {
                IZRC20(withdrawZRC20).approve(
                    _GATEWAY_ADDRESS,
                    outputAmount + gasFeeForWithdraw
                );
            }

            IGatewayZEVM(_GATEWAY_ADDRESS).withdraw(
                recipient, // User's address in EVM format
                outputAmount, // Amount to withdraw
                withdrawZRC20,
                revertOptions
            );
            emit ReturnFundsToUserSent(crossChainTxId);
            crossChainTxId++;
        }
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
