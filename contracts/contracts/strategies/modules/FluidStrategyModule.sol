// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../../interfaces/IYieldModule.sol";
import "../../interfaces/I4626Vault.sol";
import "../../interfaces/IErrors.sol";
import "../StrategyHelper.sol";

contract FluidStrategyModule is
    Initializable,
    UUPSUpgradeable,
    Ownable2StepUpgradeable,
    IYieldModule,
    IErrors
{
    using SafeERC20 for IERC20;

    IERC20 public inputToken;
    I4626Vault public receiptToken;

    function initialize(
        address _inputToken,
        address _receiptToken
    ) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        require(_inputToken != address(0), "Invalid input token");
        require(_receiptToken != address(0), "Invalid receipt token");

        inputToken = IERC20(_inputToken);
        receiptToken = I4626Vault(_receiptToken);
    }

    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    function deposit(address, uint256 amount) external override {
        require(amount > 0, "Zero deposit");
        inputToken.safeTransferFrom(msg.sender, address(this), amount);
        StrategyHelper.approveOrIncreaseAllowance(
            inputToken,
            address(receiptToken),
            amount
        );

        receiptToken.deposit(amount, address(this));
    }

    function withdraw(
        address,
        uint256 minOut
    ) external override returns (uint256 amountOut) {
        uint256 shares = _estimateSharesForWithdrawal(minOut);
        amountOut = receiptToken.redeem(shares, msg.sender, address(this));
        require(amountOut >= minOut, "Too little out");
    }

    function totalAssets() external view override returns (uint256) {
        uint256 shares = receiptToken.balanceOf(address(this));
        return receiptToken.convertToAssets(shares);
    }

    function claimRewards() external override {
        // No reward support in Fluid vaults (as per original strategy)
    }

    function _estimateSharesForWithdrawal(
        uint256 assetAmount
    ) internal view returns (uint256 sharesToWithdraw) {
        uint256 totalShares = receiptToken.balanceOf(address(this));
        sharesToWithdraw = receiptToken.convertToShares(assetAmount);

        if (sharesToWithdraw > totalShares) {
            sharesToWithdraw = totalShares;
        }

        if (totalShares > 0 && totalShares - sharesToWithdraw <= 1e3) {
            sharesToWithdraw = totalShares;
        }
    }
}
