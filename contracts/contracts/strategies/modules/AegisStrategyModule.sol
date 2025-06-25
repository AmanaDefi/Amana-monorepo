// contracts/modules/AegisStrategyModule.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../interfaces/ISwapHelper.sol";
import "../../interfaces/IAegisStakingVault.sol";
import "../../interfaces/IStrategy.sol";
import "../../interfaces/IErrors.sol";

abstract contract AegisStrategyModule is IErrors {
    using SafeERC20 for IERC20;

    address internal receiptToken;
    IAegisStakingVault internal stakingVault;

    function getInputToken() public view virtual returns (IERC20);

    function getSwapHelper() public view virtual returns (address);

    function _aegisDeposit(
        uint256 amount,
        uint256 minAmountOut
    ) internal returns (uint256 amountOut) {
        require(amount > 0, "Deposit amount must be greater than zero");

        getInputToken().safeTransfer(getSwapHelper(), amount);
        amountOut = ISwapHelper(getSwapHelper()).swap(
            address(getInputToken()),
            amount,
            receiptToken,
            500,
            address(this),
            9999,
            "0x"
        );
        require(amountOut >= minAmountOut, "Insufficient output amount");

        // Optional staking
        // stakingVault.deposit(amountOut, address(this));
    }

    function _aegisWithdraw(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal returns (uint256 amountOut) {
        uint256 sharesToWithdraw = _getStrategyWithdrawShareAmount(assetAmount);
        IERC20(receiptToken).safeTransfer(getSwapHelper(), sharesToWithdraw);

        amountOut = ISwapHelper(getSwapHelper()).swap(
            receiptToken,
            sharesToWithdraw,
            address(getInputToken()),
            500,
            address(this),
            9999,
            "0x"
        );
        require(amountOut >= minAmountOut, "Insufficient output amount");
    }

    function _getStrategyWithdrawShareAmount(
        uint256 assetAmount
    ) internal view returns (uint256 withdrawShareAmount) {
        uint256 totalShares = IERC20(receiptToken).balanceOf(address(this));
        uint256 sharesToWithdraw = assetAmount; // 1:1 assumption

        if (sharesToWithdraw > totalShares) {
            sharesToWithdraw = totalShares;
        }
        if (totalShares > 0 && totalShares - sharesToWithdraw <= 1e9) {
            sharesToWithdraw = totalShares;
        }

        return sharesToWithdraw;
    }

    function _convertToAssets(uint256 shares) internal pure returns (uint256) {
        return shares;
    }

    function _convertToShares(uint256 assets) internal pure returns (uint256) {
        return assets;
    }

    function _getTotalUnderlyingAssets() internal view returns (uint256) {
        return _convertToAssets(IERC20(receiptToken).balanceOf(address(this)));
    }
}
