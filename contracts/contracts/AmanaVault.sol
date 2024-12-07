// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./ERC4626RewardsUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";

import "./interfaces/ISystem.sol";
import "./interfaces/IStrategy.sol";
import "./interfaces/IGasTank.sol";

import "./libraries/SwapHelperLib.sol";

// The asset that we set here should be the ZRC20 equivalent of the input token to the strategy on the target chain
// This makes logical sense in that it is the underlying asset that the strategy is investing
// It wouldn't make sense to make it the ZRC20 equivalent of the input token deposited, because this could be from any connected chain (or ZC itself)

contract AmanaVault is
    ERC4626RewardsUpgradeable,
    UUPSUpgradeable,
    UniversalContract
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

    address public _GATEWAY_ADDRESS; // 0x6c533f7fe93fae114d0954697069df33c9b74fd7 on testnet
    ISystem public systemContract; // 0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B on testnet
    bytes32 private constant VaultStorageLocation =
        0x1a0ee6983e121525fbe4b5f5f8fd996faa9a018f8e366b3f036f295ddafb46df;
    address uniswapv2Router02Address; // 0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe on testnet
    uint16 internal constant MAX_DEADLINE = 200;
    address public WZETA_ADDRESS; // 0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf on testnet
    IGasTank public gasTank;
    uint32 private vaultChainId; // 7000 for mainnet, 7001 for testnet

    uint256 public nonceCounter;

    struct Operation {
        address user;
        address withdrawZRC20;
        uint256 amount;
        uint256 fee;
        uint32 withdrawChainId;
        bool isDeposit;
    }

    mapping(uint256 => Operation) public pendingOperations;

    mapping(uint256 => bool) public processedConfirmations;

    uint256 public lastProcessedOperation;
    
    struct Confirmation {
        uint256 totalAssetsBefore;
        uint256 totalAssetsAfter;
    }
    mapping(uint256 => Confirmation) public pendingConfirmations;

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
        address gateway_,
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
        _GATEWAY_ADDRESS = gateway_;
        systemContract = ISystem(system_contract_);
        uniswapv2Router02Address = systemContract.uniswapv2Router02Address();
        WZETA_ADDRESS = systemContract.wZetaContractAddress();
        gasTank = IGasTank(gasTank_);
        vaultChainId = uint32(block.chainid);
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
    ) external override {
        (
            address withdrawZRC20,
            uint256 withdrawAmount,
            uint256 nonce,
            uint256 totalAssetsAfter,
            uint32 withdrawChainId
        ) = abi.decode(message, (address, address, uint256, uint256, uint256));
        VaultStorage storage $ = _getVaultStorage();
        if (amount == 0 && context.sender != $.strategyAddress) {
            _withdrawFromConnectedChain(
                context.sender,
                withdrawZRC20,
                withdrawAmount,
                withdrawChainId
            );
        } else if (context.sender == $.strategyAddress) {
            _processConfirmation(withdrawAmount, nonce, totalAssetsAfter);
        } else {
            // incoming deposit from another chain - will handle deposit to strat on ZC or other
            if (context.sender == address(0)) revert CantBeZeroAddress();
            _depositFromConnectedChain(context.sender, amount, zrc20);
        }
    }

    function _processConfirmation(
        address userAddress,
        address withdrawZRC20,
        uint256 withdrawAmount,
        uint256 fee,
        uint256 nonce,
        uint256 totalAssetsAfter
    ) internal {
        // Ensure no duplicate processing
        require(
            pendingConfirmations[nonce].totalAssetsBefore == 0,
            "Confirmation already exists"
        );

        // Store the confirmation
        pendingConfirmations[nonce] = Confirmation({
            totalAssetsBefore: totalAssetsAfter - withdrawAmount - fee, // TODO check this
            totalAssetsAfter: totalAssetsAfter
        });

        // Try processing confirmations in order
        _processBufferedConfirmations();
    }

    function _processBufferedConfirmations() internal {
        while (true) {
            uint256 nextOperation = lastProcessedOperation + 1;
            Confirmation memory confirmation = pendingConfirmations[
                nextOperation
            ];

            if (confirmation.totalAssetsBefore == 0) {
                // Break if no confirmation is available for the next operation
                break;
            }

            // Retrieve the operation associated with this nonce
            Operation memory operation = pendingOperations[nextOperation];
            if (operation.isDeposit) {
                _confirmDepositAndMint(operation.user, operation.amount, operation.); // do we need to add totalAsetsAfter to operation?
            } else {
                _returnFundsToUser(
                    operation.user,
                    operation.withdrawZRC20,
                    operation.amount,
                    operation.fee,
                    operation.withdrawChainId
                );
            }

            // Update the last processed operation and clean up
            lastProcessedOperation = nextOperation;
            delete pendingConfirmations[nextOperation];
            delete pendingOperations[nextOperation];
        }
    }

    function _confirmDepositAndMint(
        address user,
        uint256 depositAmount,
        uint256 totalAssetsAfterDeposit
    ) internal {
        uint256 newTotalAssets = totalAssetsAfterDeposit; // or calculate based on before/after

        VaultStorage storage $ = _getVaultStorage();
        updateTotalAssets(totalAssetsAfterDeposit);

        uint256 shares = previewDeposit(
            totalAssetsAfterDeposit - depositAmount
        ); // but shares could have changed in the mean time?
        _mint(user, shares);
        emit Deposit(address(0), user, depositAmount, shares);
    }

    function updateTotalAssets(uint256 latestTotalAssets) internal {
        // can we put in a check here to see if totalassets should be updated?
        // it can't just be if latestTotalAssets > totalAssets, because the strategy could have withdrawn some assets
        VaultStorage storage $ = _getVaultStorage();
        $.totalAssets = latestTotalAssets;
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

        if ($.strategyChainId == vaultChainId) {
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
            //cross-chain withdraw from strategy
            _divestConnectedChainStrategy(
                address(this),
                address(asset()),
                totalAssets(), // TODO - complete this function
                0,
                0,
                $.strategyChainId
            );
            $.strategyAddress = newStrategyAddress;
            //cross-chain invest in strategy
            _crossChainInvest(IERC20(asset()).balanceOf(address(this)));
        }

        emit StrategyUpdated(newStrategyAddress, newStrategyChainId);
    }

    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance == 0) revert NothingToWithdraw();
        SafeERC20.safeTransfer(IERC20(_token), owner(), balance);
    }

    /** @dev See {IERC4626-totalAssets}. */
    function totalAssets() public view virtual override returns (uint256) {
        VaultStorage storage $ = _getVaultStorage();
        // Get the amount of USDC held directly by the vault
        uint256 assetBalanceOnVault = IERC20(asset()).balanceOf(address(this));
        uint256 assetBalanceInStrategy;
        // Call the strategy to get the equivalent value of aArbUSDC in terms of USDC
        if ($.strategyChainId == vaultChainId) {
            assetBalanceInStrategy = IStrategy($.strategyAddress)
                .totalUnderlyingAssets();
            // Return the total assets: USDC held in the vault + USDC equivalent held in the strategy
            return assetBalanceOnVault + assetBalanceInStrategy;
        } else {
            assetBalanceInStrategy = $.totalPrincipal; // note - this is a temporary solution
            // TODO - update this part of the function to calculate value of assets on a different chain
            // OR update totalAssets on every deposit or withdraw
            return assetBalanceOnVault + assetBalanceInStrategy;
        }
    }

    function _crossChainInvest(uint256 amount, address userAddress) internal {
        nonceCounter++;
        pendingOperations[nonceCounter] = Operation({
            userAddress: userAddress,
            withdrawZRC20: address(0),
            amount: amount,
            fee: 0,
            withdrawChainId: 0,
            isDeposit: false
        });

        VaultStorage storage $ = _getVaultStorage();
        (address gas_zrc20, uint256 gasFeeForWithdraw) = IZRC20(
            address(asset())
        ).withdrawGasFee(); // ZRC-20 of the gas token of the chain the strategy is on, and the gas fee for the withdrawal

        uint256 gasLimitForCall = 350000; // bring this down as far as possible, as it doesn't get returned
        uint256 gasPrice = systemContract.gasPriceByChainId($.strategyChainId);
        uint256 gasFeeForCall = gasPrice * gasLimitForCall;
        gasTank.getGas{gas: 200000}(
            gas_zrc20,
            gasFeeForWithdraw + gasFeeForCall
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
            address(0),
            amount,
            0,
            0,
            nonceCounter
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            false, // callOnRevert
            address(this), // abortAddress
            bytes("WithdrawAndCall Failed"),
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
    }

    function _applyFee(
        address user,
        uint256 assets
    ) internal returns (uint256 feeToWithdraw) {
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

            $.userPrincipal[user] -= principalWithdrawn;
        } else {
            principalWithdrawn = assets;
            feeToWithdraw = 0;
            $.userPrincipal[user] -= principalWithdrawn;
        }

        $.totalPrincipal -= principalWithdrawn;
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
        uint256 shares
    ) internal override {
        VaultStorage storage $ = _getVaultStorage();
        // If _asset is ERC777, `transferFrom` can trigger a reenterancy BEFORE the transfer happens through the
        // `tokensToSend` hook. On the other hand, the `tokenReceived` hook, that is triggered after the transfer,
        // calls the vault, which is assumed not malicious.
        //
        // Conclusion: we need to do the transfer before we mint so that any reentrancy would happen before the
        // assets are transferred and before the shares are minted, which is a valid state.
        // slither-disable-next-line reentrancy-no-eth
        $.userPrincipal[receiver] += assets;
        $.totalPrincipal += assets;

        SafeERC20.safeTransferFrom(
            IERC20(asset()),
            caller,
            address(this),
            assets
        );
        _mint(receiver, shares);

        if ($.strategyChainId == vaultChainId) {
            bool success = IERC20(asset()).approve($.strategyAddress, assets);
            if (!success) revert ApprovalFailed();
            IStrategy($.strategyAddress).invest(assets);
        } else {
            _crossChainInvest(assets);
        }

        emit Deposit(caller, receiver, assets, shares);
    }

    /**
     * @dev Deposit/mint common workflow.
     */
    function _depositFromConnectedChain(
        address receiver,
        uint256 assets,
        address zrc20source
    ) internal {
        uint256 maxAssets = maxDeposit(receiver);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxDeposit(receiver, assets, maxAssets);
        }

        VaultStorage storage $ = _getVaultStorage();
        // If _asset is ERC777, `transferFrom` can trigger a reenterancy BEFORE the transfer happens through the
        // `tokensToSend` hook. On the other hand, the `tokenReceived` hook, that is triggered after the transfer,
        // calls the vault, which is assumed not malicious.
        //
        // Conclusion: we need to do the transfer before we mint so that any reentrancy would happen before the
        // assets are transferred and before the shares are minted, which is a valid state.
        // slither-disable-next-line reentrancy-no-eth
        $.userPrincipal[receiver] += assets;
        $.totalPrincipal += assets;

        if ($.strategyChainId == vaultChainId) {
            uint256 shares = previewDeposit(assets);
            _mint(receiver, shares);

            bool success = IERC20(asset()).approve($.strategyAddress, assets);
            if (!success) revert ApprovalFailed();
            IStrategy($.strategyAddress).invest(assets);
            emit Deposit(address(0), receiver, assets, shares); // why address(0) here?
        } else {
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
            _crossChainInvest(outputAmount);
        }
        // return shares; - this is now missing from the original deposit function that used to be called by the cross chain function - is it needed?
    }

    /**
     * @dev Withdraw/redeem common workflow.
     */
    function _withdraw(
        address caller,
        address receiver,
        address user,
        uint256 assets,
        uint256 shares
    ) internal override {
        VaultStorage storage $ = _getVaultStorage();
        if (caller != user) {
            _spendAllowance(user, caller, shares);
        }
        uint256 feeToWithdraw = _applyFee(user, assets);
        if ($.strategyChainId == vaultChainId) {
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
        } else {
            _divestConnectedChainStrategy(
                user,
                asset(),
                assets,
                feeToWithdraw,
                shares,
                vaultChainId
            );
        }
    }

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
        // If _asset is ERC777, `transfer` can trigger a reentrancy AFTER the transfer happens through the
        // `tokensReceived` hook. On the other hand, the `tokensToSend` hook, that is triggered before the transfer,
        // calls the vault, which is assumed not malicious.
        //
        // Conclusion: we need to do the transfer after the burn so that any reentrancy would happen after the
        // shares are burned and after the assets are transferred, which is a valid state.
        _burn(user, shares);
        return withdrawnAmt;
    }

    /**
     * @dev Withdraw/redeem common workflow.
     */
    function _withdrawFromConnectedChain(
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

        VaultStorage storage $ = _getVaultStorage();
        // if (caller != user) { TODO - does this need to be here?
        //     _spendAllowance(user, caller, shares);
        // }
        uint256 feeToWithdraw = _applyFee(user, assets);
        if ($.strategyChainId == vaultChainId) {
            _divestZetachainStrategy(assets, feeToWithdraw, user, shares);
            _returnFundsToUser(
                user,
                withdrawZRC20,
                assets,
                feeToWithdraw,
                shares,
                userChainId
            );
        } else {
            _divestConnectedChainStrategy(
                user,
                withdrawZRC20,
                assets,
                feeToWithdraw,
                shares,
                userChainId
            );
        }
    }

    function _divestConnectedChainStrategy(
        address user,
        address withdrawZRC20,
        uint256 amount,
        uint256 feeToWithdraw,
        uint256 shares,
        uint32 userChainId
    ) internal {
        nonceCounter++;
        pendingOperations[nonceCounter] = Operation({
            userAddress: user,
            withdrawZRC20: withdrawZRC20,
            amount: amount,
            fee: feeToWithdraw,
            withdrawChainId: userChainId,
            isDeposit: false
        });

        VaultStorage storage $ = _getVaultStorage();

        (address gas_zrc20, ) = IZRC20(address(asset())).withdrawGasFee(); // ZRC-20 of the gas token of the chain the strategy is on
        uint256 gasPrice = systemContract.gasPriceByChainId($.strategyChainId);
        uint256 gasLimitForCall = 350000; // TODO bring this down as much as possible, not returned

        uint256 gasFeeForCall = gasPrice * gasLimitForCall;

        gasTank.getGas{gas: 200000}(gas_zrc20, gasFeeForCall); // TODO reduce this?

        IZRC20(gas_zrc20).approve(_GATEWAY_ADDRESS, gasFeeForCall);

        bytes memory recipient = abi.encodePacked($.strategyAddress);

        bytes memory outgoingMessage = abi.encode(
            withdrawZRC20,
            amount + feeToWithdraw,
            nonceCounter,
            0, // totalAssetsPlaceHolder
            userChainId
        );

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            false, // callOnRevert
            address(this), // abortAddress
            bytes("Call to Strategy Failed"),
            uint256(0) // onRevertGasLimit
        );

        CallOptions memory callOptions = CallOptions(gasLimitForCall, false);
        IGatewayZEVM(_GATEWAY_ADDRESS).call(
            recipient,
            address(asset()),
            outgoingMessage,
            callOptions,
            revertOptions
        );
    }

    function _returnFundsToUser(
        address userAddress,
        address withdrawZRC20,
        uint256 amount,
        uint256 fee,
        uint32 userChainId
    ) internal {
        VaultStorage storage $ = _getVaultStorage();
        if (fee > 0) {
            emit PerformanceFeePaid(userAddress, fee);
            SafeERC20.safeTransfer(IERC20(address(asset())), $.treasury, fee); // TODO - a better way to do this?
        }
        uint256 shares = previewWithdraw(amount);
        _burn(userAddress, shares);
        uint256 outputAmount = amount;

        if (userChainId == vaultChainId) {
            SafeERC20.safeTransfer(IERC20(asset()), userAddress, outputAmount);
        } else {
            bytes memory recipient = abi.encodePacked(userAddress);

            RevertOptions memory revertOptions = RevertOptions(
                address(this), // revert address
                false, // callOnRevert
                address(this), // abortAddress
                bytes("Withdraw to User Failed"),
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
        }
        emit Withdraw(
            userAddress,
            userAddress,
            userAddress,
            outputAmount,
            shares
        );
    }
}
