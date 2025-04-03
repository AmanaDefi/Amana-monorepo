// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IWithdrawHelper {
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
        address registry
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
        address registry
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
