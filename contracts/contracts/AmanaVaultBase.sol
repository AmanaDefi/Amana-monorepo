// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./ERC4626RewardsUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
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
        0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E;
    address constant _SYSTEM_ADDRESS =
        0x91d18e54DAf4F677cB28167158d6dd21F6aB3921;
    address constant ZAP_CONTRACT_ADDRESS =
        0x5659BbBf8633Eb85203aEc5cBde4c0b64abc0F27;

    // Variables
    address public strategyAddress;
    address public treasury;
    address public withdrawalReceiver;
    uint16 public perfFee;
    uint256 public totalPrincipal;
    mapping(address => uint256) internal userPrincipal;
    IGasTank gasTank;
    uint32 public gasLimitForWithdrawAndCall; // this is used in two places - for investing into the strategy and returning funds to the user
    uint32 public gasLimitForCall; // this is used in two places - for the switchStrategy function (divest and invest) and for a call to divest
    bool public depositsPaused;

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
    event PerformanceFeeUpdated(uint256 newFeeRate);
    event VaultInitialized(uint8 decimals, uint256 perfFee);
    event ContextDataRevert(RevertContext context);
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
        if (treasury_ == address(0)) revert InvalidAddress();
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

    function toggleDepositsPaused() external onlyOwner {
        depositsPaused = !depositsPaused;
    }

    // function getFractionOfTotalShares(
    //     uint256 shares
    // ) public view returns (uint256) {
    //     return (shares * 1e18 + totalSupply() / 2) / totalSupply(); // we add totalSupply() / 2 to prevent truncation errors
    // }

    /**
     * @dev Sets the strategy for the vault. Can only be called by the owner.
     * @param _strategyAddress The address of the new strategy.
     * @notice Emits a `StrategyUpdated` event upon success.
     */
    function setStrategy(address _strategyAddress) external onlyOwner {
        if (
            strategyAddress != address(0) || _strategyAddress == strategyAddress
        ) revert StrategyAlreadySet();
        if (_strategyAddress == address(0)) revert InvalidAddress();
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
        uint256 outputAmount = assets;
        if (zrc20source != address(asset())) {
            outputAmount = swap(
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
        uint256 outputAmount = amount;

        if (userChainId == uint32(block.chainid)) {
            // Same-chain transfer
            if (withdrawZRC20 == address(asset())) {
                SafeERC20.safeTransfer(IERC20(asset()), receiver, amount);
            } else {
                IERC20(address(asset())).approve(ZAP_CONTRACT_ADDRESS, amount);

                IZapContract(ZAP_CONTRACT_ADDRESS).zapSwapAndReturnToUser(
                    amount,
                    address(this),
                    address(asset()),
                    withdrawZRC20,
                    slippage,
                    receiver
                );
            }
        } else {
            if (address(asset()) != withdrawZRC20) {
                // Swap assets if needed
                outputAmount = swap(
                    address(asset()),
                    amount,
                    withdrawZRC20,
                    slippage,
                    address(this),
                    200
                );
            }

            bytes memory outgoingMessage = abi.encode(
                receiver, // the user the funds have to go to
                withdrawERC20, // the token on the target chain that the user receives (can be native)
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
        // Cross-chain transfer
        bytes memory recipient = abi.encodePacked(targetAddress);

        RevertOptions memory revertOptions = RevertOptions(
            address(this), // revert address
            true, // callOnRevert
            address(this), // abortAddress
            abi.encode(
                revertMessage,
                _crossChainTxId,
                amount,
                receiver,
                withdrawZRC20,
                withdrawERC20,
                userChainId
            ),
            uint256(0) // onRevertGasLimit
        );

        (address gas_zrc20, uint256 gasFee) = IZRC20(tokenToTransfer)
            .withdrawGasFeeWithGasLimit(gasLimitForWithdrawAndCall); // ZRC-20 of the gas token of the chain the strategy is on, and the gas fee for the withdrawal

        gasTank.getGas(gas_zrc20, gasFee);

        if (gas_zrc20 != tokenToTransfer) {
            approveOrIncreaseAllowance(
                IERC20(tokenToTransfer),
                _GATEWAY_ADDRESS,
                amount
            );
            approveOrIncreaseAllowance(
                IERC20(gas_zrc20),
                _GATEWAY_ADDRESS,
                gasFee
            );
        } else {
            approveOrIncreaseAllowance(
                IERC20(tokenToTransfer),
                _GATEWAY_ADDRESS,
                amount + gasFee
            );
        }

        if (userChainId == 900 && targetAddress == withdrawalReceiver) {
            // Solana
            IGatewayZEVM(_GATEWAY_ADDRESS).withdraw(
                recipient,
                amount,
                withdrawZRC20,
                revertOptions
            );
        } else {
            // Ethereum

            CallOptions memory callOptions = CallOptions(
                gasLimitForWithdrawAndCall,
                false
            );
            IGatewayZEVM(_GATEWAY_ADDRESS).withdrawAndCall(
                recipient,
                amount,
                tokenToTransfer,
                outgoingMessage,
                callOptions,
                revertOptions
            );
        }
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
     * @return The amount of output tokens received.
     * @custom:reverts InsufficientLiquidity if no valid liquidity pool exists for the token pair.
     */
    function swap(
        address zrc20,
        uint256 amount,
        address targetZRC20,
        uint16 slippageBps,
        address vault,
        uint16 maxDeadline
    ) internal returns (uint256) {
        uint256 minimumOut = SwapHelperLibEddy.calculateMinAmountOut(
            zrc20,
            targetZRC20,
            amount,
            slippageBps
        );

        (address curvePool, uint256 i, uint256 j) = SwapHelperLibEddy
            .getCurvePool(zrc20, targetZRC20);
        if (curvePool != address(0)) {
            // Approve Curve pool to spend your tokens
            IZRC20(zrc20).approve(curvePool, amount);

            // Perform the swap
            return
                ICurvePool(curvePool).exchange(
                    i, // Index of input token
                    j, // Index of output token
                    amount, // Amount of input token
                    minimumOut // Minimum amount of output token to receive
                );
        } else {
            address[] memory path = SwapHelperLibEddy.getPath(
                zrc20,
                targetZRC20
            );

            IZRC20(zrc20).approve(SwapHelperLibEddy.UNISWAP_V2_ROUTER, amount);
            // Perform the swap
            uint256[] memory amounts = IUniswapV2Router02(
                SwapHelperLibEddy.UNISWAP_V2_ROUTER
            ).swapExactTokensForTokens(
                    amount,
                    minimumOut,
                    path,
                    vault,
                    block.timestamp + maxDeadline
                );

            return amounts[amounts.length - 1];
        }
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
