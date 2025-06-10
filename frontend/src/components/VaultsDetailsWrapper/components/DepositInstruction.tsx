import ConfirmDepositIcon from "@/components/svg/instruction/ConfirmDepositIcon";
import CrossChainTransferIcon from "@/components/svg/instruction/CrossChainTransferIcon";
import FinalConfirmationIcon from "@/components/svg/instruction/FinalConfirmationIcon";
import SelectTokenIcon from "@/components/svg/instruction/SelectTokenIcon";
import React from "react";
import {
  Action,
  TransactionStepMessages,
  TransactionStepStatus,
} from "@/types/types";
import { isZetachain } from "@/utils/utils";

export enum DepositStep {
  SELECT_TOKEN = 0,
  CONFIRM_DEPOSIT = 1,
  CROSS_CHAIN_TRANSFER = 2,
  FINAL_CONFIRMATION = 3,
}

interface DepositInstructionProps {
  transactionStepFeedback?: TransactionStepMessages;
  lastTransactionStepFeedback?: TransactionStepMessages;
  finishedTransaction?: boolean;

  activeChainId?: number;
  vaultStrategyChainId?: number;
  isDeposit?: boolean;

  currentStep?: DepositStep;
  isProcessing?: boolean;
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
        case Action.crosschainInvest:
          return DepositStep.CROSS_CHAIN_TRANSFER;
        case Action.deposited:
          return DepositStep.FINAL_CONFIRMATION;
        default:
          return null;
      }
    } else {
      switch (action) {
        case Action.deposit:
        case Action.depositConfirmed:
          return DepositStep.CONFIRM_DEPOSIT;
        case Action.crosschainInvest:
        case Action.FundsInvest:
          return DepositStep.CROSS_CHAIN_TRANSFER;
        case Action.deposited:
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
          return DepositStep.CROSS_CHAIN_TRANSFER;
        case Action.withdrew:
          return DepositStep.FINAL_CONFIRMATION;
        default:
          return null;
      }
    } else {
      switch (action) {
        case Action.withdraw:
        case Action.withdrawconfirmed:
          return DepositStep.CONFIRM_DEPOSIT;
        case Action.DivestSent:
        case Action.FundsDivested:
        case Action.ReturnFundsToUserSent:
          return DepositStep.CROSS_CHAIN_TRANSFER;
        case Action.withdrew:
          return DepositStep.FINAL_CONFIRMATION;
        default:
          return null;
      }
    }
  }
};

const getUserStepStatus = (
  step: DepositStep,
  feedback: TransactionStepMessages,
  isType2Transaction: boolean,
  isDeposit: boolean = true,
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
  let description = getStepDescription(step, isDeposit);
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
        latestStatus === TransactionStepStatus.processing ||
        latestStatus === TransactionStepStatus.completed
      ) {
        break;
      }
    }
  }

  return { status: latestStatus, description, txHash, isWaitingTooLong };
};

const getStepDescription = (
  step: DepositStep,
  isDeposit: boolean = true,
): string => {
  const operationType = isDeposit ? "deposit" : "withdrawal";

  switch (step) {
    case DepositStep.SELECT_TOKEN:
      return `Select the token you want to ${operationType === "deposit" ? "deposit" : "withdraw"}`;
    case DepositStep.CONFIRM_DEPOSIT:
      return `Confirm ${operationType}`;
    case DepositStep.CROSS_CHAIN_TRANSFER:
      return `Cross-chain transfer and ${operationType === "deposit" ? "investment" : "return"} of funds`;
    case DepositStep.FINAL_CONFIRMATION:
      return `Final confirmation and ${operationType === "deposit" ? "issue of shares" : "completion"}`;
    default:
      return `${operationType} step`;
  }
};

const getStepIcon = (step: DepositStep): React.ReactNode => {
  const iconProps = { width: 20, height: 20 };

  switch (step) {
    case DepositStep.SELECT_TOKEN:
      return <SelectTokenIcon {...iconProps} />;
    case DepositStep.CONFIRM_DEPOSIT:
      return <ConfirmDepositIcon {...iconProps} />;
    case DepositStep.CROSS_CHAIN_TRANSFER:
      return <CrossChainTransferIcon {...iconProps} />;
    case DepositStep.FINAL_CONFIRMATION:
      return <FinalConfirmationIcon {...iconProps} />;
    default:
      return <SelectTokenIcon {...iconProps} />;
  }
};

