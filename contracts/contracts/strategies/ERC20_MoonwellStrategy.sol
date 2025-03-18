// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/I4626Vault.sol";
import "../interfaces/ISwapRouter.sol";
import "../interfaces/IPriceOracle.sol";

import "./ERC20StrategyParent.sol";

contract ERC20_4626_Moonwell_Strategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    I4626Vault public immutable receiptToken;
    ISwapRouter public immutable swapRouter;

    address public constant WELL = 0xA88594D404727625A9437C3f886C7643872296AE;
    address public constant MORPHO = 0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842;
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant UNISWAP_V3_ROUTER =
        0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant PRICE_ORACLE_ADDRESS =
        0x0D313486083fe6f0A1868EAeEe07D46fed92E9f9; // TODO - deploy this on Base!

    bytes32 constant wellUsdPriceFeedId =
        0x3cf6bab8bf8041dc8ee2a3edebe16b5f9f4ff3cce46006aeb15c885ba4779d0b;
    bytes32 constant morphoUsdPriceFeedId =
        0x5b2a4c542d4a74dd11784079ef337c0403685e3114ba0d9909b5c7a7e06fdc42;

    uint16 public slippageBps = 100; // 1% slippage tolerance

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
        address _gateway
    )
        StrategyParent(_name, _amanaVault, _gateway)
        ERC20StrategyParent(_inputTokenAddress)
    {
        receiptToken = I4626Vault(_receiptTokenAddress);
        swapRouter = ISwapRouter(UNISWAP_V3_ROUTER);
    }

    function setSlippageBps(uint16 _slippageBps) external onlyOwner {
        slippageBps = _slippageBps;
    }

    function _swapTokenForInputToken(address token, uint256 amountIn) internal {
        if (amountIn == 0) return;
        IERC20(token).safeIncreaseAllowance(UNISWAP_V3_ROUTER, amountIn);
        uint256 amountOutMinimum = calculateMinAmountOut(
            token,
            address(inputToken),
            amountIn
        );
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: token,
                tokenOut: address(inputToken),
                fee: 500,
                recipient: address(this),
                deadline: block.timestamp + 60,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

        swapRouter.exactInputSingle(params);
    }

    function _swapAllRewards() internal {
        uint256 wellBalance = IERC20(WELL).balanceOf(address(this));
        uint256 morphoBalance = IERC20(MORPHO).balanceOf(address(this));
        uint256 usdcBalance = IERC20(USDC).balanceOf(address(this));

        _swapTokenForInputToken(MORPHO, morphoBalance);
        _swapTokenForInputToken(WELL, wellBalance);
        _swapTokenForInputToken(USDC, usdcBalance);
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
        _swapAllRewards();
        uint256 totalDeposit = amount +
            IERC20(inputToken).balanceOf(address(this));
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
     * @param minAmountOut The minimum amount of USDC to withdraw.
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

    /**
     * @notice Returns the price feed ID for a given token address.
     * @param token The address of the token.
     * @return The price feed ID associated with the token.
     */
    function getPriceFeedId(address token) internal pure returns (bytes32) {
        if (token == WELL) {
            return wellUsdPriceFeedId;
        } else if (token == MORPHO) {
            return morphoUsdPriceFeedId;
        } else {
            return bytes32(0); // Return zero bytes if no price feed exists
        }
    }

    /**
     * @notice Checks if a token is a USD stablecoin.
     * @param token The address of the token.
     * @return True if the token is a stablecoin, false otherwise.
     */
    function isStablecoin(address token) internal pure returns (bool) {
        return (token == USDC);
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
     * @notice Calculates the minimum output amount based on input token, output token, and slippage.
     * @param inputToken The address of the input token.
     * @param outputToken The address of the output token.
     * @param amount The input amount in token units.
     * @return The minimum acceptable output amount.
     */
    function calculateMinAmountOut(
        address inputToken,
        address outputToken,
        uint256 amount
    ) internal view returns (uint256) {
        bytes32 inputPriceFeed = getPriceFeedId(inputToken);
        bytes32 outputPriceFeed = getPriceFeedId(outputToken);

        require(
            inputPriceFeed != bytes32(0) || isStablecoin(inputToken),
            "Invalid input token"
        );
        require(
            outputPriceFeed != bytes32(0) || isStablecoin(outputToken),
            "Invalid output token"
        );

        // Assume 1 USD = 1 USDC/USDT if it's a stablecoin
        uint256 inputPrice = isStablecoin(inputToken)
            ? 1e8
            : IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(inputPriceFeed);
        uint256 outputPrice = isStablecoin(outputToken)
            ? 1e8
            : IPriceOracle(PRICE_ORACLE_ADDRESS).fetchPrice(outputPriceFeed);

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
        return amountOut - ((amountOut * slippageBps) / 10000);
    }
}
