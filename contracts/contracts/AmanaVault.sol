// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./ERC4626RewardsUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "./interfaces/ISystem.sol";
import "./interfaces/IStrategy.sol";
import "hardhat/console.sol";

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
        address gateway,
        address system_contract
    ) external initializer {
        if (treasury_ == address(0)) revert InvalidTreasuryAddress();
        __ERC20_init(name_, symbol_);
        __ERC4626_init(asset_);
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        VaultStorage storage $ = _getVaultStorage();
        $.treasury = treasury_;
        $.perfFee = perfFee_;
        _GATEWAY_ADDRESS = gateway;
        systemContract = ISystem(system_contract);
        uniswapv2Router02Address = systemContract.uniswapv2Router02Address();
        WZETA_ADDRESS = systemContract.wZetaContractAddress();
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
            address userAddress,
            uint256 withdrawAmount,
            uint256 fee,
            uint256 shares
        ) = abi.decode(message, (address, uint256, uint256, uint256));
        if (amount == 0) {
            _crossChainWithdrawToStrategy(userAddress, withdrawAmount);
        } else if (withdrawAmount == 1) {
            // this indicates that the strategy is sending assets back to the vault
            // we then send the amount back to the owner on the EVM in USDC
            _crossChainWithdrawToUser(userAddress, amount, fee, shares); // TODO does shares really need to be here?
        } else {
            if (userAddress == address(0)) revert CantBeZeroAddress();
            console.log("Depositing from another chain");
            _crossChainDeposit(userAddress, amount, zrc20); // _crossChainDeposit means from another chain - will handle deposit to strat on ZC or other
        }
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

    function switchStrategy(
        address newStrategyAddress,
        uint32 newStrategyChainId
    ) external onlyOwner {
        VaultStorage storage $ = _getVaultStorage();
        if (newStrategyAddress == address(0)) revert InvalidStrategyAddress();
        if (newStrategyAddress == $.strategyAddress)
            revert InvalidStrategyAddress();
        if (newStrategyChainId == 0) revert InvalidStrategyChainId();

        address oldStrategy = $.strategyAddress;
        uint32 oldStrategyChainId = $.strategyChainId;
        $.strategyAddress = newStrategyAddress;
        $.strategyChainId = newStrategyChainId;
        emit StrategyUpdated(newStrategyAddress, newStrategyChainId);

        // TODO - update this section to withdraw and invest in the new strategy - cross-chain or same chain
        uint256 strategyBalance = IStrategy(oldStrategy)
            .totalUnderlyingAssets();
        if (strategyBalance > 0) {
            IStrategy(oldStrategy).withdraw(strategyBalance, 10 ** 27);
        }

        uint256 vaultBalance = IZRC20(asset()).balanceOf(address(this));
        if (vaultBalance > 0) {
            bool success = IZRC20(asset()).approve(
                $.strategyAddress,
                vaultBalance
            );
            if (!success) revert ApprovalFailed();
            IStrategy($.strategyAddress).invest(vaultBalance);
        }
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
        if (block.chainid == $.strategyChainId) {
            // TODO - change block.chainid to the Zetachain chain id (7000 for mainnet, 7001 for testnet)
            assetBalanceInStrategy = IStrategy($.strategyAddress)
                .totalUnderlyingAssets();
            // Return the total assets: USDC held in the vault + USDC equivalent held in the strategy
            return assetBalanceOnVault + assetBalanceInStrategy;
        } else {
            assetBalanceInStrategy = $.totalPrincipal; // note - this is a temporary solution
            // TODO - update this part of the function to calculate value of assets on a different chain
            // This will have to be a cross chain call - accessing the totalUnderlyingAssets view function
            // uint256 gasLimit = 7000000; // could potentially reduce to 7000000

            // bytes memory recipient = abi.encodePacked($.strategyAddress);

            // bytes4 functionSelector = bytes4(
            //     keccak256(bytes("totalUnderlyingAssets()"))
            // );

            // bytes memory outgoingMessage = abi.encodePacked(functionSelector);

            // RevertOptions memory revertOptions = RevertOptions(
            //     0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690, // revert address
            //     false, // callOnRevert
            //     address(this), // abortAddress
            //     bytes("revert message"),
            //     uint256(30000000) // onRevertGasLimit
            // );

            // CallOptions memory callOptions = CallOptions(gasLimit, true);

            // this function (potentially) modifies state, so can't be used inside a view function
            // IGatewayZEVM(_GATEWAY_ADDRESS).call(
            //     recipient,
            //     address(asset()),
            //     outgoingMessage,
            //     callOptions,
            //     revertOptions
            // );
            return assetBalanceOnVault + assetBalanceInStrategy;
        }
    }

    function _crossChainInvest(uint256 amount) internal {
        VaultStorage storage $ = _getVaultStorage();
        (address gas_zrc20, ) = IZRC20(address(asset())).withdrawGasFee(); // ZRC-20 of the gas token of the chain the strategy is on
        IZRC20(gas_zrc20).approve(_GATEWAY_ADDRESS, type(uint256).max); // TODO bring this down to the same amount as gas limit * gas price

        uint256 gasLimit = 350000; // TODO could potentially reduce to 7000000
        if (gas_zrc20 != address(asset())) {
            IZRC20(asset()).approve(_GATEWAY_ADDRESS, amount);
        }

        bytes memory recipient = abi.encodePacked($.strategyAddress);

        bytes4 functionSelector = bytes4(keccak256(bytes("invest(uint256)")));
        bytes memory encodedArgs = abi.encode(amount);
        bytes memory outgoingMessage = abi.encodePacked(
            functionSelector,
            encodedArgs
        );

        RevertOptions memory revertOptions = RevertOptions(
            0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690, // revert address
            false, // callOnRevert
            address(this), // abortAddress
            bytes("revert message"),
            uint256(0) // onRevertGasLimit
        );

        CallOptions memory callOptions = CallOptions(gasLimit, true);
        console.log("Executing withdrawAndCall");
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

        if (block.chainid == $.strategyChainId) {
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
    function _crossChainDeposit(
        address receiver,
        uint256 assets,
        address zrc20source
    ) internal {
        uint256 maxAssets = maxDeposit(receiver);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxDeposit(receiver, assets, maxAssets);
        }

        uint256 shares = previewDeposit(assets);

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

        _mint(receiver, shares);

        if (block.chainid == $.strategyChainId) {
            console.log("Investing on ZC");
            bool success = IERC20(asset()).approve($.strategyAddress, assets);
            if (!success) revert ApprovalFailed();
            IStrategy($.strategyAddress).invest(assets);
        } else {
            uint256 outputAmount = assets;
            if (zrc20source != address(asset())) {
                console.log("swapping");
                outputAmount = swapExactTokensForTokens(
                    zrc20source,
                    assets,
                    address(asset()),
                    0 // minAmountOut? TODO - control for slippage here?
                );
            }
            _crossChainInvest(outputAmount);
        }
        emit Deposit(address(0), receiver, assets, shares); // TODO remove the 1st argument and create a new CrossChainDeposit event?
        // return shares; - this is now missing from the original deposit function that used to be called by the cross chain function - is it needed?
    }

    function swapExactTokensForTokens(
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint256 minAmountOut
    ) internal returns (uint256) {
        address[] memory path;
        path = new address[](2);
        path[0] = zrc20;
        path[1] = targetZRC20;

        // bool isSufficientLiquidity = _isSufficientLiquidity(
        //     systemContract.uniswapv2FactoryAddress(),
        //     amount,
        //     minAmountOut,
        //     path
        // );

        // bool isZETA = targetZRC20 == systemContract.wZetaContractAddress() ||
        //     zrc20 == systemContract.wZetaContractAddress();

        // if (!isSufficientLiquidity && !isZETA) {
        path = new address[](3);
        path[0] = zrc20;
        path[1] = WZETA_ADDRESS;
        path[2] = targetZRC20;
        // }

        IZRC20(zrc20).approve(address(uniswapv2Router02Address), amount);
        uint256[] memory amounts = IUniswapV2Router01(uniswapv2Router02Address)
            .swapExactTokensForTokens(
                amount,
                minAmountOut,
                path,
                address(this),
                block.timestamp + MAX_DEADLINE
            );
        return amounts[path.length - 1];
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
        if (block.chainid == $.strategyChainId) {
            // could make this if ($.strategyChainId == zetachain chain id) ?
            uint256 fractionToWithdraw = ((assets + feeToWithdraw) *
                (10 ** 27)) /
                totalAssets() +
                1;
            uint256 withdrawnAmt = IStrategy($.strategyAddress).withdraw(
                assets + feeToWithdraw,
                fractionToWithdraw
            );
            if (feeToWithdraw > 0) {
                emit PerformanceFeePaid(user, feeToWithdraw);
                SafeERC20.safeTransfer(
                    IERC20(asset()),
                    $.treasury,
                    feeToWithdraw
                );
            }
            // If _asset is ERC777, `transfer` can trigger a reentrancy AFTER the transfer happens through the
            // `tokensReceived` hook. On the other hand, the `tokensToSend` hook, that is triggered before the transfer,
            // calls the vault, which is assumed not malicious.
            //
            // Conclusion: we need to do the transfer after the burn so that any reentrancy would happen after the
            // shares are burned and after the assets are transferred, which is a valid state.
            _burn(user, shares);
            SafeERC20.safeTransfer(IERC20(asset()), receiver, assets);
            emit Withdraw(
                caller,
                receiver,
                user,
                withdrawnAmt - feeToWithdraw,
                shares
            );
        } else {
            (address gas_zrc20, ) = IZRC20(address(asset())).withdrawGasFee(); // ZRC-20 address of the gas token of the strategy chain
            IZRC20(gas_zrc20).approve(_GATEWAY_ADDRESS, type(uint256).max); // TODO bring this down to the same amount as gas limit * gas price
            uint256 gasLimit = 7000000; // could potentially reduce to 7000000

            bytes memory recipient = abi.encodePacked($.strategyAddress);

            bytes4 functionSelector = bytes4(
                keccak256(bytes("withdraw(address,uint256,uint256,uint256)"))
            );
            bytes memory encodedArgs = abi.encode(
                user,
                assets,
                feeToWithdraw,
                shares
            );
            bytes memory outgoingMessage = abi.encodePacked(
                functionSelector,
                encodedArgs
            );

            RevertOptions memory revertOptions = RevertOptions(
                0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690, // revert address
                false, // callOnRevert
                address(this), // abortAddress
                bytes("revert message"),
                uint256(30000000) // onRevertGasLimit
            );

            CallOptions memory callOptions = CallOptions(gasLimit, true);

            IGatewayZEVM(_GATEWAY_ADDRESS).call(
                recipient,
                address(asset()),
                outgoingMessage,
                callOptions,
                revertOptions
            );
        }
    }

    /**
     * @dev Withdraw/redeem common workflow.
     */
    function _crossChainWithdrawToStrategy(
        // address receiver, // Might this be needed later?
        address user,
        uint256 assets
    ) internal {
        uint256 maxAssets = maxWithdraw(user);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxWithdraw(user, assets, maxAssets);
        }

        uint256 shares = previewWithdraw(assets);

        //TODO this also needs to have the conditional depending on which chain the strategy is on
        VaultStorage storage $ = _getVaultStorage();
        // if (caller != user) {
        //     _spendAllowance(user, caller, shares);
        // }
        uint256 feeToWithdraw = _applyFee(user, assets);
        if (block.chainid == $.strategyChainId) {
            uint256 fractionToWithdraw = ((assets + feeToWithdraw) *
                (10 ** 27)) /
                totalAssets() +
                1;
            IStrategy($.strategyAddress).withdraw(
                assets + feeToWithdraw,
                fractionToWithdraw
            );
            emit WithdrawFromStrategy(user, assets, feeToWithdraw, shares);
            _crossChainWithdrawToUser(user, assets, feeToWithdraw, shares);
        } else {
            (address gas_zrc20, ) = IZRC20(address(asset())).withdrawGasFee(); // ZRC-20 address of the gas token of the strategy chain
            IZRC20(gas_zrc20).approve(_GATEWAY_ADDRESS, type(uint256).max); // TODO bring this down to the same amount as gas limit * gas price
            uint256 gasLimit = 7000000; // TODO could potentially reduce to 7000000

            bytes memory recipient = abi.encodePacked($.strategyAddress);

            bytes4 functionSelector = bytes4(
                keccak256(bytes("withdraw(address,uint256,uint256,uint256)"))
            );
            bytes memory encodedArgs = abi.encode(
                user,
                assets,
                feeToWithdraw,
                shares
            );
            bytes memory outgoingMessage = abi.encodePacked(
                functionSelector,
                encodedArgs
            );

            RevertOptions memory revertOptions = RevertOptions(
                0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690, // revert address
                false, // callOnRevert
                address(this), // abortAddress
                bytes("revert message"),
                uint256(30000000) // onRevertGasLimit
            );

            CallOptions memory callOptions = CallOptions(gasLimit, false);

            IGatewayZEVM(_GATEWAY_ADDRESS).call(
                recipient,
                address(asset()),
                outgoingMessage,
                callOptions,
                revertOptions
            );
            emit WithdrawFromStrategy(user, assets, feeToWithdraw, shares);
            console.log("shares: ", shares);
        }
        // return shares - do I still need this here (it's in the original withdraw external function)
    }

    function _crossChainWithdrawToUser(
        address userAddress,
        uint256 amount,
        uint256 fee,
        uint256 shares
    ) internal {
        VaultStorage storage $ = _getVaultStorage();
        if (fee > 0) {
            emit PerformanceFeePaid(userAddress, fee);
            SafeERC20.safeTransfer(IERC20(address(asset())), $.treasury, fee); // TODO - a better way to do this?
        }
        _burn(userAddress, shares);
        IZRC20(asset()).approve(_GATEWAY_ADDRESS, amount);

        bytes memory recipient = abi.encodePacked(userAddress);

        RevertOptions memory revertOptions = RevertOptions(
            0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690, // revert address
            false, // callOnRevert
            address(this), // abortAddress
            bytes("revert message"),
            uint256(30000000) // onRevertGasLimit
        );
        address equivalentTokenOnUserChain = 0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD; // TODO - this is ETH.BASESEPOLIA, but I need to find this dynamically
        // I think I can pass this through from when the user initiates the withdraw?
        uint256 outputAmount = amount;
        console.log("amount: ", amount);
        if (address(asset()) != equivalentTokenOnUserChain) {
            console.log("swapping");
            outputAmount = swapExactTokensForTokens(
                address(asset()),
                amount,
                equivalentTokenOnUserChain,
                0
            );
            console.log("outputAmount: ", outputAmount);
        }
        uint256 outputbalance = IZRC20(equivalentTokenOnUserChain).balanceOf(
            address(this)
        );
        console.log("outputbalance: ", outputbalance);
        bool success = IZRC20(equivalentTokenOnUserChain).approve(
            _GATEWAY_ADDRESS,
            outputAmount
        );
        if (!success) revert ApprovalFailed();
        // The withdraw here requires gas for the withdrawal, so I can't withdraw the full balance (or I have to add ETH_BASESEPOLIA to the vault)
        IGatewayZEVM(_GATEWAY_ADDRESS).withdraw(
            recipient, // this has to be the address of the owner/user on the EVM
            (outputAmount * 9) / 10, // the amount that the strategy has sent back
            equivalentTokenOnUserChain,
            revertOptions // do these need to be different from the revertOptions in deposit?
        );
        emit Withdraw(userAddress, userAddress, userAddress, amount, shares);
    }
}
