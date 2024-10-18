// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./ERC4626RewardsUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";
import "./interfaces/IStrategy.sol";

contract UpgradeableVault is
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

    bytes32 private constant VaultStorageLocation =
        0x1a0ee6983e121525fbe4b5f5f8fd996faa9a018f8e366b3f036f295ddafb46df;

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

    address constant _GATEWAY_ADDRESS =
        0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0;

    event StrategyUpdated(
        address indexed newStrategyAddress,
        uint32 newStrategyChainId
    );
    event PerformanceFeePaid(address indexed user, uint256 amount);
    event PerformanceFeeUpdated(uint256 newFeeRate);
    event VaultInitialized(uint8 decimals, uint256 perfFee);
    event ContextDataRevert(RevertContext);

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
        address strategyAddress_,
        uint32 strategyChainId_,
        address treasury_,
        uint16 perfFee_
    ) external initializer {
        if (treasury_ == address(0)) revert InvalidTreasuryAddress();
        __ERC20_init(name_, symbol_);
        __ERC4626_init(asset_);
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        VaultStorage storage $ = _getVaultStorage();
        $.treasury = treasury_;
        $.perfFee = perfFee_;
        $.strategyAddress = strategyAddress_;
        $.strategyChainId = strategyChainId_;

        emit VaultInitialized(decimals(), perfFee_);
    }

    /**
     * @dev UUPS upgrade authorization
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function onCrossChainCall(
        zContext calldata context,
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
            withdraw(withdrawAmount, userAddress, userAddress);
        } else if (withdrawAmount == 1) {
            // this indicates that the strategy is sending assets back to the vault
            // we then send the amount back to the owner on the EVM in USDC
            _withdrawPartTwo(userAddress, amount, fee, shares);
        } else {
            if (zrc20 != address(asset())) revert InvalidZRC20Address();
            if (userAddress == address(0)) revert CantBeZeroAddress();
            deposit(amount, userAddress);
        }
    }

    function onRevert(RevertContext calldata revertContext) external override {
        emit ContextDataRevert(revertContext);
    }

    function setStrategy(
        address _strategyAddress,
        uint16 _strategyChainId
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
            IStrategy(oldStrategy).withdraw(strategyBalance);
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
        uint256 usdcBalance = IERC20(asset()).balanceOf(address(this));
        uint256 strategyUSDCValue;
        // Call the strategy to get the equivalent value of aArbUSDC in terms of USDC
        if (block.chainid == $.strategyChainId) {
            strategyUSDCValue = IStrategy($.strategyAddress)
                .totalUnderlyingAssets();
            // Return the total assets: USDC held in the vault + USDC equivalent held in the strategy
            return usdcBalance + strategyUSDCValue;
        } else {
            // TODO - update this part of the function to calculate value of assets on a different chain
            // This will have to be a cross chain call - accessing the totalUnderlyingAssets view function
            return usdcBalance + strategyUSDCValue;
        }
    }

    function investAssets(uint256 amount) internal {
        // if (block.chainid == _getVaultStorage().strategyChainId) {
        //     _investAssets(amount);
        // } else {
        //     _crossChainInvest(amount);
        // }
        VaultStorage storage $ = _getVaultStorage();
        address gas_zrc20 = 0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe; // ZRC-20 ETH.ETH
        IZRC20(gas_zrc20).approve(_GATEWAY_ADDRESS, type(uint256).max);
        uint256 gasLimit = 30000000; // could potentially reduce to 7000000

        IZRC20(asset()).approve(_GATEWAY_ADDRESS, amount);

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
            uint256(30000000) // onRevertGasLimit
        );

        IGatewayZEVM(_GATEWAY_ADDRESS).withdrawAndCall(
            recipient, // this contains the recipient smart contract address
            amount, // amount of zrc20 to withdraw
            address(asset()), // the zrc20 that is being withdrawn, also indicates which chain to target
            outgoingMessage, // this is the function call for invest(uint256 amount) in Mock4626Strategy
            gasLimit,
            revertOptions
        );
    }

    function _applyFee(
        address user,
        uint256 assets
    ) internal returns (uint256 feeWithdrawn) {
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

            feeWithdrawn =
                (profit * $.perfFee * profitWithdrawn) /
                (profit * (10000 - $.perfFee));

            $.userPrincipal[user] -= principalWithdrawn;
        } else {
            principalWithdrawn = assets;
            feeWithdrawn = 0;
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

        _mint(receiver, shares);

        investAssets(assets);

        emit Deposit(caller, receiver, assets, shares);
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
        //TODO this also needs to have the conditional depending on which chain the strategy is on
        VaultStorage storage $ = _getVaultStorage();
        // if (caller != user) {
        //     _spendAllowance(user, caller, shares);
        // }
        uint256 feeWithdrawn = _applyFee(user, assets);

        address gas_zrc20 = 0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe; // ZRC-20 ETH.ETH - TODO in future this will have to indicate target chain dynamically
        IZRC20(gas_zrc20).approve(_GATEWAY_ADDRESS, type(uint256).max);
        uint256 gasLimit = 30000000; // could potentially reduce to 7000000

        bytes memory recipient = abi.encodePacked($.strategyAddress);

        bytes4 functionSelector = bytes4(
            keccak256(bytes("withdraw(address,uint256,uint256,uint256)"))
        );
        bytes memory encodedArgs = abi.encode(
            user,
            assets,
            feeWithdrawn,
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

        IGatewayZEVM(_GATEWAY_ADDRESS).call(
            recipient,
            address(asset()),
            outgoingMessage,
            gasLimit,
            revertOptions
        );
    }

    function _withdrawPartTwo(
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
        IGatewayZEVM(_GATEWAY_ADDRESS).withdraw(
            recipient, // this has to be the address of the owner/user on the EVM
            amount, // the amount that the strategy has sent back
            address(asset()), // TODO - when I move beyond the localnet, may need to re - specify this? Maybe need origin_asset AND target_asset?
            revertOptions // do these need to be different from the revertOptions in deposit?
        );
        emit Withdraw(userAddress, userAddress, userAddress, amount, shares);
    }
}