const DepositInstruction: React.FC<DepositInstructionProps> = ({
  transactionStepFeedback = {},
  lastTransactionStepFeedback = {},
  finishedTransaction = false,
  activeChainId,
  vaultStrategyChainId,
  isDeposit = true,
  currentStep,
  isProcessing = false,
}) => {
  const isUserOnZetachain = activeChainId ? isZetachain(activeChainId) : false;
  const isVaultOnZetachain = vaultStrategyChainId
    ? isZetachain(vaultStrategyChainId)
    : false;
  const isType2Transaction = isUserOnZetachain && !isVaultOnZetachain;

  const activeFeedback = finishedTransaction
    ? lastTransactionStepFeedback
    : transactionStepFeedback;

  const isStaticMode =
    !isProcessing && Object.keys(activeFeedback).length === 0;
  const isDynamicMode = isProcessing || Object.keys(activeFeedback).length > 0;

  const steps = [
    DepositStep.SELECT_TOKEN,
    DepositStep.CONFIRM_DEPOSIT,
    DepositStep.CROSS_CHAIN_TRANSFER,
    DepositStep.FINAL_CONFIRMATION,
  ];
  const calculateProgress = () => {
    if (isStaticMode) return { progressPercent: 0, elephantPosition: 0 };

    let completedSteps = 0;
    let processingStep = -1;

    steps.forEach((step, index) => {
      if (
        step === DepositStep.SELECT_TOKEN &&
        Object.keys(activeFeedback).length > 0
      ) {
        completedSteps = Math.max(completedSteps, 1);
      } else if (step !== DepositStep.SELECT_TOKEN) {
        const stepStatus = getUserStepStatus(
          step,
          activeFeedback,
          isType2Transaction,
          isDeposit,
        );

        if (stepStatus.status === TransactionStepStatus.completed) {
          completedSteps = Math.max(completedSteps, index + 1);
        } else if (
          stepStatus.status === TransactionStepStatus.processing &&
          processingStep === -1
        ) {
          processingStep = index;
        }
      }
    });

    let progressPercent = (completedSteps / steps.length) * 100;
    if (processingStep > -1 && completedSteps === processingStep) {
      progressPercent += (1 / steps.length) * 50;
    }

    const elephantPosition = Math.min(progressPercent + 2, 100);

    return {
      progressPercent: Math.min(progressPercent, 100),
      elephantPosition,
    };
  };

  const { progressPercent, elephantPosition } = calculateProgress();

  return (
    <div className="flex flex-col gap-[30px]">
      {steps.map((step, index) => {
        if (isStaticMode) {
          return (
            <div key={step} className="flex flex-row gap-4 items-center">
              <div
                className="rounded-full w-11 h-11 flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#535E73" }}
              >
                {getStepIcon(step)}
              </div>
              <p className="text-[18px] font-bold tracking-[-0.06em] text-white">
                {getStepDescription(step, isDeposit)}
              </p>
            </div>
          );
        }

        if (isDynamicMode) {
          let stepStatus;
          let bgColor = "#535E73";
          let showLoader = false;

          if (
            step === DepositStep.SELECT_TOKEN &&
            Object.keys(activeFeedback).length > 0
          ) {
            bgColor = "#1B46E0";
          } else if (step !== DepositStep.SELECT_TOKEN) {
            stepStatus = getUserStepStatus(
              step,
              activeFeedback,
              isType2Transaction,
              isDeposit,
            );

            if (stepStatus.status === TransactionStepStatus.processing) {
              bgColor = "#535E73";
              showLoader = true;
            } else if (stepStatus.status === TransactionStepStatus.completed) {
              bgColor = "#1B46E0";
            } else if (stepStatus.status === TransactionStepStatus.error) {
              bgColor = "#DC2626";
            }
          }

          return (
            <div key={step} className="flex flex-row gap-4 items-center">
              <div
                className="rounded-full w-11 h-11 flex items-center justify-center relative flex-shrink-0"
                style={{ backgroundColor: bgColor }}
              >
                {getStepIcon(step)}

                {showLoader && (
                  <div className="absolute inset-0 rounded-full">
                    <div className="w-full h-full rounded-full border-2 border-transparent border-t-blue-400 animate-spin"></div>
                  </div>
                )}
              </div>

              <p className="text-[18px] font-bold tracking-[-0.06em] text-white">
                {step === DepositStep.SELECT_TOKEN
                  ? getStepDescription(step, isDeposit)
                  : stepStatus?.description ||
                    getStepDescription(step, isDeposit)}
              </p>
            </div>
          );
        }

        return null;
      })}

      <div className="relative w-full">
        <div className="rounded-[4px] h-[2px] bg-[#535E73] relative overflow-hidden">
          {isDynamicMode && (
            <div
              className="absolute left-0 top-0 h-full bg-[#1B46E0] transition-all duration-500 ease-out rounded-[4px]"
              style={{ width: `${progressPercent}%` }}
            />
          )}
        </div>
        <div
          className="absolute top-[-8px] transition-all duration-500 ease-out"
          style={{
            left: isDynamicMode ? `${elephantPosition}%` : "0%",
            transform: "translateX(-50%)",
            zIndex: 10,
          }}
        >
          <img
            src="/elephant.png"
            alt="Progress elephant"
            className="w-6 h-6"
            style={{
              filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))",
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              if (target.parentElement) {
                target.parentElement.innerHTML =
                  '<div class="text-xl">🐘</div>';
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DepositInstruction;
