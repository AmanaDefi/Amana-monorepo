// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/I4626Vault.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/IAerodromeRouter.sol";

import "./ERC20StrategyParent.sol";
import "hardhat/console.sol";

contract ERC20_MoonwellStrategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    I4626Vault public immutable receiptToken;
    address public swapHelperOnBase;

    address public constant WELL_TOKEN =
        0xA88594D404727625A9437C3f886C7643872296AE;
    address public constant MORPHO_TOKEN =
        0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842;
    address public constant USDC_TOKEN =
        0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    uint16 public slippageBps = 10000; // 1% slippage tolerance

    address constant UNISWAP_V3_ROUTER =
        0x2626664c2603336E57B271c5C0b26F421741e481;
    address constant UNISWAP_V3_FACTORY =
        0x33128a8fC17869897dcE68Ed026d694621f6FDfD; // mainnet and testnet
    address constant QUOTER = 0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a;
    address constant UNIVERSAL_ROUTER =
        0x6fF5693b99212Da76ad316178A184AB56D299b43;
    address constant AERODROME_ROUTER =
        0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43;
    address constant AERODROME_FACTORY =
        0x420DD381b31aEf6683db6B902084cB0FFECe40Da;

    address constant PRICE_ORACLE_ADDRESS =
        0x909C6C077249BD40513FFc13C9b390f7cCB382bf; // Base mainnet price oracle

    bytes32 constant wellUsdPriceFeedId =
        0x3cf6bab8bf8041dc8ee2a3edebe16b5f9f4ff3cce46006aeb15c885ba4779d0b;
    bytes32 constant morphoUsdPriceFeedId =
        0x5b2a4c542d4a74dd11784079ef337c0403685e3114ba0d9909b5c7a7e06fdc42;
    bytes32 constant ethUsdPriceFeedId =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    uint24 constant V3_FEE_TIER_LOW = 500;
    uint24 constant V3_FEE_TIER_HIGH = 3000;

    address constant WETH_ADDRESS = 0x4200000000000000000000000000000000000006;

    event RewardsHarvested(
        uint256 wellClaimed,
        uint256 morphoClaimed,
        uint256 usdcReceived
    );

    constructor(
        string memory _name,
        address _amanaVault,
        address _inputTokenAddress,
        address _receiptTokenAddress,
        address _swapHelperOnBase,
        address _gateway
    )
        StrategyParent(_name, _amanaVault, _gateway)
        ERC20StrategyParent(_inputTokenAddress)
    {
        receiptToken = I4626Vault(_receiptTokenAddress);
        swapHelperOnBase = _swapHelperOnBase;
    }

    function setSlippageBps(uint16 _slippageBps) external onlyOwner {
        slippageBps = _slippageBps;
    }

    function _swapTokenForInputToken(address token, uint256 amountIn) internal {
        if (amountIn == 0) return;
        console.log("first got here");
        address targetAddress = address(this);
        uint16 deadline = uint16(block.timestamp + 60);
        console.log("token", token);
        console.log("amountIn", amountIn);
        console.log("inputToken", address(inputToken));
        console.log("slippageBps", slippageBps);
        console.log("targetAddress", targetAddress);
        console.log("deadline", deadline);
        swap(
            token,
            amountIn,
            address(inputToken),
            slippageBps,
            targetAddress,
            deadline,
            ""
        );
        // bytes memory data = abi.encodeWithSignature(
        //     "swap(address,uint256,address,uint16,address,uint16,bytes)",
        //     token,
        //     amountIn,
        //     address(inputToken),
        //     100,
        //     targetAddress,
        //     deadline,
        //     "" // empty bytes param for future-proofing
        // );
        // console.log("about to delegate call");
        // _delegateCall(swapHelperOnBase, data);
    }

    // Internal function for delegatecall
    function _delegateCall(
        address logicContract,
        bytes memory data
    ) internal returns (uint256) {
        console.log("logic contract", logicContract);
        (bool success, bytes memory result) = logicContract.delegatecall(data);
        if (!success) {
            console.logBytes(result); // Print the failure reason
            revert(string(result)); // Revert with the error message
        }
        return abi.decode(result, (uint256));
    }

    function _swapAllRewards() internal {
        uint256 wellBalance = IERC20(WELL_TOKEN).balanceOf(address(this));
        console.log("well balance", wellBalance);
        uint256 morphoBalance = IERC20(MORPHO_TOKEN).balanceOf(address(this));
        console.log("morpho balance", morphoBalance);
        uint256 usdcBalance = IERC20(USDC_TOKEN).balanceOf(address(this));
        console.log("usdc balance", usdcBalance);
        if (morphoBalance > 0)
            _swapTokenForInputToken(MORPHO_TOKEN, morphoBalance);
        if (wellBalance > 0) _swapTokenForInputToken(WELL_TOKEN, wellBalance);
        if (usdcBalance > 0 && address(inputToken) != USDC_TOKEN)
            _swapTokenForInputToken(USDC_TOKEN, usdcBalance);
    }

    function _swapAndReinvest() public {
        _swapAllRewards();

        uint256 totalInputToken = IERC20(inputToken).balanceOf(address(this));
        if (totalInputToken > 0) {
            approveOrIncreaseAllowance(
                inputToken,
                address(receiptToken),
                totalInputToken
            );
            receiptToken.deposit(totalInputToken, address(this));
        }
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minimumOut
    ) internal override {
        console.log("starting deposit");
        _swapAllRewards();
        uint256 totalDeposit = IERC20(inputToken).balanceOf(address(this));
        if (totalDeposit > 0) {
            approveOrIncreaseAllowance(
                inputToken,
                address(receiptToken),
                totalDeposit
            );
            uint256 shares = receiptToken.deposit(totalDeposit, address(this));
            if (shares < minimumOut) {
                revert InsufficientOut();
            }
        }
    }

    /**
     * @notice Withdraws funds from the configured yield source.
     * @param fractionToWithdraw The fraction of shares to withdraw from the yield source.
     * @param minAmountOut The minimum amount of USDC_TOKEN to withdraw.
     * @return amountWithdrawn The amount of funds successfully withdrawn.
     */
    function _withdrawFundsFromYieldSource(
        uint256 fractionToWithdraw,
        uint256 minAmountOut
    ) internal override returns (uint256 amountWithdrawn) {
        _swapAndReinvest();
        uint256 sharesToWithdraw = getStrategyWithdrawShareAmount(
            fractionToWithdraw
        );
        amountWithdrawn = receiptToken.redeem(
            sharesToWithdraw,
            address(this),
            address(this)
        );
        if (amountWithdrawn < minAmountOut) {
            revert InsufficientOut();
        }
    }

    function getStrategyWithdrawShareAmount(
        uint256 fractionOfTotalShares
    ) public view override returns (uint256) {
        uint256 totalShares = receiptToken.balanceOf(address(this));
        uint256 withdrawShareAmount = (fractionOfTotalShares *
            totalShares +
            5e17) / 1e18;
        return
            withdrawShareAmount > totalShares
                ? totalShares
                : withdrawShareAmount;
    }

    /**
     * @notice Transfers assets from the current strategy to a new strategy.
     * @dev This function is intended to be overridden in derived contracts to define specific transfer logic.
     * @param newStrategy The address of the new strategy contract.
     * @param currentExecutionNonce The current execution nonce for the transaction.
     * @param _crossChainTxId The cross-chain transaction ID.
     */
    function _transferAssetsToNewStrategy(
        uint256 minAmountOut,
        uint256 minimumSharesOut,
        address newStrategy,
        uint256 currentExecutionNonce,
        bytes32 _crossChainTxId
    ) internal override {
        _swapAndReinvest();

        uint256 amountWithdrawn = _withdrawFundsFromYieldSource(
            1e18,
            minAmountOut
        );

        approveOrIncreaseAllowance(inputToken, newStrategy, amountWithdrawn);

        IStrategy(newStrategy).depositFromOldStrategy(
            amountWithdrawn,
            minimumSharesOut,
            currentExecutionNonce,
            _crossChainTxId
        );
        emit AssetsTransferredToNewStrategy(
            newStrategy,
            amountWithdrawn,
            currentExecutionNonce,
            _crossChainTxId
        );
    }

    /// @notice Gets the total assets held in the strategy.
    /// @return Total assets as an unsigned integer.
    function totalUnderlyingAssets() public view override returns (uint256) {
        return
            receiptToken.convertToAssets(receiptToken.balanceOf(address(this)));
    }

    function convertToShares(
        uint256 assetAmount
    ) public view override returns (uint256) {
        return receiptToken.convertToShares(assetAmount);
    }

    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256) {
        return receiptToken.convertToAssets(shares);
    }

    function swap(
        address tokenIn,
        uint256 amount,
        address tokenOut,
        uint16 slippage,
        address vault,
        uint16 maxDeadline,
        bytes memory data
    ) internal returns (uint256 amountOut) {
        amountOut = 0;
        uint256 minimumOut = calculateMinAmountOut(
            tokenIn,
            tokenOut,
            amount,
            slippage
        );
        console.log("Minimum out: %d", minimumOut);
        IERC20(tokenIn).approve(AERODROME_ROUTER, amount);
        IAerodromeRouter.Route[] memory routes = new IAerodromeRouter.Route[](
            1
        );
        // address factory = getFactoryForPair(tokenIn, tokenOut, false);
        routes[0] = IAerodromeRouter.Route({
            from: tokenIn,
            to: tokenOut,
            stable: false,
            factory: AERODROME_FACTORY
        });
        uint256[] memory amounts = IAerodromeRouter(AERODROME_ROUTER)
            .swapExactTokensForTokens(
                amount,
                minimumOut,
                routes,
                vault,
                block.timestamp + maxDeadline
            );

        amountOut = amounts[1]; // Output amount after swap
        console.log("swapped");
    }

    /**
     * @notice Calculates the minimum output amount based on input token, output token, and slippage.
     * @param inputToken The address of the input token.
     * @param outputToken The address of the output token.
     * @param amount The input amount in token units.
     * @return The minimum acceptable output amount.
     */
    function calculateMinAmountOut(
        address inputToken,
        address outputToken,
        uint256 amount,
        uint16 slippage
    ) internal view returns (uint256) {
        bytes32 inputPriceFeed = getPriceFeedId(inputToken);
        bytes32 outputPriceFeed = getPriceFeedId(outputToken);
        console.log("got inside calcminout");
        require(
            inputPriceFeed != bytes32(0) || isStablecoin(inputToken),
            "Invalid input token"
        );
        require(
            outputPriceFeed != bytes32(0) || isStablecoin(outputToken),
            "Invalid output token"
        );
        console.log("2");
        // Assume 1 USD = 1 USDC/USDT if it's a stablecoin
        uint256 inputPrice = isStablecoin(inputToken)
            ? 1e8
            : IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(inputPriceFeed);
        console.log("inputPrice");
        uint256 outputPrice = isStablecoin(outputToken)
            ? 1e8
            : IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(outputPriceFeed);
        console.log("3");
        require(inputPrice > 0 && outputPrice > 0, "Invalid price data");

        // Get token decimals dynamically
        uint256 inputDecimals = getTokenDecimals(inputToken);
        uint256 outputDecimals = getTokenDecimals(outputToken);

        // Convert input amount to USD value
        uint256 amountInUsd = (amount * inputPrice) / (10 ** inputDecimals);

        // Convert USD value to output token amount
        uint256 amountOut = (amountInUsd * (10 ** outputDecimals)) /
            outputPrice;

        // Apply slippage
        return amountOut - ((amountOut * slippage) / 10000);
    }

    /**
     * @notice Checks if a token is a USD stablecoin.
     * @param token The address of the token.
     * @return True if the token is a stablecoin, false otherwise.
     */
    function isStablecoin(address token) internal pure returns (bool) {
        return (token == USDC_TOKEN);
    }

    /**
     * @notice Fetches the token's decimal places from its contract.
     * @dev Assumes 18 decimals for native tokens (ETH, BNB, POL, WZETA).
     * @param token The address of the token.
     * @return The number of decimal places.
     */
    function getTokenDecimals(address token) internal view returns (uint8) {
        return IERC20Metadata(token).decimals();
    }

    /**
     * @notice Returns the price feed ID for a given token address.
     * @param token The address of the token.
     * @return The price feed ID associated with the token.
     */
    function getPriceFeedId(address token) internal pure returns (bytes32) {
        if (token == WELL_TOKEN) {
            return wellUsdPriceFeedId;
        } else if (token == MORPHO_TOKEN) {
            return morphoUsdPriceFeedId;
        } else {
            return bytes32(0); // Return zero bytes if no price feed exists
        }
    }
}
