// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../../interfaces/IYieldModule.sol";
import "../../interfaces/ICompoundVault.sol";
import "../../interfaces/ICometRewards.sol";
import "../../interfaces/IErrors.sol";
import "../StrategyHelper.sol";

contract CompoundStrategyModule is
    Initializable,
    UUPSUpgradeable,
    Ownable2StepUpgradeable,
    IYieldModule,
    IErrors
{
    using SafeERC20 for IERC20;

    ICompoundVault public receiptToken;
    IERC20 public inputToken;
    ICometRewards public cometRewards;
    address public rewardsToken;

    function initialize(
        address _inputToken,
        address _receiptToken,
        address _cometRewards,
        address _rewardsToken
    ) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        require(_inputToken != address(0), "Invalid input token");
        require(_receiptToken != address(0), "Invalid receipt token");
        require(_cometRewards != address(0), "Invalid rewards contract");
        require(_rewardsToken != address(0), "Invalid rewards token");

        inputToken = IERC20(_inputToken);
        receiptToken = ICompoundVault(_receiptToken);
        cometRewards = ICometRewards(_cometRewards);
        rewardsToken = _rewardsToken;
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
        receiptToken.supply(address(inputToken), amount);
    }

    function withdraw(
        address,
        uint256 minOut
    ) external override returns (uint256 amountOut) {
        _claimRewards();

        uint256 shares = _estimateSharesForWithdrawal(minOut);
        uint256 preBalance = inputToken.balanceOf(address(this));

        receiptToken.withdraw(address(inputToken), shares);

        amountOut = inputToken.balanceOf(address(this)) - preBalance;
        require(amountOut >= minOut, "Too little out");

        inputToken.safeTransfer(msg.sender, amountOut);
    }

    function totalAssets() external view override returns (uint256) {
        return receiptToken.balanceOf(address(this));
    }

    function claimRewards() external override {
        _claimRewards();
    }

    function _claimRewards() internal {
        try
            cometRewards.claim(address(receiptToken), address(this), true)
        {} catch {}
    }

    function _estimateSharesForWithdrawal(
        uint256 assetAmount
    ) internal view returns (uint256 sharesToWithdraw) {
        uint256 totalShares = receiptToken.balanceOf(address(this));
        sharesToWithdraw = assetAmount;

        if (sharesToWithdraw > totalShares) {
            sharesToWithdraw = totalShares;
        }
        if (totalShares > 0 && totalShares - sharesToWithdraw <= 1e3) {
            sharesToWithdraw = totalShares;
        }
    }
}
