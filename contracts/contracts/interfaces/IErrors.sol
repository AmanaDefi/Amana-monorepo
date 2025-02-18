// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IErrors {
    error OnlyGateway();
    error OnlyVault();
    error InvalidAddress();
    error OldStrategyNotSet();
    error Unauthorized();
    error NoFundsReceived();
    error NothingToWithdraw();
    error DepositFailed();
    error TransferFailed();

    error InvalidStrategyAddress();
    error InvalidStrategyChainId();
    error InvalidTreasuryAddress();
    error FeeExceedsLimit();
    error DepositCantBeZero();
    error WithdrawCantBeZero();
    error RedeemCantBeZero();
    error InvalidZRC20Address();
    error CantBeZeroAddress();
    error DepositExceedsLimit();
    error MintExceedsLimit();
    error WithdrawExceedsLimit();
    error RedeemExceedsLimit();
    error ConfirmationAlreadyProcessed();
    error StrategyAlreadySet();
    error NoAssetsToSwitch();

    error InsufficientBalance();
    error NotAuthorized();
    error VaultAlreadyAuthorized();
    error VaultNotAuthorized();

    error InvalidPathLength();
    error CantBeIdenticalAddresses();
    error InsufficientLiquidity();
    error InsufficientInputAmount();
    error InvalidPath();
    error InvalidTokenPair();
}
