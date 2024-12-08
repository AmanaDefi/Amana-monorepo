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

contract AmanaZetachainVault is
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
    error ConfirmationAlreadyProcessed();
    error OnlyGateway();

    address constant _GATEWAY_ADDRESS =
        0x6c533f7fE93fAE114d0954697069Df33C9B74fD7;
    ISystem systemContract; // 0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B on testnet
    bytes32 private constant VaultStorageLocation =
        0x1a0ee6983e121525fbe4b5f5f8fd996faa9a018f8e366b3f036f295ddafb46df;
    address constant uniswapv2Router02Address =
        0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe;
    IGasTank gasTank;
    uint32 constant vaultChainId = 7001; // 7000 for mainnet, 7001 for testnet

    modifier onlyGateway() {
        if (msg.sender != _GATEWAY_ADDRESS) revert OnlyGateway();
        _;
    }

    struct VaultStorage {
        address strategyAddress;
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

    function getStrategy() external view returns (address) {
        VaultStorage storage $ = _getVaultStorage();
        return $.strategyAddress;
    }

    function getTreasury() external view returns (address) {
        VaultStorage storage $ = _getVaultStorage();
        return $.treasury;
    }

    function getPerfFee() external view returns (uint16) {
        VaultStorage storage $ = _getVaultStorage();
        return $.perfFee;
    }

    event StrategyUpdated(address indexed newStrategyAddress);
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
        if (context.sender == address(0)) revert CantBeZeroAddress();
        if (amount > 0) {
            if (zrc20 != asset()) revert InvalidZRC20Address();
            _depositComingFromConnectedChain(context.sender, amount);
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

    function setStrategy(address _strategyAddress) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (_strategyAddress == address(0)) revert InvalidStrategyAddress();
        $.strategyAddress = _strategyAddress;
        emit StrategyUpdated(_strategyAddress);
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
        assetBalanceInStrategy = IStrategy($.strategyAddress)
            .totalUnderlyingAssets();
        // Return the total assets: USDC held in the vault + USDC equivalent held in the strategy
        return assetBalanceOnVault + assetBalanceInStrategy;
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

        SafeERC20.safeTransferFrom(
            IERC20(asset()),
            caller,
            address(this),
            assets
        );

        $.userPrincipal[receiver] += assets;
        $.totalPrincipal += assets;
        _mint(receiver, shares);

        bool success = IERC20(asset()).approve($.strategyAddress, assets);
        if (!success) revert ApprovalFailed();
        IStrategy($.strategyAddress).invest(assets);
        emit Deposit(caller, receiver, assets, shares);
    }

    /**
     * @dev Deposit/mint common workflow.
     */
    function _depositComingFromConnectedChain(
        address receiver,
        uint256 assets
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
        uint256 shares = previewDeposit(assets);
        _mint(receiver, shares);

        bool success = IERC20(asset()).approve($.strategyAddress, assets);
        if (!success) revert ApprovalFailed();
        IStrategy($.strategyAddress).invest(assets);
        emit Deposit(address(0), receiver, assets, shares); // why address(0) here?
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

        uint256 shares = previewWithdraw(assets);

        // if (caller != user) { TODO - does this need to be here?
        //     _spendAllowance(user, caller, shares);
        // }
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

    function _returnFundsToUser(
        uint256 amount,
        uint32 userChainId,
        address userAddress,
        address withdrawZRC20
    ) internal returns (uint256 outputAmount) {
        outputAmount = amount;

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
    }
}
