// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./ERC4626RewardsUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";

import "./interfaces/ISystem.sol";
import "./interfaces/IGasTank.sol";
import "./interfaces/IErrors.sol";

import "./libraries/SwapHelperLibEddy.sol";

/// @title Amana Connected Chain Vault
/// @notice A vault that interacts with ZetaChain-connected strategies
/// @dev Implements ERC4626 with custom cross-chain functionality
abstract contract AmanaVaultBase is
    ERC4626RewardsUpgradeable,
    UUPSUpgradeable,
    UniversalContract,
    Revertable,
    IErrors
{
    using SafeERC20 for IERC20;
    using Math for uint256;

    // Constants
    address constant _GATEWAY_ADDRESS =
        0x6c533f7fE93fAE114d0954697069Df33C9B74fD7; // 0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E;
    address constant _SYSTEM_ADDRESS =
        0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B; // 0x91d18e54DAf4F677cB28167158d6dd21F6aB3921;

    // Variables
    address public strategyAddress;
    address public treasury;
    address public withdrawalReceiver;
    uint16 public perfFee;
    uint256 internal totalPrincipal;
    mapping(address => uint256) internal userPrincipal;
    IGasTank gasTank;
    uint32 public gasLimitForWithdrawAndCall; // this is used in two places - for investing into the strategy and returning funds to the user
    uint32 public gasLimitForCall; // this is used in two places - for the switchStrategy function (divest and invest) and for a call to divest

    modifier onlyGateway() {
        if (msg.sender != _GATEWAY_ADDRESS) revert OnlyGateway();
        _;
    }

    event StrategyUpdated(address indexed newStrategyAddress);
    event PerformanceFeePaid(address indexed user, uint256 amount);
    event PerformanceFeeUpdated(uint256 newFeeRate);
    event VaultInitialized(uint8 decimals, uint256 perfFee);
    event ContextDataRevert(RevertContext context);

    event ReturnFundsToUserSent(bytes32 indexed crossChainTxId);
    event ReturnFundsToUserFailed(bytes32 indexed crossChainTxId);

    event Deposited(
        address indexed user,
        uint256 amount,
        uint256 shares,
        bytes32 indexed crossChainTxId
    );
    event Withdrawn(
        address indexed user,
        address indexed receiver,
        uint256 amount,
        uint256 shares,
        bytes32 indexed crossChainTxId
    );

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
     * @param gasTank_ Gas tank contract address.
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        IERC20 asset_,
        address treasury_,
        uint16 perfFee_,
        address gasTank_,
        address withdrawalReceiver_,
        uint32 gasLimitForWithdrawAndCall_,
        uint32 gasLimitForCall_
    ) external initializer {
        if (treasury_ == address(0)) revert InvalidTreasuryAddress();
        __ERC20_init(name_, symbol_);
        __ERC4626_init(asset_);
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        treasury = treasury_;
        perfFee = perfFee_;
        totalPrincipal = 1; // preset to 1 virtual asset to avoid division by zero, align with totalAssets
        gasTank = IGasTank(gasTank_);
        withdrawalReceiver = withdrawalReceiver_;
        gasLimitForWithdrawAndCall = gasLimitForWithdrawAndCall_;
        gasLimitForCall = gasLimitForCall_;
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
     * @notice Emits a `StrategyUpdated` event upon success.
     */
    function setStrategy(address _strategyAddress) external onlyOwner {
        if (
            strategyAddress != address(0) || _strategyAddress == strategyAddress
        ) revert StrategyAlreadySet();
        if (_strategyAddress == address(0)) revert InvalidStrategyAddress();
        strategyAddress = _strategyAddress;
        emit StrategyUpdated(_strategyAddress);
    }

    /**
     * @dev Updates the treasury address for the vault. Can only be called by the owner.
     * @param _treasury The address of the new treasury.
     * @notice Reverts if the treasury address is zero.
     */
    function updateTreasuryAddress(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert InvalidTreasuryAddress();
        treasury = _treasury;
    }

    /**
     * @dev Updates the withdrawalReceiver address for the vault. Can only be called by the owner.
     * @param _withdrawalReceiver The address of the new withdrawalReceiver.
     * @notice Reverts if the withdrawalReceiver address is zero.
     */
    function updateWithdrawalReceiverAddress(
        address _withdrawalReceiver
    ) external onlyOwner {
        if (_withdrawalReceiver == address(0)) revert InvalidAddress();
        withdrawalReceiver = _withdrawalReceiver;
    }

    /**
     * @dev Updates the performance fee rate for the vault. Can only be called by the owner.
     * @param newFeeRate The new performance fee rate, expressed in basis points.
     * @notice Reverts if the fee rate exceeds 2000 basis points (20%).
     * @notice Emits a `PerformanceFeeUpdated` event upon success.
     */
    function setPerformanceFee(uint16 newFeeRate) external onlyOwner {
        if (newFeeRate > 2000) revert FeeExceedsLimit();
        perfFee = newFeeRate;
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
     * @dev Sets the gas limit for the withdraw and call function. Can only be called by the owner.
     * @dev This needs to be set as low as possible to avoid wasting gas
     * @dev This may change depending on the complexity of the strategy's invest function
     * @param newGasLimit The new gas limit for the withdraw and call function
     */
    function setGasLimitForWithdrawAndCall(
        uint32 newGasLimit
    ) external onlyOwner {
        gasLimitForWithdrawAndCall = newGasLimit;
    }

    /**
     * @dev Sets the gas limit for the call function to initiate a withdrawal from the strategy or a strategy switch. Can only be called by the owner.
     * @dev This needs to be set as low as possible to avoid wasting gas
     * @dev This may change depending on the complexity of the strategy's divest function (and invest function on switch)
     * @param newGasLimit The new gas limit for the cross chain call
     */
    function setGasLimitForCall(uint32 newGasLimit) external onlyOwner {
        gasLimitForCall = newGasLimit;
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
        uint256 totalSupplyWithOffset = totalSupply() + 10 ** _decimalsOffset();
        uint256 totalAssetsMinusFeePortion = totalAssets();

        // Incorporate fee logic only if totalAssets exceeds totalPrincipal
        if (totalAssets() > totalPrincipal) {
            totalAssetsMinusFeePortion -=
                ((totalAssets() - totalPrincipal) * perfFee) /
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
        uint256 totalSupplyWithOffset = totalSupply() + 10 ** _decimalsOffset();
        uint256 totalAssetsMinusFeePortion = totalAssets();

        // Incorporate fee logic only if totalAssets exceeds totalPrincipal
        if (totalAssets() > totalPrincipal) {
            totalAssetsMinusFeePortion -=
                ((totalAssets() - totalPrincipal) * perfFee) /
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
        uint256 userChainId,
        uint256 assets,
        address zrc20source,
        address erc20source,
        uint16 slippage,
        bytes32 crossChainTxId
    ) internal {
        uint256 maxAssets = maxDeposit(receiver);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxDeposit(receiver, assets, maxAssets);
        }
        if (zrc20source == address(0)) {
            zrc20source = ISystem(_SYSTEM_ADDRESS).gasCoinZRC20ByChainId(
                userChainId
            );
        }
        uint256 outputAmount = assets;
        if (zrc20source != address(asset())) {
            outputAmount = SwapHelperLibEddy.swapExactTokensForTokens(
                zrc20source,
                assets,
                address(asset()),
                slippage,
                address(this),
                200
            );
        }
        _investAssets(
            outputAmount,
            receiver,
            zrc20source,
            erc20source,
            uint32(IZRC20(zrc20source).CHAIN_ID()),
            crossChainTxId
        );
    }

    function _investAssets(
        uint256 amount,
        address receiver,
        address zrc20source,
        address erc20source,
        uint32 userChainId,
        bytes32 crossChainTxId
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
        address withdrawERC20,
        uint256 assets,
        uint32 userChainId,
        uint16 slippage,
        bytes32 crossChainTxId
    ) internal virtual;

    /**
     * @dev Returns funds to the user, either on the same chain or a connected chain.
     * @param amount The amount of assets to return to the user.
     * @param userChainId The chain ID of the user's chain.
     * @param receiver The address of the user receiving the funds.
     * @param withdrawZRC20 The ZRC20 token address representing the withdrawal asset.
     * @return outputAmount The actual amount of assets returned to the user after potential swaps.
     * @notice Handles cross-chain transfers or same-chain asset transfers. Manages gas fees and token approvals.
     */
    function _returnFundsToUser(
        uint256 amount,
        uint32 userChainId,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        bytes32 _crossChainTxId,
        uint16 slippage
    ) internal returns (uint256 outputAmount) {
        outputAmount = amount;

        if (userChainId == uint32(block.chainid)) {
            // Same-chain transfer
            SafeERC20.safeTransfer(IERC20(asset()), receiver, outputAmount);
        } else {
            // Cross-chain transfer
            bytes memory recipient = abi.encodePacked(withdrawalReceiver);

            RevertOptions memory revertOptions = RevertOptions(
                address(this), // revert address
                true, // callOnRevert
                address(this), // abortAddress
                abi.encode(
                    "_returnFundsToUserFailed",
                    _crossChainTxId,
                    receiver,
                    withdrawZRC20,
                    withdrawERC20,
                    userChainId
                ),
                uint256(0) // onRevertGasLimit
            );

            if (address(asset()) != withdrawZRC20) {
                // Swap assets if needed
                outputAmount = SwapHelperLibEddy.swapExactTokensForTokens(
                    address(asset()),
                    amount,
                    withdrawZRC20,
                    slippage,
                    address(this),
                    200
                );
            }

            (address gas_zrc20, uint256 gasFee) = IZRC20(withdrawZRC20)
                .withdrawGasFeeWithGasLimit(gasLimitForWithdrawAndCall); // ZRC-20 of the gas token of the chain the strategy is on, and the gas fee for the withdrawal

            gasTank.getGas{gas: 200000}(gas_zrc20, gasFee);

            if (gas_zrc20 != withdrawZRC20) {
                IZRC20(withdrawZRC20).approve(_GATEWAY_ADDRESS, outputAmount);
                IZRC20(gas_zrc20).approve(_GATEWAY_ADDRESS, gasFee);
            } else {
                IZRC20(withdrawZRC20).approve(
                    _GATEWAY_ADDRESS,
                    outputAmount + gasFee
                );
            }

            bytes memory outgoingMessage = abi.encode(
                receiver, // the user the funds have to go to
                withdrawERC20, // the token on the target chain that the user receives (can be native)
                outputAmount, // amount to be sent
                _crossChainTxId
            );

            CallOptions memory callOptions = CallOptions(
                gasLimitForWithdrawAndCall,
                false
            );

            IGatewayZEVM(_GATEWAY_ADDRESS).withdrawAndCall(
                recipient,
                outputAmount,
                withdrawZRC20,
                outgoingMessage,
                callOptions,
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
