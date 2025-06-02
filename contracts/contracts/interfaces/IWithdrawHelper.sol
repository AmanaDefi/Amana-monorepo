// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IWithdrawHelper {
    function handleGasFeeAndWithdrawToUser(
        bytes memory recipient,
        address withdrawZRC20,
        uint256 amount,
        address registry,
        uint256 vaultNonce
    ) external;

    function handleGasFeeAndWithdrawAndCallToStrategy(
        address targetAddress,
        address receiver,
        bytes memory nonEvmAddress,
        address withdrawZRC20,
        address tokenToTransfer,
        uint256 amount,
        uint256 minimumOut,
        uint32 gasLimitForWithdrawAndCall,
        address registry,
        uint256 vaultNonce
    ) external;

    function handleWithdrawAndCallToStrategy(
        address targetAddress,
        address receiver,
        bytes memory nonEvmAddress,
        address withdrawZRC20,
        address tokenToTransfer,
        uint256 amount,
        uint256 minimumOut,
        uint32 gasLimitForWithdrawAndCall,
        address registry,
        uint256 vaultNonce
    ) external;

    function handleDivestCallToStrategy(
        address strategyAddress,
        uint256 gasLimitForCall,
        address vaultAsset,
        address registry,
        address user,
        address withdrawZRC20,
        uint256 vaultSharesToBeBurnt,
        uint256 minimumOut,
        uint256 vaultNonce
    ) external;

    function handleSwitchCallToStrategy(
        address strategyAddress,
        address newStrategyAddress,
        uint256 gasLimitForCall,
        uint256 gasLimitForWithdrawAndCall,
        address vaultAsset,
        address registry,
        uint256 minAmountOut,
        uint256 minSharesOut,
        uint256 vaultNonce
    ) external;
}
