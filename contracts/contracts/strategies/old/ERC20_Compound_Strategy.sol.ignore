// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ICompoundVault.sol";
import "../interfaces/ISwoopRouter.sol";
import "./ERC20StrategyParent.sol";

interface ICometRewards {
    function claim(
        address receiptToken,
        address src,
        bool shouldAccrue
    ) external;
}

interface IOpenOceanCaller {
    struct CallDescription {
        uint256 target;
        uint256 gasLimit;
        uint256 value;
        bytes data;
    }

    function makeCall(CallDescription memory desc) external;

    function makeCalls(CallDescription[] memory desc) external payable;
}

/// @title ERC20_4626_Strategy
/// @notice Base contract for USDC strategies using Aave and ZetaChain.
/// @dev Handles USDC investments and divestments for strategies on EVM-compatible chains.
contract ERC20_Compound_Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    ICompoundVault public immutable receiptToken;
    ICometRewards public immutable compoundRewards;
    address public constant BASE_USDC_ADDRESS =
        0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant BASE_COMPOUND_USDC_VAULT_ADDRESS =
        0xb125E6687d4313864e53df431d5425969c15Eb2F;
    address public constant OPEN_OCEAN_ROUTER =
        0x6352a56caadC4F1E25CD6c75970Fa768A3304e64;
    address public constant BASE_COMP_TOKEN =
        0x9e1028F5F1D5eDE59748FFceE5532509976840E0;
    address public constant COMET_REWARDS =
        0x123964802e6ABabBE1Bc9547D72Ef1B69B00A6b1;
    address public constant SWOOP_ROUTER =
        0xb5D99A61a5d34E3EDfEea052483f49F7a922e248;

    struct SwapDescription {
        IERC20 srcToken;
        IERC20 dstToken;
        address srcReceiver;
        address dstReceiver;
        uint256 amount;
        uint256 minReturnAmount;
        uint256 guaranteedAmount;
        uint256 flags;
        address referrer;
        bytes permit;
    }

    struct CallDescription {
        uint256 target;
        uint256 gasLimit;
        uint256 value;
        bytes data;
    }

    event RewardsHarvested(
        uint256 rewardsClaimed,
        uint256 rewardsSwapped,
        uint256 usdcReinvested
    );

    /// @notice Initializes the strategy contract.
    constructor(
        string memory _name,
        address _amanaVault,
        address _inputTokenAddress,
        address _receiptTokenAddress,
        address _gateway,
        address _compoundRewards
    )
        StrategyParent(_name, _amanaVault, _gateway)
        ERC20StrategyParent(_inputTokenAddress)
    {
        receiptToken = ICompoundVault(_receiptTokenAddress);
        compoundRewards = ICometRewards(_compoundRewards);
    }

    /// @notice Claims COMP rewards from Compound
    function claimRewards() public returns (uint256) {
        ICometRewards(COMET_REWARDS).claim(
            address(receiptToken),
            address(this),
            true
        );

        uint256 compBalance = IERC20(BASE_COMP_TOKEN).balanceOf(address(this));
        require(compBalance > 0, "No COMP rewards to claim");

        return compBalance;
    }

    /// @notice Swaps COMP for USDC using OpenOcean (via Swoop)
    /// @return usdcReceived Amount of USDC received from the swap
    function swapCompForUsdc() internal returns (uint256 usdcReceived) {
        uint256 compBalance = IERC20(BASE_COMP_TOKEN).balanceOf(address(this));
        require(compBalance > 0, "No COMP rewards to swap");

        // Approve OpenOcean Router to spend COMP
        approveOrIncreaseAllowance(
            IERC20(BASE_COMP_TOKEN),
            OPEN_OCEAN_ROUTER,
            compBalance
        );

        // Prepare Swap Description
        SwapDescription memory swapDesc = SwapDescription({
            srcToken: IERC20(BASE_COMP_TOKEN),
            dstToken: IERC20(BASE_USDC_ADDRESS),
            srcReceiver: address(this),
            dstReceiver: address(this),
            amount: compBalance,
            minReturnAmount: 1, // Consider setting proper slippage control
            guaranteedAmount: 0, // Optional
            flags: 0, // No special flags
            referrer: address(0), // No referrer
            permit: "" // No permit needed
        });

        // Prepare Call Description
        CallDescription[] memory calls = new CallDescription[](1);
        calls[0] = CallDescription({
            target: uint256(uint160(OPEN_OCEAN_ROUTER)), // Router address as target
            gasLimit: 500_000, // Gas limit (adjust as needed)
            value: 0, // No ETH needed for this swap
            data: abi.encodeWithSignature( // Encodes the swap call
                "swap(address,(address,address,address,address,uint256,uint256,uint256,uint256,address,bytes),(uint256,uint256,uint256,bytes)[])",
                address(this), // Caller
                swapDesc,
                calls
            )
        });

        // Execute Swap on OpenOcean (via Swoop)
        usdcReceived = ISwoopRouter(OPEN_OCEAN_ROUTER).swap(
            IOpenOceanCaller(OPEN_OCEAN_ROUTER),
            swapDesc,
            calls
        );

        require(usdcReceived > 0, "Swap failed");
    }

    /// @notice Harvests COMP rewards and reinvests them into Compound
    function harvest() public {
        uint256 compBalance = claimRewards();
        uint256 usdcReceived = swapCompForUsdc(compBalance);

        // Reinvest USDC into Compound
        _depositFundsIntoYieldSource(usdcReceived);
        emit RewardsHarvested(compBalance, compBalance, usdcReceived);
    }

    /// @notice Deposits funds into the yield source.
    /// @param amount Amount to be deposited.
    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256
    ) internal override {
        approveOrIncreaseAllowance(inputToken, address(receiptToken), amount);

        receiptToken.supply(address(inputToken), amount);
        // shares out = amount deposited, so no need to check minimumOut
    }

    /**
     * @notice Withdraws funds from the configured yield source.
     * @param amount The amount of funds to withdraw from the yield source.
     * @return amountWithdrawn The amount of funds successfully withdrawn.
     */
    function _withdrawFundsFromYieldSource(
        uint256 amount
    ) internal override returns (uint256 amountWithdrawn) {
        receiptToken.withdrawFrom(
            address(this),
            msg.sender,
            address(inputToken),
            amount
        );
        return amount;
    }

    /**
     * @notice Transfers assets from the current strategy to a new strategy.
     * @dev This function is intended to be overridden in derived contracts to define specific transfer logic.
     * @param newStrategy The address of the new strategy contract.
     * @param currentExecutionNonce The current execution nonce for the transaction.
     * @param _crossChainTxId The cross-chain transaction ID.
     */
    function _transferAssetsToNewStrategy(
        uint256 maxStrategySharesBurnt,
        uint256 minimumSharesOut,
        address newStrategy,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) internal override {
        uint256 strategyTotalBalance = receiptToken.balanceOf(address(this));
        _withdrawFundsFromYieldSource(strategyTotalBalance);
        uint256 sharesToBeBurnt = convertToShares(strategyTotalBalance);
        if (sharesToBeBurnt > maxStrategySharesBurnt) {
            revert ExceedsMaxSharesOut();
        }
        claimRewards();
        swapCompForUsdc(IERC20(BASE_COMP_TOKEN).balanceOf(address(this)));
        uint256 inputTokenBalance = IERC20(inputToken).balanceOf(address(this));
        approveOrIncreaseAllowance(inputToken, newStrategy, inputTokenBalance);

        IStrategy(newStrategy).depositFromOldStrategy(
            strategyTotalBalance,
            minimumSharesOut,
            currentExecutionNonce,
            _crossChainTxId
        );
        emit AssetsTransferredToNewStrategy(
            newStrategy,
            inputTokenBalance,
            currentExecutionNonce,
            _crossChainTxId
        );
    }

    /// @notice Gets the total assets held in the strategy.
    /// @return Total assets as an unsigned integer.
    function totalUnderlyingAssets() public view override returns (uint256) {
        return receiptToken.balanceOf(address(this));
    }
}
