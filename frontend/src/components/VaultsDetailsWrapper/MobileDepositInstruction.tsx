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
import { hasNoErrors, parseTransactionMessage } from "@/utils/utils";

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

const MobileDepositInstruction: React.FC<MobileDepositInstructionProps> = (
  props,
) => {
  const {
    isDeposit = true,
    isFailedOnConfirmation,
    transactionStepFeedback,
    lastTransactionStepFeedback,
  } = props;

  const {
    isFirstStepActive,
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
    steps,
  } = useInstructionStepLogic(props);

  let currentStepStatus = TransactionStepStatus.pending;
  let showLoader = false;

  const shouldShowFinalStep =
    props?.finishedTransaction &&
    (Object.keys(transactionStepFeedback ?? {}).length > 0 ||
      Object.keys(lastTransactionStepFeedback ?? {}).length > 0) &&
    hasNoErrors(transactionStepFeedback ?? {}) &&
    !isFailedOnConfirmation;

  if (currentStepIndex < steps.length) {
    if (
      currentStepIndex === DepositStep.SELECT_TOKEN &&
      isFirstStepActive &&
      Object.keys(activeFeedback).length === 0
    ) {
      currentStepStatus = TransactionStepStatus.processing;
      showLoader = false;
    } else {
      const stepStatus = getUserStepStatus(
        steps[currentStepIndex],
        activeFeedback,
        isType2Transaction,
        isDeposit,
        shouldShowFinalStep ?? false,
        isFailedOnConfirmation,
      );

      currentStepStatus = stepStatus.status;
      showLoader = currentStepStatus === TransactionStepStatus.processing;
    }
  }

  const { textBeforeHash, hashValue } = parseTransactionMessage(
    currentStepDescription,
  );
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
              style={{ width: `${progressPercent}%` }}
            />
          )}
        </div>
        <div
          className="absolute top-[-16px] transition-all duration-500 ease-out"
          style={{
            left: isDynamicMode ? `${elephantPosition}%` : "0%",
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
      </div>

      <div className="flex w-full flex-row gap-2 items-center">
        <div
          className="rounded-full w-6 h-6 flex items-center justify-center relative flex-shrink-0"
          style={{
            backgroundColor:
              currentStepStatus === TransactionStepStatus.error
                ? "#DC2626"
                : isFirstStepActive
                  ? "#1B46E0"
                  : currentStepStatus === TransactionStepStatus.completed
                    ? "#1B46E0"
                    : "#535E73",
          }}
        >
          {currentStepIndex < steps.length &&
            getStepIcon(steps[currentStepIndex])}

          {showLoader && (
            <div className="absolute inset-0 rounded-full">
              <div className="w-full h-full rounded-full border border-transparent border-t-blue-400 animate-spin"></div>
            </div>
          )}
        </div>

        <p className="text-sm break-words w-full font-normal tracking-[-0.06em] text-white">
          <span>{textBeforeHash}</span>
          {hashValue && <p className="!break-all">{hashValue}</p>}
        </p>
      </div>
    </div>
  );
};

export default MobileDepositInstruction;
