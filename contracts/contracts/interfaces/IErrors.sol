// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IErrors {
    error OnlyGateway();
    error OnlyVault();
    error InvalidAddress();
    error OldStrategyNotSet();
    error NotAuthorized();
    error NoFundsReceived();
    error NothingToWithdraw();
    error InsufficientOut();
    error TransferFailed();
    error ExceedsMaxSharesOut();
    error InvalidStrategyChainId();
    error FeeExceedsLimit();
    error AmountCantBeZero();
    error DepositExceedsLimit();
    error MintExceedsLimit();
    error WithdrawExceedsLimit();
    error RedeemExceedsLimit();
    error ConfirmationAlreadyProcessed();
    error StrategyAlreadySet();
    error NoAssetsToSwitch();
    error DepositsPaused();

    error InsufficientBalance();
    error VaultAlreadyAuthorized();

    error InvalidPathLength();
    error InsufficientLiquidity();
    error InsufficientInputAmount();
    error InvalidPath();
    error InvalidTokenPair();

    error InvalidMessage();
    error InvalidAmanaVault();
    error InvalidNonce();

    error InvalidTxType();
    error IncorrectAmount();

    error UserSharesInsufficientForWithdrawal(
        address user,
        uint256 required,
        uint256 actual
    );
}
