import { useMemo } from "react";
import {
  Action,
  TransactionStepMessages,
  TransactionStepStatus,
  Balance,
} from "@/types/types";
import { hasNoErrors, isZetachain } from "@/utils/utils";
import { useTransactionStore } from "@/store/transactionStore";

export enum DepositStep {
  SELECT_TOKEN = 0,
  CONFIRM_DEPOSIT = 1,
  CROSS_CHAIN_TRANSFER = 2,
  FINAL_CONFIRMATION = 3,
}

const mapActionToUserStep = (
  action: Action,
  isType2Transaction: boolean,
  isDeposit: boolean,
): DepositStep | null => {
  if (isDeposit) {
    if (isType2Transaction) {
      switch (action) {
        case Action.deposit:
          return DepositStep.CONFIRM_DEPOSIT;
        case Action.depositConfirmed:
        case Action.crosschainInvest:
        case Action.CrossChainInvestFailed:
        case Action.CrossChainDepositFailed:
          return DepositStep.CROSS_CHAIN_TRANSFER;
        case Action.deposited:
        case Action.failed:
          return DepositStep.FINAL_CONFIRMATION;
        default:
          return null;
      }
    } else {
      switch (action) {
        case Action.deposit:
          return DepositStep.CONFIRM_DEPOSIT;
        case Action.depositConfirmed:
        case Action.crosschainInvest:
        case Action.CrossChainInvestFailed:
        case Action.FundsInvest:
        case Action.InvestConfirmFailed:
          return DepositStep.CROSS_CHAIN_TRANSFER;
        case Action.deposited:
        case Action.failed:
          return DepositStep.FINAL_CONFIRMATION;
        default:
          return null;
      }
    }
  } else {
    if (isType2Transaction) {
      switch (action) {
        case Action.withdraw:
          return DepositStep.CONFIRM_DEPOSIT;
        case Action.DivestSent:
        case Action.DivestFailed:
        case Action.FundsReturnedError:
        case Action.ReturnFundsToUserSent:
        case Action.ReturnFundsToUserFailed:
        case Action.ReturnFundsFromStrategyFailed:
          return DepositStep.CROSS_CHAIN_TRANSFER;
        case Action.withdrew:
        case Action.failed:
          return DepositStep.FINAL_CONFIRMATION;
        default:
          return null;
      }
    } else {
      switch (action) {
        case Action.withdraw:
          return DepositStep.CONFIRM_DEPOSIT;
        case Action.withdrawconfirmed:
        case Action.DivestSent:
        case Action.DivestFailed:
        case Action.FundsDivested:
        case Action.CrossChainWithdrawFailed:
        case Action.ReturnFundsToUserSent:
        case Action.FundsReturnedError:
        case Action.ReturnFundsToUserFailed:
        case Action.ReturnFundsFromStrategyFailed:
          return DepositStep.CROSS_CHAIN_TRANSFER;
        case Action.withdrew:
        case Action.failed:
          return DepositStep.FINAL_CONFIRMATION;
        default:
          return null;
      }
    }
  }
};

const getStepDescription = (
  step: DepositStep,
  isDeposit: boolean = true,
  currentTab?: string,
): string => {
  const operationType = isDeposit ? "deposit" : "withdrawal";
  const isUnstake = currentTab === "Unstake";

  switch (step) {
    case DepositStep.SELECT_TOKEN:
      if (isUnstake) {
        return "Select the token and amount to unstake";
      }
      return `Select the token ${operationType === "deposit" ? "and amount you want to deposit" : "and amount to withdraw "}`;
    case DepositStep.CONFIRM_DEPOSIT:
      if (isUnstake) {
        return "Confirm unstake";
      }
      return `Confirm ${operationType}`;
    case DepositStep.CROSS_CHAIN_TRANSFER:
      return `Cross-chain transfer ${operationType === "deposit" ? " and investment of funds" : "(if needed)"}`;
    case DepositStep.FINAL_CONFIRMATION:
      if (isUnstake) {
        return "7-Day cooldown period initiated";
      }
      return `${operationType === "deposit" ? "Final confirmation and issue of shares" : "Funds arrive in your wallet"}`;
    default:
      return `${operationType} step`;
  }
};

