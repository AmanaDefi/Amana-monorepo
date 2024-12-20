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
import "hardhat/console.sol";

/// @title Amana Connected Chain Vault
/// @notice A vault that interacts with ZetaChain-connected strategies
/// @dev Implements ERC4626 with custom cross-chain functionality
abstract contract AmanaVaultBase is
    ERC4626RewardsUpgradeable,
    UUPSUpgradeable,
    UniversalContract,
    Revertable
{
    using SafeERC20 for IERC20;
    using Math for uint256;

    error InvalidStrategyAddress();
    error InvalidStrategyChainId();
    error InvalidTreasuryAddress();
    error FeeExceedsLimit();
    error ApprovalFailed();
    error DepositCantBeZero();
    error WithdrawCantBeZero();
    error NothingToWithdraw();
    error InvalidZRC20Address();
    error CantBeZeroAddress();
    error DepositExceedsLimit();
    error MintExceedsLimit();
    error WithdrawExceedsLimit();
    error RedeemExceedsLimit();
    error ConfirmationAlreadyProcessed();
    error OnlyGateway();
    error StrategyAlreadySet();

    // Constants
    address constant _GATEWAY_ADDRESS =
        0x6c533f7fE93fAE114d0954697069Df33C9B74fD7;
    bytes32 internal constant VAULT_STORAGE_LOCATION =
        0x1a0ee6983e121525fbe4b5f5f8fd996faa9a018f8e366b3f036f295ddafb46df;
    address constant UNISWAP_V2_ROUTER_02_ADDRESS =
        0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe;
    uint32 constant VAULT_CHAIN_ID = 7001; // 7000 for mainnet, 7001 for testnet
    uint256 public constant GAS_LIMIT_FOR_CALL = 350000; // bring this down as far as possible, as it doesn't get returned
    uint256 public constant GAS_LIMIT_FOR_WITHDRAW_AND_CALL = 350000; // bring this down as far as possible, as it doesn't get returned

    uint256 crossChainTxId;

    ISystem systemContract; // 0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B on testnet
    IGasTank gasTank;

    struct VaultStorage {
        address strategyAddress;
        uint32 strategyChainId;
        address treasury;
        uint16 perfFee;
        uint256 totalPrincipal;
        mapping(address => uint256) userPrincipal;
    }

    // Buffer for out-of-order confirmations

    modifier onlyGateway() {
        if (msg.sender != _GATEWAY_ADDRESS) revert OnlyGateway();
        _;
    }

    function _getVaultStorage() internal pure returns (VaultStorage storage $) {
        assembly {
            $.slot := VAULT_STORAGE_LOCATION
        }
    }

    function getStrategy() external view returns (address, uint32) {
        VaultStorage storage $ = _getVaultStorage();
        return ($.strategyAddress, $.strategyChainId);
    }

    function getTreasury() external view returns (address) {
        VaultStorage storage $ = _getVaultStorage();
        return $.treasury;
    }

    function getPerfFee() external view returns (uint16) {
        VaultStorage storage $ = _getVaultStorage();
        return $.perfFee;
    }

    event StrategyUpdated(
        address indexed newStrategyAddress,
        uint32 newStrategyChainId
    );
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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the vault contract.
     * @param name_ Name of the vault token.
     * @param symbol_ Symbol of the vault token.
     * @param asset_ The underlying asset for the vault.
     * @param treasury_ Treasury address for performance fees.
     * @param perfFee_ Performance fee rate.
     * @param system_contract_ System contract address.
     * @param gasTank_ Gas tank contract address.
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
        $.totalPrincipal = 1; // preset to 1 virtual asset to avoid division by zero, align with totalAssets
        systemContract = ISystem(system_contract_);
        gasTank = IGasTank(gasTank_);
        crossChainTxId = 1; // Initialize to 1 to avoid zero value (reserved for asset update)
        emit VaultInitialized(decimals(), perfFee_);
    }

    /**
     * @dev Authorizes an upgrade for the contract. Restricted to the owner.
     * @param newImplementation Address of the new implementation contract.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    /**
     * @dev Handles cross-chain communication via the gateway.
     * @param context Message context including origin and sender.
     * @param zrc20 ZRC20 token involved in the call.
     * @param amount Amount of ZRC20 tokens involved.
     * @param message Encoded message for further processing.
     */
    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external virtual override;

    /**
     * @dev Sets the strategy for the vault. Can only be called by the owner.
     * @param _strategyAddress The address of the new strategy.
     * @param _strategyChainId The chain ID of the new strategy.
     * @notice Emits a `StrategyUpdated` event upon success.
     */
    function setStrategy(
        address _strategyAddress,
        uint32 _strategyChainId
    ) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (
            $.strategyAddress != address(0) ||
            _strategyAddress == $.strategyAddress
        ) revert StrategyAlreadySet();
        if (_strategyAddress == address(0)) revert InvalidStrategyAddress();
        if (_strategyChainId == 0) revert InvalidStrategyChainId();
        $.strategyAddress = _strategyAddress;
        $.strategyChainId = _strategyChainId;
        emit StrategyUpdated(_strategyAddress, _strategyChainId);
    }

    /**
     * @dev Updates the treasury address for the vault. Can only be called by the owner.
     * @param _treasury The address of the new treasury.
     * @notice Reverts if the treasury address is zero.
     */
    function updateTreasuryAddress(address _treasury) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (_treasury == address(0)) revert InvalidTreasuryAddress();
        $.treasury = _treasury;
    }

    /**
     * @dev Updates the performance fee rate for the vault. Can only be called by the owner.
     * @param newFeeRate The new performance fee rate, expressed in basis points.
     * @notice Reverts if the fee rate exceeds 2000 basis points (20%).
     * @notice Emits a `PerformanceFeeUpdated` event upon success.
     */
    function setPerformanceFee(uint16 newFeeRate) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (newFeeRate > 2000) revert FeeExceedsLimit();
        $.perfFee = newFeeRate;
        emit PerformanceFeeUpdated(newFeeRate);
    }

    /**
     * @dev Sets the gas tank address for the vault. Can only be called by the owner.
     * @param newGasTank The address of the new gas tank.
     * @notice Reverts if the gas tank address is zero.
     */
    function setGasTank(address newGasTank) external onlyOwner {
        if (newGasTank == address(0)) revert CantBeZeroAddress();
        gasTank = IGasTank(newGasTank);
    }

    /**
     * @dev Switches the strategy of the vault. Can only be called by the owner.
     *      Divests from the current strategy and invests in the new one.
     * @param newStrategyAddress The address of the new strategy.
     * @notice Reverts if the new strategy address is invalid or unchanged.
     * @notice Emits a `StrategyUpdated` event upon success.
     */
    function switchStrategy(address newStrategyAddress) external virtual;

    /**
     * @dev Allows the owner to withdraw all of a specified token from the vault in case of an emergency.
     * @param _token The address of the token to withdraw.
     * @notice Reverts if the vault has no balance of the specified token.
     */
    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance == 0) revert NothingToWithdraw();
        SafeERC20.safeTransfer(IERC20(_token), owner(), balance);
    }

    /**
     * @dev Returns the total assets currently held by the vault, including assets directly held
     *      and the latest update from the strategy's total assets.
     * @return The total amount of assets held by the vault.
     * @notice Overrides the {IERC4626-totalAssets} function.
     */
    function totalAssets() public view virtual override returns (uint256) {}

    /**
     * @dev Calculates the performance fee to be applied for withdrawing a specified amount of assets.
     *      The fee is calculated on the user's profit and deducted from the withdrawal amount.
     * @param user The address of the user making the withdrawal.
     * @param assets The amount of assets the user intends to withdraw.
     * @return feeToWithdraw The calculated performance fee to be deducted from the withdrawal.
     * @notice Reverts if the total user assets are zero, as it implies no shares exist.
     */
    function _applyFee(
        address user,
        uint256 assets
    ) internal view returns (uint256 feeToWithdraw) {
        uint256 totalUserAssets = convertToAssets(balanceOf(user));
        uint256 totalUserAssetsWithFee = (balanceOf(user) * totalAssets()) /
            (totalSupply() + 1);
        uint256 totalFeeOwing = totalUserAssetsWithFee - totalUserAssets;
        feeToWithdraw = (totalFeeOwing * assets) / totalUserAssetsWithFee;
    }

    /**
     * @dev Internal conversion function (from assets to shares) with support for rounding direction.
     *
     * Will revert if assets > 0, totalSupply > 0 and totalAssets = 0. That corresponds to a case where any asset
     * would represent an infinite amount of shares.
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
        uint256 totalAssetsMinusFeePortion = totalAssets();

        // Incorporate fee logic only if totalAssets exceeds totalPrincipal
        if (totalAssets() > $.totalPrincipal) {
            totalAssetsMinusFeePortion -=
                ((totalAssets() - $.totalPrincipal) * $.perfFee) /
                10000;
        }

        return
            assets.mulDiv(
                totalSupplyWithOffset,
                totalAssetsMinusFeePortion,
                rounding
            );
    }

    /**
     * @dev Internal conversion function (from shares to assets) with support for rounding direction.
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
        uint256 totalAssetsMinusFeePortion = totalAssets();

        // Incorporate fee logic only if totalAssets exceeds totalPrincipal
        if (totalAssets() > $.totalPrincipal) {
            totalAssetsMinusFeePortion -=
                ((totalAssets() - $.totalPrincipal) * $.perfFee) /
                10000;
        }

        return
            shares.mulDiv(
                totalAssetsMinusFeePortion,
                totalSupplyWithOffset,
                rounding
            );
    }

    /**
     * @dev Handles the deposit of assets into the vault and initiates cross-chain investment.
     * @param caller The address of the user initiating the deposit.
     * @param receiver The address of the user receiving the shares.
     * @param assets The amount of assets to deposit.
     * @notice Uses SafeERC20 to transfer assets to the vault and triggers cross-chain investment.
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256
    ) internal virtual override {}

    /**
     * @dev Handles deposits from a connected chain, processes swaps if necessary, and initiates cross-chain investment.
     * @param receiver The address of the user receiving the shares.
     * @param assets The amount of assets received from the connected chain.
     * @param zrc20source The ZRC20 token address representing the assets being deposited.
     * @notice Performs token swaps if the ZRC20 source token differs from the vault's asset.
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

        uint256 outputAmount = assets;
        uint256 minAmountOut = 0; // TODO: Implement slippage control in production
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
        _investAssets(
            outputAmount,
            receiver,
            zrc20source,
            uint32(IZRC20(zrc20source).CHAIN_ID())
        );
    }

    function _investAssets(
        uint256 amount,
        address receiver,
        address zrc20source,
        uint32 userChainId
    ) internal virtual;

    /**
     * @dev Withdrawn/redeem common workflow. Handles user withdrawal requests and initiates divestment from the strategy.
     * @param caller The address of the entity initiating the withdrawal.
     * @param user The address of the user receiving the withdrawn assets.
     * @param assets The amount of assets being withdrawn.
     * @param shares The number of shares being redeemed for the withdrawal.
     * @notice Ensures proper allowance checks and calculates fees before initiating strategy divestment.
     */
    function _withdraw(
        address caller,
        address,
        address user,
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

        _divestFromStrategy(user, asset(), assets, feeToWithdraw, shares, 0); // TODO put chain here?
    }

    function _divestFromStrategy(
        address user,
        address withdrawZRC20,
        uint256 amount,
        uint256 feeToWithdraw,
        uint256 shares,
        uint32 userChainId
    ) internal virtual;

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
    ) internal {
        if (assets == 0) {
            revert WithdrawCantBeZero();
        }
        uint256 maxAssets = maxWithdraw(user);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxWithdraw(user, assets, maxAssets);
        }
        uint256 feeToWithdraw = _applyFee(user, assets);

        _divestFromStrategy(
            user,
            withdrawZRC20,
            assets,
            feeToWithdraw,
            0, // TODO put shares here?
            userChainId
        );
    }

    /**
     * @dev Returns funds to the user, either on the same chain or a connected chain.
     * @param amount The amount of assets to return to the user.
     * @param userChainId The chain ID of the user's chain.
     * @param userAddress The address of the user receiving the funds.
     * @param withdrawZRC20 The ZRC20 token address representing the withdrawal asset.
     * @return outputAmount The actual amount of assets returned to the user after potential swaps.
     * @notice Handles cross-chain transfers or same-chain asset transfers. Manages gas fees and token approvals.
     */
    function _returnFundsToUser(
        uint256 amount,
        uint32 userChainId,
        address userAddress,
        address withdrawZRC20,
        uint256 _crossChainTxId
    ) internal returns (uint256 outputAmount) {
        outputAmount = amount;

        if (userChainId == VAULT_CHAIN_ID) {
            // Same-chain transfer
            SafeERC20.safeTransfer(IERC20(asset()), userAddress, outputAmount);
        } else {
            // Cross-chain transfer
            bytes memory recipient = abi.encodePacked(userAddress);

            RevertOptions memory revertOptions = RevertOptions(
                address(this), // revert address
                true, // callOnRevert
                address(this), // abortAddress
                abi.encode(
                    "_returnFundsToUserFailed",
                    _crossChainTxId,
                    userAddress,
                    withdrawZRC20,
                    userChainId
                ),
                uint256(0) // onRevertGasLimit
            );

            uint256 minAmountOut = 0; // TODO: Control for slippage in production

            if (address(asset()) != withdrawZRC20) {
                // Swap assets if needed
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
            ).withdrawGasFeeWithGasLimit(IZRC20(withdrawZRC20).GAS_LIMIT()); // ZRC-20 of the gas token of the chain the strategy is on

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
                recipient,
                outputAmount,
                withdrawZRC20,
                revertOptions
            );

            emit ReturnFundsToUserSent(_crossChainTxId);
        }
    }

    /**
     * @dev Handles revert scenarios during cross-chain operations.
     * @param context The revert context containing details about the revert scenario.
     * @notice Executes appropriate recovery steps based on the revert message.
     */
    function onRevert(RevertContext calldata context) external virtual override;
}
