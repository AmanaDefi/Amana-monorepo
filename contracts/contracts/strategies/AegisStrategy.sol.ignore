// contracts/strategies/AegisStrategy.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./ERC20StrategyParent.sol";
import "./modules/AegisStrategyModule.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract AegisStrategy is
    Initializable,
    ERC20StrategyParent,
    AegisStrategyModule
{
    function initialize(
        string memory _name,
        address _gatewayAddress,
        address _amanaVault,
        address _withdrawHelper,
        address _swapHelper,
        address _receiptTokenAddress,
        address _inputTokenAddress,
        address _stakingVaultAddress,
        address, // _rewardsTokenAddress — unused
        uint256 // _inputTokenIndex — unused
    ) external initializer {
        __StrategyParent_init(
            _name,
            _amanaVault,
            _gatewayAddress,
            _withdrawHelper,
            _inputTokenAddress,
            _receiptTokenAddress
        );

        receiptToken = _receiptTokenAddress;
        inputToken = IERC20(_inputTokenAddress);
        stakingVault = IAegisStakingVault(_stakingVaultAddress);
        swapHelper = _swapHelper;
    }

    function getInputToken() public view override returns (IERC20) {
        return inputToken;
    }

    function getSwapHelper() public view override returns (address) {
        return swapHelper;
    }

    function _depositFundsIntoYieldSource(
        uint256 amount,
        uint256 minAmountOut
    ) internal override {
        _aegisDeposit(amount, minAmountOut);
    }

    function _withdrawFundsFromYieldSource(
        uint256 assetAmount,
        uint256 minAmountOut
    ) internal override returns (uint256) {
        return _aegisWithdraw(assetAmount, minAmountOut);
    }

    function _transferAssetsToNewStrategy() internal override {
        BufferedTx memory txn = pendingByNonce[lastProcessedNonce + 1];

        if (IStrategy(txn.newStrategy).amanaVault() != amanaVault)
            revert InvalidAmanaVault();

        harvest();

        uint256 totalYusd = IERC20(receiptToken).balanceOf(address(this));
        IERC20(receiptToken).transfer(txn.newStrategy, totalYusd);

        IStrategy(txn.newStrategy).depositFromOldStrategy(
            totalYusd,
            txn.minimumOut,
            lastProcessedNonce + 1
        );

        emit AssetsTransferredToNewStrategy(
            txn.newStrategy,
            totalYusd,
            lastProcessedNonce + 1
        );
    }

    function depositFromOldStrategy(
        uint256 amount,
        uint256 minimumSharesOut,
        uint256 currentExecutionNonce
    ) external override {
        if (oldStrategy == address(0)) revert OldStrategyNotSet();
        if (msg.sender != oldStrategy) revert NotAuthorized();

        lastProcessedNonce = currentExecutionNonce;

        emit AssetsReceivedFromOldStrategy(
            oldStrategy,
            amount,
            currentExecutionNonce
        );

        oldStrategy = address(0);
    }

    function totalUnderlyingAssets() public view override returns (uint256) {
        return _getTotalUnderlyingAssets();
    }

    function convertToAssets(
        uint256 shares
    ) public pure override returns (uint256) {
        return _convertToAssets(shares);
    }

    function convertToShares(
        uint256 assets
    ) public pure override returns (uint256) {
        return _convertToShares(assets);
    }

    function getStrategyWithdrawShareAmount(
        uint256 assetAmount
    ) public view override returns (uint256) {
        return _getStrategyWithdrawShareAmount(assetAmount);
    }
}
