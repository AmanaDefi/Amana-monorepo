// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./ERC4626Rewards.sol";

import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "./interfaces/ISystem.sol";
import "./interfaces/IGasTank.sol";
import "./interfaces/IErrors.sol";
import "./interfaces/ICurvePool.sol";
import "./interfaces/IZapContract.sol";
import "./interfaces/ISwapRouter.sol";

import "./libraries/SwapHelperLibEddy.sol";

/// @title Amana Connected Chain Vault
/// @notice A vault that interacts with ZetaChain-connected strategies
/// @dev Implements ERC4626 with custom cross-chain functionality
abstract contract AmanaVaultBase is
    ERC4626Rewards,
    UniversalContract,
    Revertable,
    IErrors
{
    using SafeERC20 for IERC20;
    using Math for uint256;

    // Constants
    address constant _GATEWAY_ADDRESS =
        0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E;
    address constant _SYSTEM_ADDRESS =
        0x91d18e54DAf4F677cB28167158d6dd21F6aB3921;
    address constant ZAP_CONTRACT_ADDRESS =
        0x5659BbBf8633Eb85203aEc5cBde4c0b64abc0F27;

    // Variables
    address public strategyAddress;
    address public treasury;
    address public withdrawalReceiver;
    address public swapHelper;
    address public withdrawHelper;

    IGasTank internal gasTank;

    uint256 internal totalPrincipal;

    uint32 public gasLimitForWithdrawAndCall; // this is used in two places - for investing into the strategy and returning funds to the user
    uint32 public gasLimitForCall; // this is used in two places - for the switchStrategy function (divest and invest) and for a call to divest
    uint16 public perfFee;
    bool public depositsPaused;

    mapping(address => uint256) internal userPrincipal;

    modifier onlyGateway() {
        if (msg.sender != _GATEWAY_ADDRESS) revert OnlyGateway();
        _;
    }

    modifier whenNotPaused() {
        if (depositsPaused) revert DepositsPaused();
        _;
    }

    event StrategyUpdated(address indexed newStrategyAddress);
    event PerformanceFeePaid(address indexed user, uint256 amount);
    event PerformanceFeeUpdated(uint16 newFeeRate);
    event VaultInitialized(uint8 decimals, uint256 perfFee);
    event TreasuryUpdated(address indexed newTreasury);
    event WithdrawalReceiverUpdated(address indexed newWithdrawalReceiver);
    event GasTankUpdated(address indexed newGasTank);

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
        uint256 amount,
        uint256 shares,
        bytes32 indexed crossChainTxId
    );

    /**
     * @dev Constructor to initialize the vault contract.
     * @param name_ Name of the vault token.
     * @param symbol_ Symbol of the vault token.
     * @param asset_ The underlying asset for the vault.
     * @param treasury_ Treasury address for performance fees.
     * @param perfFee_ Performance fee rate.
     * @param gasTank_ Gas tank contract address.
     * @param withdrawalReceiver_ Address where withdrawals are received.
     * @param swapHelper_ Address of the SwapHelper contract.
     * @param gasLimitForWithdrawAndCall_ Gas limit for withdrawAndCall.
     * @param gasLimitForCall_ Gas limit for call functions.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        IERC20 asset_,
        address treasury_,
        uint16 perfFee_,
        address gasTank_,
        address withdrawalReceiver_,
        address swapHelper_,
        address withdrawHelper_,
        uint32 gasLimitForWithdrawAndCall_,
        uint32 gasLimitForCall_
    ) ERC4626(asset_) ERC20(name_, symbol_) Ownable(msg.sender) {
        if (treasury_ == address(0)) revert InvalidAddress();

        treasury = treasury_;
        perfFee = perfFee_;
        totalPrincipal = 1; // preset to 1 virtual asset to avoid division by zero
        gasTank = IGasTank(gasTank_);
        withdrawalReceiver = withdrawalReceiver_;
        swapHelper = swapHelper_;
        withdrawHelper = withdrawHelper_;
        gasLimitForWithdrawAndCall = gasLimitForWithdrawAndCall_;
        gasLimitForCall = gasLimitForCall_;

        emit VaultInitialized(decimals(), perfFee_);
    }

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

    function toggleDepositsPaused() external onlyOwner {
        depositsPaused = !depositsPaused;
    }

    /**
     * @dev Sets the strategy for the vault. Can only be called by the owner.
     * @param _strategyAddress The address of the new strategy.
     * @notice Emits a `StrategyUpdated` event upon success.
     */
    function setStrategy(address _strategyAddress) external onlyOwner {
        if (_strategyAddress == address(0) || strategyAddress != address(0))
            revert InvalidAddress();
        strategyAddress = _strategyAddress;
        emit StrategyUpdated(_strategyAddress);
    }

    /**
     * @dev Updates the treasury address for the vault. Can only be called by the owner.
     * @param _treasury The address of the new treasury.
     * @notice Reverts if the treasury address is zero.
     */
    function updateTreasuryAddress(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert InvalidAddress();
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
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
        emit WithdrawalReceiverUpdated(_withdrawalReceiver);
    }

    /**
     * @dev Updates the swap helper address for the vault. Can only be called by the owner.
     * @param _swapHelper The address of the new swap helper.
     * @notice Reverts if the swap helper address is zero.
     */
    function updateSwapHelperAddress(address _swapHelper) external onlyOwner {
        if (_swapHelper == address(0)) revert InvalidAddress();
        swapHelper = _swapHelper;
    }

    function updateWithdrawHelper(address _withdrawHelper) external onlyOwner {
        withdrawHelper = _withdrawHelper;
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
        if (newGasTank == address(0)) revert InvalidAddress();
        gasTank = IGasTank(newGasTank);
        emit GasTankUpdated(newGasTank);
    }

    /**
     * @dev Sets the gas limit for the withdraw and call function. Can only be called by the owner.
     * @dev This needs to be set as low as possible to avoid wasting gas
     * @dev This may change depending on the complexity of the strategy's invest function
     * @param _GasLimitWithdrawAndCall The new gas limit for the withdraw and call function
     * @param _gasLimitCall The new gas limit for the call function
     */
    function setGasLimits(
        uint32 _GasLimitWithdrawAndCall,
        uint32 _gasLimitCall
    ) external onlyOwner {
        gasLimitForWithdrawAndCall = _GasLimitWithdrawAndCall;
        gasLimitForCall = _gasLimitCall;
    }

    /**
     * @dev Switches the strategy of the vault. Can only be called by the owner.
     *      Divests from the current strategy and invests in the new one.
     * @param newStrategyAddress The address of the new strategy.
     * @notice Reverts if the new strategy address is invalid or unchanged.
     * @notice Emits a `StrategyUpdated` event upon success.
     */
    function switchStrategy(
        address newStrategyAddress,
        uint256 minAmountOut,
        uint256 minSharesOut
    ) external virtual;

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

    /** @dev See {IERC4626-deposit}. */
    function deposit(
        uint256 assets,
        uint256 minimumOut,
        address receiver
    ) public returns (uint256) {
        uint256 maxAssets = maxDeposit(receiver);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxDeposit(receiver, assets, maxAssets);
        }

        uint256 shares = previewDeposit(assets);
        _deposit(_msgSender(), receiver, assets, shares, minimumOut);

        return shares;
    }

    function mint(
        uint256 shares,
        uint256 minimumOut,
        address receiver
    ) public virtual returns (uint256) {
        uint256 maxShares = maxMint(receiver);
        if (shares > maxShares) {
            revert ERC4626ExceededMaxMint(receiver, shares, maxShares);
        }

        uint256 assets = previewMint(shares);
        _deposit(_msgSender(), receiver, assets, shares, minimumOut);

        return assets;
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
        uint256 shares,
        uint256 minimumOut
    ) internal virtual whenNotPaused {}

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
        uint256 minimumOut,
        address zrc20source,
        address erc20source,
        uint16 slippage,
        bytes32 crossChainTxId
    ) internal whenNotPaused {
        uint256 maxAssets = maxDeposit(receiver);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxDeposit(receiver, assets, maxAssets);
        }
        if (zrc20source == address(0)) {
            zrc20source = ISystem(_SYSTEM_ADDRESS).gasCoinZRC20ByChainId(
                userChainId
            );
        }
        uint256 outputAmount = zrc20source == address(asset())
            ? assets
            : swap(
                zrc20source,
                assets,
                address(asset()),
                slippage,
                address(this),
                200
            );
        _investAssets(
            outputAmount,
            minimumOut,
            receiver,
            zrc20source,
            erc20source,
            uint32(IZRC20(zrc20source).CHAIN_ID()),
            crossChainTxId
        );
    }

    function _investAssets(
        uint256 amount,
        uint256 minimumOut,
        address receiver,
        address zrc20source,
        address erc20source,
        uint32 userChainId,
        bytes32 crossChainTxId
    ) internal virtual;

    function redeem(
        uint256 shares,
        uint256 minimumOut,
        address receiver,
        address owner
    ) public {
        if (shares == 0) {
            revert AmountCantBeZero();
        }
        uint256 maxShares = maxRedeem(owner);
        if (shares > maxShares) {
            revert ERC4626ExceededMaxRedeem(owner, shares, maxShares);
        }
        redeemToAnyToken(
            shares,
            minimumOut,
            receiver,
            owner,
            address(asset()),
            0
        );
    }

    /** @dev See {IERC4626-withdraw}. */
    function withdraw(
        uint256 assets,
        uint256 minimumOut,
        address receiver,
        address owner
    ) public returns (uint256) {
        if (assets == 0) {
            revert AmountCantBeZero();
        }
        uint256 maxAssets = maxWithdraw(owner);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxWithdraw(owner, assets, maxAssets);
        }

        uint256 shares = previewWithdraw(assets);
        _withdraw(
            _msgSender(),
            receiver,
            owner,
            address(asset()),
            minimumOut,
            shares,
            0
        );

        return shares;
    }

    /** @dev See {IERC4626-redeem}. */
    function redeemToAnyToken(
        uint256 shares,
        uint256 minimumOut,
        address receiver,
        address owner,
        address withdrawZRC20,
        uint16 slippage
    ) public {
        _withdraw(
            _msgSender(),
            receiver,
            owner,
            withdrawZRC20,
            minimumOut,
            shares,
            slippage
        );
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        address withdrawZRC20,
        uint256 minimumOut,
        uint256 shares,
        uint16 slippage
    ) internal virtual {}

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
        uint256 minimumOut,
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
    ) internal {
        uint256 outputAmount = (userChainId == uint32(block.chainid) ||
            address(asset()) == withdrawZRC20)
            ? amount
            : swap(
                address(asset()),
                amount,
                withdrawZRC20,
                slippage,
                address(this),
                200
            );

        if (userChainId == uint32(block.chainid)) {
            IERC20(address(asset())).approve(ZAP_CONTRACT_ADDRESS, amount);
            IZapContract(ZAP_CONTRACT_ADDRESS).zapSwapAndReturnToUser(
                amount,
                address(this),
                address(asset()),
                withdrawZRC20,
                slippage,
                receiver
            );
        } else {
            // Cross-chain transfer
            bytes memory outgoingMessage = abi.encode(
                receiver, // user to receive funds
                withdrawERC20, // token on target chain
                outputAmount, // amount to be sent
                _crossChainTxId
            );

            _handleWithdrawAndCall(
                withdrawalReceiver,
                receiver,
                withdrawZRC20,
                withdrawERC20,
                withdrawZRC20,
                outputAmount,
                userChainId,
                _crossChainTxId,
                "_returnFundsToUserFailed",
                outgoingMessage
            );
        }

        emit ReturnFundsToUserSent(_crossChainTxId);
    }

    function _handleWithdrawAndCall(
        address targetAddress,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        address tokenToTransfer,
        uint256 amount,
        uint32 userChainId,
        bytes32 _crossChainTxId,
        string memory revertMessage,
        bytes memory outgoingMessage
    ) internal {
        require(withdrawHelper != address(0), "WithdrawHelper not set");

        (bool success, ) = withdrawHelper.delegatecall(
            abi.encodeWithSignature(
                "handleWithdrawAndCall(address,address,address,address,address,address,uint256,uint32,bytes32,string,bytes,uint32)",
                address(gasTank),
                targetAddress,
                receiver,
                withdrawZRC20,
                withdrawERC20,
                tokenToTransfer,
                amount,
                userChainId,
                _crossChainTxId,
                revertMessage,
                outgoingMessage,
                gasLimitForWithdrawAndCall
            )
        );

        require(success, "WithdrawHelper call failed");
    }

    /**
     * @notice Swaps a specific amount of tokens for another token.
     * @dev Determines the swap path and uses Uniswap V2 to execute the swap.
     * @param zrc20 The address of the input token.
     * @param amount The amount of input tokens to swap.
     * @param targetZRC20 The address of the output token.
     * @param slippageBps The slippage tolerance in basis points (e.g., 50 for 0.5%).
     * @param vault The address where the swapped tokens will be sent.
     * @param maxDeadline The maximum deadline for the swap to complete.
     * @return amountOut The amount of output tokens received.
     * @custom:reverts InsufficientLiquidity if no valid liquidity pool exists for the token pair.
     */
    function swap(
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint16 slippageBps,
        address vault,
        uint16 maxDeadline
    ) internal returns (uint256 amountOut) {
        bytes memory data = abi.encodeWithSignature(
            "swap(address,uint256,address,uint16,address,uint16)",
            zrc20,
            amount,
            targetZRC20,
            slippageBps,
            vault,
            maxDeadline
        );

        amountOut = _delegateCall(swapHelper, data);
    }

    // Internal function for delegatecall
    function _delegateCall(
        address logicContract,
        bytes memory data
    ) internal returns (uint256) {
        (bool success, bytes memory result) = logicContract.delegatecall(data);
        require(success, "Delegatecall failed");
        return abi.decode(result, (uint256));
    }

    function approveOrIncreaseAllowance(
        IERC20 token,
        address spender,
        uint256 amount
    ) internal {
        uint256 currentAllowance = token.allowance(msg.sender, spender);

        if (currentAllowance == 0) {
            // First-time approval
            token.approve(spender, amount);
        } else {
            // Handle USDT-like tokens by forcing reset to zero first
            token.approve(spender, 0); // Reset to zero
            token.approve(spender, amount); // Set new allowance
        }
    }

    /**
     * @dev Handles revert scenarios during cross-chain operations.
     * @param context The revert context containing details about the revert scenario.
     * @notice Executes appropriate recovery steps based on the revert message.
     */
    function onRevert(RevertContext calldata context) external virtual override;
}