const getUserStepStatus = (
  step: DepositStep,
  feedback: TransactionStepMessages,
  isType2Transaction: boolean,
  isDeposit: boolean = true,
  shouldShowFinalStep: boolean,
  isFailedOnConfirmation: boolean,
  currentTab?: string,
): {
  status: TransactionStepStatus;
  description: string;
  txHash?: string;
  isWaitingTooLong?: boolean;
} => {
  const relevantActions: Action[] = [];

  for (const actionKey in Action) {
    const action = Action[actionKey as keyof typeof Action];
    if (mapActionToUserStep(action, isType2Transaction, isDeposit) === step) {
      relevantActions.push(action);
    }
  }

  let latestStatus = TransactionStepStatus.pending;
  let description = getStepDescription(step, isDeposit, currentTab);
  let txHash: string | undefined;
  let isWaitingTooLong = false;

  for (const action of relevantActions) {
    const actionFeedback = feedback[action];
    if (actionFeedback) {
      latestStatus = actionFeedback.status;
      description = actionFeedback.description || description;
      txHash = actionFeedback.txHash || txHash;
      isWaitingTooLong = actionFeedback.isWaitingTooLong || isWaitingTooLong;

      if (
        shouldShowFinalStep &&
        actionFeedback.status !== TransactionStepStatus.error
      ) {
        latestStatus = TransactionStepStatus.completed;
      }
    }
  }

  if (isFailedOnConfirmation) {
    if (step === DepositStep.SELECT_TOKEN) {
      latestStatus = TransactionStepStatus.completed;
    }

    if (step === DepositStep.CONFIRM_DEPOSIT) {
      latestStatus = TransactionStepStatus.error;
    }
  }

  return { status: latestStatus, description, txHash, isWaitingTooLong };
};

interface UseInstructionStepLogicProps {
  transactionStepFeedback?: TransactionStepMessages;
  lastTransactionStepFeedback?: TransactionStepMessages;
  finishedTransaction?: boolean;
  activeChainId?: number;
  vaultStrategyChainId?: number;
  isDeposit?: boolean;
  currentTab?: string;
  isProcessing?: boolean;
  isFailedOnConfirmation?: boolean;
}

