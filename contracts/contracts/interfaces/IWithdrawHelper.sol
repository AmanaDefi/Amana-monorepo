// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IWithdrawHelper {
    function handleDivestCallToStrategy(
        address strategyAddress,
        uint256 gasLimitForCall,
        uint256 totalSupply,
        address vaultAsset,
        address registry,
        address user,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        uint256 vaultSharesToBeBurnt,
        uint256 minimumOut,
        uint32 withdrawChainId,
        uint16 slippage,
        bytes32 crossChainTxId,
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

    function handleWithdrawAndCallToStrategy(
        address targetAddress,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        address tokenToTransfer,
        uint256 amount,
        uint256 minimumOut,
        uint32 userChainId,
        bytes32 crossChainTxId,
        uint32 gasLimitForWithdrawAndCall,
        address registry,
        uint256 vaultNonce
    ) external;

    function handleGasFeeAndWithdrawAndCallToStrategy(
        address targetAddress,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        address tokenToTransfer,
        uint256 amount,
        uint256 minimumOut,
        uint32 userChainId,
        bytes32 crossChainTxId,
        uint32 gasLimitForWithdrawAndCall,
        address registry,
        uint256 vaultNonce
    ) external;

    function handleGasFeeAndWithdrawAndCallToReceiver(
        address targetAddress,
        address receiver,
        address withdrawZRC20,
        address withdrawERC20,
        address tokenToTransfer,
        uint256 amount,
        uint32 userChainId,
        bytes32 crossChainTxId,
        address registry
    ) external;
}
