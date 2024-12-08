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

// The asset that we set here should be the ZRC20 equivalent of the input token to the strategy on the target chain
// This makes logical sense in that it is the underlying asset that the strategy is investing
// It wouldn't make sense to make it the ZRC20 equivalent of the input token deposited, because this could be from any connected chain (or ZC itself)

contract AmanaConnectedChainVault is
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
    error NothingToWithdraw();
    error InvalidZRC20Address();
    error CantBeZeroAddress();
    error DepositExceedsLimit();
    error MintExceedsLimit();
    error WithdrawExceedsLimit();
    error RedeemExceedsLimit();
    error ConfirmationAlreadyProcessed();
    error OnlyGateway();

    address constant _GATEWAY_ADDRESS =
        0x6c533f7fE93fAE114d0954697069Df33C9B74fD7;
    ISystem systemContract; // 0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B on testnet
    bytes32 private constant VaultStorageLocation =
        0x1a0ee6983e121525fbe4b5f5f8fd996faa9a018f8e366b3f036f295ddafb46df;
    address constant uniswapv2Router02Address =
        0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe;
    uint16 internal constant MAX_DEADLINE = 200;
    IGasTank gasTank;
    uint32 constant vaultChainId = 7001; // 7000 for mainnet, 7001 for testnet
    uint256 crossChainTxId;
    uint256 latestTotalAssetsUpdateFromStrategy;
    uint256 lastProcessedNonce;

    struct Confirmation {
        address user;
        address withdrawZRC20;
        uint256 amount;
        uint256 fee;
        uint32 withdrawChainId;
        bool isDeposit;
        uint256 totalAssetsBefore;
        uint256 totalAssetsAfter;
    }

    mapping(uint256 => Confirmation) pendingConfirmations; // Buffer for out-of-order confirmations

    modifier onlyGateway() {
        if (msg.sender != _GATEWAY_ADDRESS) revert OnlyGateway();
        _;
    }

    struct VaultStorage {
        address strategyAddress;
        uint32 strategyChainId;
        address treasury;
        uint16 perfFee;
        uint256 totalPrincipal;
        mapping(address => uint256) userPrincipal;
    }

    function _getVaultStorage() private pure returns (VaultStorage storage $) {
        assembly {
            $.slot := VaultStorageLocation
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
    event ContextDataRevert(RevertContext);
    event WithdrawFromStrategy(
        address indexed user,
        uint256 amount,
        uint256 fee,
        uint256 shares
    );
    event CrossChainInvestSent(uint256 indexed crossChainTxId);
    event CrossChainInvestFailed(uint256 indexed crossChainTxId);
    event DivestSent(uint256 indexed crossChainTxId);
    event DivestFailed(uint256 indexed crossChainTxId);
    event ReturnFundsToUserSent(uint256 indexed crossChainTxId);
    event ReturnFundsToUserFailed(uint256 indexed crossChainTxId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializer function to replace the constructor in upgradeable contracts.
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
     * @dev UUPS upgrade authorization
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external override onlyGateway {
        VaultStorage storage $ = _getVaultStorage();
        if (context.sender == $.strategyAddress) {
            (
                address userAddress,
                address withdrawZRC20,
                uint256 withdrawAmount,
                uint256 fee,
                uint32 withdrawChainId,
                bool isDeposit,
                uint256 totalAssetsBefore,
                uint256 totalAssetsAfter,
                uint256 executionNonce
            ) = abi.decode(
                    message,
                    (
                        address,
                        address,
                        uint256,
                        uint256,
                        uint32,
                        bool,
                        uint256,
                        uint256,
                        uint256
                    )
                );
            _processConfirmationFromStrategy(
                userAddress,
                withdrawZRC20,
                withdrawAmount,
                fee,
                withdrawChainId,
                isDeposit,
                totalAssetsBefore,
                totalAssetsAfter,
                executionNonce
            );
        } else {
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
    }

    function _processConfirmationFromStrategy(
        address userAddress,
        address withdrawZRC20,
        uint256 withdrawAmount,
        uint256 fee,
        uint32 withdrawChainId,
        bool isDeposit,
        uint256 totalAssetsBefore,
        uint256 totalAssetsAfter,
        uint256 executionNonce
    ) internal {
        // Ensure no duplicate processing
        if (pendingConfirmations[executionNonce].user != address(0))
            revert ConfirmationAlreadyProcessed();
        // Store the confirmation in the buffer
        pendingConfirmations[executionNonce] = Confirmation({
            user: userAddress,
            withdrawZRC20: withdrawZRC20,
            amount: withdrawAmount,
            fee: fee,
            withdrawChainId: withdrawChainId,
            isDeposit: isDeposit,
            totalAssetsBefore: totalAssetsBefore,
            totalAssetsAfter: totalAssetsAfter
        });

        // Attempt to process confirmations
        _processBufferedConfirmations();
    }

    function _processBufferedConfirmations() internal {
        while (true) {
            uint256 nextNonce = lastProcessedNonce + 1;
            Confirmation memory confirmation = pendingConfirmations[nextNonce];

            // If there's no confirmation for the next nonce, stop processing
            if (confirmation.amount == 0) {
                break;
            }

            // Process the confirmation
            if (confirmation.isDeposit) {
                _confirmDepositAndMint(
                    confirmation.user,
                    confirmation.amount,
                    confirmation.totalAssetsBefore,
                    confirmation.totalAssetsAfter
                );
            } else {
                _confirmWithdrawAndBurn(
                    confirmation.user,
                    confirmation.withdrawZRC20,
                    confirmation.amount,
                    confirmation.fee,
                    confirmation.withdrawChainId,
                    confirmation.totalAssetsBefore,
                    confirmation.totalAssetsAfter
                );
            }
            // Mark this nonce as processed
            lastProcessedNonce = nextNonce;
            delete pendingConfirmations[nextNonce];
        }
    }

    function _confirmDepositAndMint(
        address user,
        uint256 depositAmount,
        uint256 totalAssetsBeforeDeposit,
        uint256 totalAssetsAfterDeposit
    ) internal {
        VaultStorage storage $ = _getVaultStorage();

        $.userPrincipal[user] += depositAmount;
        $.totalPrincipal += depositAmount;

        latestTotalAssetsUpdateFromStrategy = totalAssetsBeforeDeposit; // or calculate based on before/after

        uint256 shares = previewDeposit(depositAmount);
        _mint(user, shares);

        latestTotalAssetsUpdateFromStrategy = totalAssetsAfterDeposit; // or calculate based on before/after

        emit Deposit(address(0), user, depositAmount, shares);
    }

    function setStrategy(
        address _strategyAddress,
        uint32 _strategyChainId
    ) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (_strategyAddress == address(0)) revert InvalidStrategyAddress();
        if (_strategyChainId == 0) revert InvalidStrategyChainId();
        $.strategyAddress = _strategyAddress;
        $.strategyChainId = _strategyChainId;
        emit StrategyUpdated(_strategyAddress, _strategyChainId);
    }

    function updateTreasuryAddress(address _treasury) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (_treasury == address(0)) revert InvalidTreasuryAddress();
        $.treasury = _treasury;
    }

    function setPerformanceFee(uint16 newFeeRate) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (newFeeRate > 2000) revert FeeExceedsLimit();
        $.perfFee = newFeeRate;
        emit PerformanceFeeUpdated(newFeeRate);
    }

    function setGasTank(address newGasTank) external onlyOwner {
        if (newGasTank == address(0)) revert CantBeZeroAddress();
        gasTank = IGasTank(newGasTank);
    }

    function switchStrategy(
        address newStrategyAddress,
        uint32 newStrategyChainId
    ) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (newStrategyAddress == address(0)) revert InvalidStrategyAddress();
        if (newStrategyAddress == $.strategyAddress)
            revert InvalidStrategyAddress();
        if (newStrategyChainId == 0) revert InvalidStrategyChainId();
        if (newStrategyChainId != $.strategyChainId)
            revert InvalidStrategyChainId();

        _divestConnectedChainStrategy(
            address(this),
            address(asset()),
            totalAssets(),
            0,
            $.strategyChainId
        );
        $.strategyAddress = newStrategyAddress;
        //cross-chain invest in strategy
        _crossChainInvest(
            IERC20(asset()).balanceOf(address(this)),
            address(this),
            asset(),
            vaultChainId
        );

        emit StrategyUpdated(newStrategyAddress, newStrategyChainId);
    }

    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance == 0) revert NothingToWithdraw();
        SafeERC20.safeTransfer(IERC20(_token), owner(), balance);
    }

    /** @dev See {IERC4626-totalAssets}. */
    function totalAssets() public view virtual override returns (uint256) {
        // Get the amount of USDC held directly by the vault
        uint256 assetBalanceOnVault = IERC20(asset()).balanceOf(address(this));
        return assetBalanceOnVault + latestTotalAssetsUpdateFromStrategy;
    }

    function _crossChainInvest(
        uint256 amount,
        address userAddress,
        address userZRC20,
        uint32 userChainId
    ) internal {
        VaultStorage storage $ = _getVaultStorage();
        (address gas_zrc20, uint256 gasFeeForWithdraw) = IZRC20(
            address(asset())
        ).withdrawGasFee(); // ZRC-20 of the gas token of the chain the strategy is on, and the gas fee for the withdrawal

        uint256 gasLimitForCall = 350000; // bring this down as far as possible, as it doesn't get returned
        uint256 gasFeeForCall = systemContract.gasPriceByChainId(
            $.strategyChainId
        ) * gasLimitForCall;
        gasTank.getGas{gas: 200000}(
            gas_zrc20,
            gasFeeForWithdraw +
                systemContract.gasPriceByChainId($.strategyChainId) *
                gasLimitForCall
        );

        if (gas_zrc20 != address(asset())) {
            IZRC20(asset()).approve(_GATEWAY_ADDRESS, amount);
            IZRC20(gas_zrc20).approve(
                _GATEWAY_ADDRESS,
                gasFeeForWithdraw + gasFeeForCall
            );
        } else {
            IZRC20(asset()).approve(
                _GATEWAY_ADDRESS,
                amount + gasFeeForWithdraw + gasFeeForCall
            );
        }

        bytes memory recipient = abi.encodePacked($.strategyAddress);

        bytes memory outgoingMessage = abi.encode(
            userAddress,
            address(0),
            amount,
            0,
            0,
            true
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            true, // callOnRevert
            address(this), // abortAddress
            abi.encode(
                "_crossChainInvestFailed",
                crossChainTxId,
                userAddress,
                userZRC20,
                userChainId
            ),
            uint256(0) // onRevertGasLimit
        );

        CallOptions memory callOptions = CallOptions(gasLimitForCall, false);
        IGatewayZEVM(_GATEWAY_ADDRESS).withdrawAndCall(
            recipient, // this contains the recipient smart contract address - the strategy address in this case
            amount, // amount of zrc20 to withdraw
            address(asset()), // the zrc20 that is being withdrawn, also indicates which chain to target
            outgoingMessage, // this is the function call for invest(uint256 amount) in Mock4626Strategy
            callOptions,
            revertOptions
        );
        emit CrossChainInvestSent(crossChainTxId);
        crossChainTxId++;
    }

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
     * @dev Deposit/mint common workflow.
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256
    ) internal override {
        // If _asset is ERC777, `transferFrom` can trigger a reenterancy BEFORE the transfer happens through the
        // `tokensToSend` hook. On the other hand, the `tokenReceived` hook, that is triggered after the transfer,
        // calls the vault, which is assumed not malicious.
        //
        // Conclusion: we need to do the transfer before we mint so that any reentrancy would happen before the
        // assets are transferred and before the shares are minted, which is a valid state.
        // slither-disable-next-line reentrancy-no-eth

        SafeERC20.safeTransferFrom(
            IERC20(asset()),
            caller,
            address(this),
            assets
        );

        _crossChainInvest(assets, receiver, asset(), vaultChainId);
    }

    /**
     * @dev Deposit/mint common workflow.
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

        // If _asset is ERC777, `transferFrom` can trigger a reenterancy BEFORE the transfer happens through the
        // `tokensToSend` hook. On the other hand, the `tokenReceived` hook, that is triggered after the transfer,
        // calls the vault, which is assumed not malicious.
        //
        // Conclusion: we need to do the transfer before we mint so that any reentrancy would happen before the
        // assets are transferred and before the shares are minted, which is a valid state.
        // slither-disable-next-line reentrancy-no-eth

        uint256 outputAmount = assets;
        uint256 minAmountOut = 0; // TODO control for slippage in production
        if (zrc20source != address(asset())) {
            outputAmount = SwapHelperLib.swapExactTokensForTokens(
                uniswapv2Router02Address,
                systemContract.uniswapv2FactoryAddress(),
                zrc20source,
                assets,
                asset(),
                minAmountOut,
                address(this),
                200
            );
        }
        _crossChainInvest(
            outputAmount,
            receiver,
            zrc20source,
            uint32(IZRC20(zrc20source).CHAIN_ID())
        );
    }

    /**
     * @dev Withdraw/redeem common workflow.
     */
    function _withdraw(
        address caller,
        address,
        address user,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (caller != user) {
            // TODO - check this
            _spendAllowance(user, caller, shares);
        }
        uint256 feeToWithdraw = _applyFee(user, assets);

        _divestConnectedChainStrategy(
            user,
            asset(),
            assets,
            feeToWithdraw,
            vaultChainId
        );
    }

    /**
     * @dev Withdraw/redeem common workflow.
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
        // if (caller != user) { TODO - does this need to be here?
        //     _spendAllowance(user, caller, shares);
        // }
        uint256 feeToWithdraw = _applyFee(user, assets);

        _divestConnectedChainStrategy(
            user,
            withdrawZRC20,
            assets,
            feeToWithdraw,
            userChainId
        );
    }

    function _divestConnectedChainStrategy(
        address user,
        address withdrawZRC20,
        uint256 amount,
        uint256 feeToWithdraw,
        uint32 withdrawChainId
    ) internal {
        VaultStorage storage $ = _getVaultStorage();

        (address gas_zrc20, ) = IZRC20(address(asset())).withdrawGasFee(); // ZRC-20 of the gas token of the chain the strategy is on
        uint256 gasPrice = systemContract.gasPriceByChainId($.strategyChainId);
        uint256 gasLimitForCall = 350000; // TODO bring this down as much as possible, not returned

        uint256 gasFeeForCall = gasPrice * gasLimitForCall;

        gasTank.getGas{gas: 200000}(gas_zrc20, gasFeeForCall); // TODO reduce this?

        IZRC20(gas_zrc20).approve(_GATEWAY_ADDRESS, gasFeeForCall);

        bytes memory recipient = abi.encodePacked($.strategyAddress);

        bytes memory outgoingMessage = abi.encode(
            user,
            withdrawZRC20,
            amount,
            feeToWithdraw,
            withdrawChainId,
            false
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            true, // callOnRevert
            address(this), // abortAddress
            abi.encode(
                "_divestConnectedChainStrategyFailed",
                crossChainTxId,
                user,
                withdrawZRC20,
                withdrawChainId
            ),
            uint256(0) // onRevertGasLimit - NA on ZEVM
        );

        CallOptions memory callOptions = CallOptions(gasLimitForCall, false);
        IGatewayZEVM(_GATEWAY_ADDRESS).call(
            recipient,
            address(asset()),
            outgoingMessage,
            callOptions,
            revertOptions
        );
        emit DivestSent(crossChainTxId);
        crossChainTxId++;
    }

    function _confirmWithdrawAndBurn(
        address userAddress,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 userChainId,
        uint256 totalAssetsBeforeWithdraw,
        uint256 totalAssetsAfterWithdraw
    ) internal {
        VaultStorage storage $ = _getVaultStorage();

        if (totalAssetsBeforeWithdraw > 0)
            latestTotalAssetsUpdateFromStrategy = totalAssetsBeforeWithdraw;

        uint256 principalWithdrawn = (amount * $.userPrincipal[userAddress]) /
            convertToAssets(balanceOf(userAddress));

        $.userPrincipal[userAddress] -= principalWithdrawn;
        $.totalPrincipal -= principalWithdrawn;

        uint256 shares = previewWithdraw(amount);

        _burn(userAddress, shares);

        if (totalAssetsAfterWithdraw > 0)
            latestTotalAssetsUpdateFromStrategy = totalAssetsAfterWithdraw;

        uint256 outputAmount = _returnFundsToUser(
            amount,
            userChainId,
            userAddress,
            withdrawZRC20
        );

        if (fee > 0) {
            emit PerformanceFeePaid(userAddress, fee);
            SafeERC20.safeTransfer(IERC20(address(asset())), $.treasury, fee);
        }

        emit Withdraw( //TODO - check for return funds confirmation (cc tx back from userChain)
            userAddress,
            userAddress,
            userAddress,
            outputAmount,
            shares
        );
    }

    function _returnFundsToUser(
        uint256 amount,
        uint32 userChainId,
        address userAddress,
        address withdrawZRC20
    ) internal returns (uint256 outputAmount) {
        outputAmount = amount;
        uint256 currentCrossChainTxId = crossChainTxId;
        crossChainTxId++;
        if (userChainId == vaultChainId) {
            SafeERC20.safeTransfer(IERC20(asset()), userAddress, outputAmount);
        } else {
            bytes memory recipient = abi.encodePacked(userAddress);

            RevertOptions memory revertOptions = RevertOptions(
                address(this), // revert address
                true, // callOnRevert
                address(this), // abortAddress
                abi.encode(
                    "_returnFundsToUserFailed",
                    currentCrossChainTxId,
                    userAddress,
                    withdrawZRC20,
                    userChainId
                ),
                uint256(0) // onRevertGasLimit
            );

            uint256 minAmountOut = 0; // TODO control for slippage

            if (address(asset()) != withdrawZRC20) {
                outputAmount = SwapHelperLib.swapExactTokensForTokens(
                    uniswapv2Router02Address,
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
            ).withdrawGasFee(); // ZRC-20 of the gas token of the chain the strategy is on

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
                recipient, // this has to be the address of the owner/user on the EVM
                outputAmount, // the amount that the strategy has sent back
                withdrawZRC20,
                revertOptions // do these need to be different from the revertOptions in deposit?
            );
            emit ReturnFundsToUserSent(currentCrossChainTxId);
        }
    }

    function onRevert(RevertContext calldata context) external override {
        (
            string memory revertMessage,
            uint256 _crossChainTxId,
            address userAddress,
            address userZRC20,
            uint32 userChainId
        ) = abi.decode(
                context.revertMessage,
                (string, uint256, address, address, uint32)
            );
        if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_crossChainInvestFailed"))
        ) {
            _returnFundsToUser(
                context.amount, // might have to deduct gas fee from this - how much does revert actually give back?
                userChainId,
                userAddress,
                userZRC20
            );
            emit CrossChainInvestFailed(_crossChainTxId);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_divestConnectedChainStrategyFailed"))
        ) {
            emit DivestFailed(_crossChainTxId);
        } else if (
            keccak256(bytes(revertMessage)) ==
            keccak256(bytes("_returnFundsToUserFailed"))
        ) {
            emit ReturnFundsToUserFailed(_crossChainTxId);
        } else {
            revert("Revert not handled");
        }
    }
}
