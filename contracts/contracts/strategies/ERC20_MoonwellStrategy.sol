// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/I4626Vault.sol";
import "../interfaces/ISwapRouter.sol";
import "../interfaces/IPriceOracle.sol";

import "./ERC20StrategyParent.sol";

contract ERC20_MoonwellStrategy is ERC20StrategyParent {
    using SafeERC20 for IERC20;

    I4626Vault public immutable receiptToken;
    address public swapHelperOnBase;

    address public constant WELL = 0xA88594D404727625A9437C3f886C7643872296AE;
    address public constant MORPHO = 0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842;
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

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

        bytes memory data = abi.encodeWithSignature(
            "swap(address,uint256,address,uint16,address,uint16,bytes)",
            token,
            amountIn,
            inputToken,
            slippageBps,
            address(this),
            block.timestamp + 60,
            "" // empty bytes param for future-proofing
        );

        _delegateCall(swapHelperOnBase, data);
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

    function _swapAllRewards() internal {
        uint256 wellBalance = IERC20(WELL).balanceOf(address(this));
        uint256 morphoBalance = IERC20(MORPHO).balanceOf(address(this));
        uint256 usdcBalance = IERC20(USDC).balanceOf(address(this));

        if (morphoBalance > 0) _swapTokenForInputToken(MORPHO, morphoBalance);
        if (wellBalance > 0) _swapTokenForInputToken(WELL, wellBalance);
        if (usdcBalance > 0 && address(inputToken) != USDC)
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
}
