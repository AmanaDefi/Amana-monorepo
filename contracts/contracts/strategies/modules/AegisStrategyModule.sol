// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../../interfaces/ISwapHelper.sol";
import "../../interfaces/IAegisStakingVault.sol";
import "../../interfaces/IErrors.sol";
import "../../interfaces/IYieldModule.sol";

contract AegisStrategyModule is
    Initializable,
    UUPSUpgradeable,
    Ownable2StepUpgradeable,
    IYieldModule,
    IErrors
{
    using SafeERC20 for IERC20;

    address public receiptToken;
    IERC20 public inputToken;
    ISwapHelper public swapHelper;
    IAegisStakingVault public stakingVault;

    function initialize(
        address _inputToken,
        address _receiptToken,
        address _swapHelper,
        address _stakingVault
    ) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        require(_inputToken != address(0), "Invalid input token");
        require(_receiptToken != address(0), "Invalid receipt token");
        require(_swapHelper != address(0), "Invalid swap helper");
        require(_stakingVault != address(0), "Invalid staking vault");

        inputToken = IERC20(_inputToken);
        receiptToken = _receiptToken;
        swapHelper = ISwapHelper(_swapHelper);
        stakingVault = IAegisStakingVault(_stakingVault);
    }

    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    function deposit(address, uint256 amount) external override {
        require(amount > 0, "Zero deposit");
        inputToken.safeTransferFrom(msg.sender, address(swapHelper), amount);

        uint256 amountOut = swapHelper.swap(
            address(inputToken),
            amount,
            receiptToken,
            500, // Aegis pool fee
            address(this),
            9999, // Max slippage
            "0x"
        );

        require(amountOut > 0, "Swap failed");

        // Optional: stake receipt tokens
        // stakingVault.deposit(amountOut, address(this));
    }

    function withdraw(
        address,
        uint256 minOut
    ) external override returns (uint256 amountOut) {
        uint256 shares = _getStrategyWithdrawShareAmount(minOut);
        IERC20(receiptToken).safeTransfer(address(swapHelper), shares);

        amountOut = swapHelper.swap(
            receiptToken,
            shares,
            address(inputToken),
            500,
            address(this),
            9999,
            "0x"
        );

        require(amountOut >= minOut, "Too little out");
        inputToken.safeTransfer(msg.sender, amountOut);
    }

    function claimRewards() external override {
        // Optional: claim if rewards exist
        // stakingVault.claim(address(this));
    }

    function totalAssets() external view override returns (uint256) {
        return IERC20(receiptToken).balanceOf(address(this));
    }

    function _getStrategyWithdrawShareAmount(
        uint256 assetAmount
    ) internal view returns (uint256 withdrawShareAmount) {
        uint256 totalShares = IERC20(receiptToken).balanceOf(address(this));
        withdrawShareAmount = assetAmount;

        if (withdrawShareAmount > totalShares) {
            withdrawShareAmount = totalShares;
        }
        if (totalShares > 0 && totalShares - withdrawShareAmount <= 1e9) {
            withdrawShareAmount = totalShares;
        }
    }
}