export const useInstructionStepLogic = ({
  transactionStepFeedback = {},
  lastTransactionStepFeedback = {},
  finishedTransaction = false,
  activeChainId,
  vaultStrategyChainId,
  isDeposit = true,
  currentTab,
  isProcessing: propIsProcessing = false,
  isFailedOnConfirmation = false,
}: UseInstructionStepLogicProps) => {
  const {
    currentInputBalance,
    currentErrorMessage,
    isTransactionProcessing,
    isButtonDisabled,
  } = useTransactionStore();

  const shouldShowFinalStep =
    finishedTransaction &&
    (Object.keys(lastTransactionStepFeedback).length > 0 ||
      Object.keys(transactionStepFeedback).length > 0) &&
    hasNoErrors(transactionStepFeedback) &&
    !isFailedOnConfirmation;

  const isUserOnZetachain = activeChainId ? isZetachain(activeChainId) : false;
  const isVaultOnZetachain = vaultStrategyChainId
    ? isZetachain(vaultStrategyChainId)
    : false;
  const isType2Transaction = isUserOnZetachain && !isVaultOnZetachain;

  const activeFeedback = finishedTransaction
    ? lastTransactionStepFeedback
    : transactionStepFeedback;

  const isFirstStepActive = useMemo(() => {
    const hasValidInput =
      currentInputBalance?.formatted &&
      Number(currentInputBalance.formatted) > 0 &&
      !currentErrorMessage;

    return hasValidInput && !isButtonDisabled;
  }, [currentInputBalance, currentErrorMessage, isButtonDisabled]);

  const isSecondStepActive = useMemo(() => {
    const hasApproveSuccess =
      activeFeedback[Action.depositApprove]?.status ===
        TransactionStepStatus.completed ||
      activeFeedback[Action.depositApproveConfirmed]?.status ===
        TransactionStepStatus.completed;

    const hasDepositWithdrawSuccess =
      activeFeedback[Action.deposit]?.status ===
        TransactionStepStatus.completed ||
      activeFeedback[Action.withdraw]?.status ===
        TransactionStepStatus.completed;

    if (hasApproveSuccess) {
      return hasDepositWithdrawSuccess;
    }
    return hasDepositWithdrawSuccess;
  }, [activeFeedback]);

  const isStaticMode = useMemo(() => {
    return (
      !isTransactionProcessing &&
      Object.keys(activeFeedback).length === 0 &&
      !isFirstStepActive
    );
  }, [isTransactionProcessing, activeFeedback, isFirstStepActive]);

  const isDynamicMode = useMemo(() => {
    return (
      (isTransactionProcessing ||
        Object.keys(activeFeedback).length > 0 ||
        isFirstStepActive) &&
      !isFailedOnConfirmation &&
      hasNoErrors(activeFeedback) &&
      !finishedTransaction
    );
  }, [
    isTransactionProcessing,
    activeFeedback,
    isFirstStepActive,
    isFailedOnConfirmation,
    finishedTransaction,
  ]);

  const steps = useMemo(() => {
    // For Noon Capital vaults on Withdraw tab, skip the first step
    // since the user has already done the unstaking process
    const isNoonCapitalWithdraw = !isDeposit && currentTab === "Withdraw";
    
    if (isNoonCapitalWithdraw) {
      return [
        DepositStep.CONFIRM_DEPOSIT,
        DepositStep.CROSS_CHAIN_TRANSFER,
        DepositStep.FINAL_CONFIRMATION,
      ];
    }
    
    return [
      DepositStep.SELECT_TOKEN,
      DepositStep.CONFIRM_DEPOSIT,
      DepositStep.CROSS_CHAIN_TRANSFER,
      DepositStep.FINAL_CONFIRMATION,
    ];
  }, [isDeposit, currentTab]);

  const {
    progressPercent,
    elephantPosition,
    completedSteps,
    currentStepIndex,
    currentStepDescription,
  } = useMemo(() => {
    if (isStaticMode) {
      return {
        progressPercent: 0,
        elephantPosition: 0,
        completedSteps: 0,
        currentStepIndex: DepositStep.SELECT_TOKEN,
        currentStepDescription: getStepDescription(
          DepositStep.SELECT_TOKEN,
          isDeposit,
          currentTab,
        ),
      };
    }

    let completedStepsCount = 0;
    let processingStepIndex = -1;
    let currentDesc = "";

    steps.forEach((step, index) => {
      if (step === DepositStep.SELECT_TOKEN) {
        if (isFirstStepActive) {
          completedStepsCount = Math.max(completedStepsCount, 1);
        }
      } else if (step === DepositStep.CONFIRM_DEPOSIT) {
        if (isSecondStepActive) {
          completedStepsCount = Math.max(completedStepsCount, 2);
        } else {
          const stepStatus = getUserStepStatus(
            step,
            activeFeedback,
            isType2Transaction,
            isDeposit,
            shouldShowFinalStep,
            isFailedOnConfirmation,
            currentTab,
          );
          if (
            stepStatus.status === TransactionStepStatus.processing &&
            processingStepIndex === -1
          ) {
            processingStepIndex = index;
          } else if (isFailedOnConfirmation) {
            completedStepsCount = 1;
          }
        }
      } else {
        const stepStatus = getUserStepStatus(
          step,
          activeFeedback,
          isType2Transaction,
          isDeposit,
          shouldShowFinalStep,
          isFailedOnConfirmation,
          currentTab,
        );

        if (stepStatus.status === TransactionStepStatus.completed) {
          completedStepsCount = Math.max(completedStepsCount, index + 1);
        } else if (
          stepStatus.status === TransactionStepStatus.processing &&
          processingStepIndex === -1
        ) {
          processingStepIndex = index;
        }
      }
    });

    let currentStepIdx = completedStepsCount;
    if (processingStepIndex > -1) {
      currentStepIdx = processingStepIndex;
    } else if (isFirstStepActive && completedStepsCount === 0) {
      currentStepIdx = DepositStep.SELECT_TOKEN;
    }

    if (shouldShowFinalStep) {
      currentStepIdx = 4;
      completedStepsCount = 4;
    }

    const currentStepStatusObj = getUserStepStatus(
      steps[currentStepIdx] || DepositStep.SELECT_TOKEN,
      activeFeedback,
      isType2Transaction,
      isDeposit,
      shouldShowFinalStep,
      isFailedOnConfirmation,
      currentTab,
    );
    currentDesc = currentStepStatusObj.description;

    let progress = (completedStepsCount / steps.length) * 100;
    if (
      processingStepIndex > -1 &&
      completedStepsCount === processingStepIndex
    ) {
      progress += (1 / steps.length) * 50;
    }

    const elephantPos = Math.min(progress + 2, 100);

    return {
      progressPercent: Math.min(progress, 100),
      elephantPosition: elephantPos,
      completedSteps: completedStepsCount,
      currentStepIndex: currentStepIdx,
      currentStepDescription: currentDesc,
    };
  }, [
    isStaticMode,
    isFirstStepActive,
    isSecondStepActive,
    activeFeedback,
    isType2Transaction,
    isDeposit,
    steps,
    shouldShowFinalStep,
    isFailedOnConfirmation,
  ]);

  return {
    isFirstStepActive,
    isSecondStepActive,
    isStaticMode,
    isDynamicMode,
    isType2Transaction,
    activeFeedback,
    progressPercent,
    elephantPosition,
    completedSteps,
    currentStepIndex,
    currentStepDescription,

    getUserStepStatus,
    getStepDescription,
    steps,
  };
};
