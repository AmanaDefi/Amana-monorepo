import React from "react";
import {
  TransactionStepMessages,
  TransactionStepStatus,
  Action,
} from "@/types/types";
import { DepositStep } from "@/hooks/useInstructionStepLogic";
import SelectTokenIcon from "../svg/instruction/SelectTokenIcon";
import ConfirmDepositIcon from "../svg/instruction/ConfirmDepositIcon";
import CrossChainTransferIcon from "../svg/instruction/CrossChainTransferIcon";
import FinalConfirmationIcon from "../svg/instruction/FinalConfirmationIcon";
import { useInstructionStepLogic } from "@/hooks/useInstructionStepLogic";
import { hasNoErrors } from "@/utils/utils";

interface MobileDepositInstructionProps {
  transactionStepFeedback?: TransactionStepMessages;
  lastTransactionStepFeedback?: TransactionStepMessages;
  finishedTransaction?: boolean;
  activeChainId?: number;
  vaultStrategyChainId?: number;
  isDeposit?: boolean;
  currentStep?: DepositStep;
  isProcessing?: boolean;
  isFailedOnConfirmation: boolean;
}

const getStepIcon = (step: DepositStep): React.ReactNode => {
  const iconProps = { width: 14, height: 14 };

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

const getStepState = (
  step: DepositStep,
  currentStepIndex: number,
  completedSteps: number,
  isFirstStepActive: any,
  isSecondStepActive: any,
  activeFeedback: TransactionStepMessages,
  isType2Transaction: boolean,
  isDeposit: boolean,
  getUserStepStatus: any,
  isStaticMode: boolean,
  isFailedOnConfirmation: boolean,
  finishedTransaction: boolean,
) => {
  if (isFailedOnConfirmation && step === DepositStep.CONFIRM_DEPOSIT) {
    return "error";
  }

  if (isStaticMode && step === DepositStep.SELECT_TOKEN) {
    return "active";
  }

  if (step < completedSteps) {
    return "completed";
  }

  if (step === currentStepIndex) {
    if (step === DepositStep.SELECT_TOKEN && !!isFirstStepActive) {
      return "active";
    }
    if (step === DepositStep.CONFIRM_DEPOSIT && !!isSecondStepActive) {
      return "active";
    }

    const shouldShowFinalStep =
      finishedTransaction &&
      Object.keys(activeFeedback ?? {}).length > 0 &&
      hasNoErrors(activeFeedback ?? {}) &&
      !isFailedOnConfirmation;

    const stepStatus = getUserStepStatus(
      step,
      activeFeedback,
      isType2Transaction,
      isDeposit,
      shouldShowFinalStep,
      isFailedOnConfirmation,
    );

    if (stepStatus.status === TransactionStepStatus.processing) {
      return "processing";
    }
    if (stepStatus.status === TransactionStepStatus.error) {
      return "error";
    }

    return "active";
  }

  return "pending";
};

const MobileDepositInstruction: React.FC<MobileDepositInstructionProps> = (
  props,
) => {
  const {
    isDeposit = true,
    finishedTransaction = false,
    isFailedOnConfirmation,
  } = props;

  const {
    isFirstStepActive,
    isSecondStepActive,
    isStaticMode,
    isDynamicMode,
    isType2Transaction,
    activeFeedback,
    progressPercent,
    elephantPosition,
    getUserStepStatus,
    getStepDescription,
    steps,
    currentStepIndex,
    completedSteps,
  } = useInstructionStepLogic(props);

  const shouldShowElephant = isDynamicMode && progressPercent > 0;

  const isTransactionComplete =
    finishedTransaction &&
    Object.keys(activeFeedback ?? {}).length > 0 &&
    hasNoErrors(activeFeedback ?? {}) &&
    !isFailedOnConfirmation;

  let currentStep = steps[currentStepIndex] || steps[0];

  if (isTransactionComplete) {
    currentStep = steps[steps.length - 1];
  }

  const currentStepState = getStepState(
    currentStep,
    currentStepIndex,
    completedSteps,
    isFirstStepActive,
    isSecondStepActive,
    activeFeedback,
    isType2Transaction,
    isDeposit,
    getUserStepStatus,
    isStaticMode,
    isFailedOnConfirmation,
    finishedTransaction,
  );

  let bgColor = "#535E73";
  let showLoader = false;
  let textColor = "#FFFFFF";

  if (isTransactionComplete) {
    bgColor = "#1B46E0";
    textColor = "#FFFFFF";
  } else {
    switch (currentStepState) {
      case "completed":
        bgColor = "#1B46E0";
        textColor = "#FFFFFF";
        break;
      case "active":
        bgColor = "#535E73";
        textColor = "#FFFFFF";
        break;
      case "processing":
        bgColor = "#535E73";
        showLoader = true;
        textColor = "#FFFFFF";
        break;
      case "error":
        bgColor = "#FF1E1E";
        textColor = "#FFFFFF";
        break;
      default:
        bgColor = "#535E73";
        textColor = "#FFFFFF";
    }
  }

  if (isStaticMode && currentStep === DepositStep.SELECT_TOKEN) {
    textColor = "#FFFFFF";
  }

  let stepDescription = getStepDescription(currentStep, isDeposit);

  if (isTransactionComplete) {
    stepDescription = isDeposit
      ? "Deposit completed successfully!"
      : "Withdrawal completed successfully!";
  } else if (
    currentStep !== DepositStep.SELECT_TOKEN &&
    currentStep !== DepositStep.CONFIRM_DEPOSIT
  ) {
    const shouldShowFinalStep =
      finishedTransaction &&
      Object.keys(activeFeedback ?? {}).length > 0 &&
      hasNoErrors(activeFeedback ?? {}) &&
      !isFailedOnConfirmation;

    const stepStatus = getUserStepStatus(
      currentStep,
      activeFeedback,
      isType2Transaction,
      isDeposit,
      shouldShowFinalStep,
      isFailedOnConfirmation,
    );

    if (stepStatus?.description) {
      stepDescription = stepStatus.description;
    }
  }

  return (
    <div className="flex flex-col gap-[20px] bg-[#14171F] py-4 px-[14px] rounded-lg">
      <div>
        <h3 className="text-base font-bold text-white mb-2">
          {isDeposit ? "Deposit" : "Withdraw"} flow
        </h3>
        <p className="text-sm text-gray-400">
          {completedSteps} out of {steps.length} steps completed
        </p>
      </div>

      <div className="relative w-full">
        <div className="rounded-[2px] h-[1px] bg-[#535E73] relative overflow-hidden">
          {isDynamicMode && (
            <div
              className="absolute left-0 top-0 h-full bg-[#1B46E0] transition-all duration-500 ease-out rounded-[2px]"
              style={{
                width: `${isTransactionComplete ? 100 : progressPercent}%`,
              }}
            />
          )}
        </div>

        {(shouldShowElephant || isTransactionComplete) && (
          <div
            className="absolute top-[-16px] transition-all duration-500 ease-out"
            style={{
              left: `${isTransactionComplete ? 100 : Math.max(0, elephantPosition - 4)}%`,
              transform: "translateX(-50%)",
              zIndex: 1,
            }}
          >
            <img
              src="/elephant.gif"
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
        )}
      </div>

      <div className="flex w-full flex-row gap-2 items-center">
        <div
          className="rounded-full w-6 h-6 flex items-center justify-center relative flex-shrink-0 transition-colors duration-300"
          style={{ backgroundColor: bgColor }}
        >
          {getStepIcon(currentStep)}

          {showLoader && (
            <div className="absolute inset-0 rounded-full">
              <div className="w-full h-full rounded-full border border-transparent border-t-blue-400 animate-spin"></div>
            </div>
          )}
        </div>

        <p
          className="text-sm break-all w-full font-normal tracking-[-0.06em] transition-colors duration-300"
          style={{ color: textColor }}
        >
          {stepDescription}
        </p>
      </div>
    </div>
  );
};

export default MobileDepositInstruction;
