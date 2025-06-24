import React from "react";
import {
  TransactionStepMessages,
  TransactionStepStatus,
  Action,
} from "@/types/types";

import SelectTokenIcon from "@/components/svg/instruction/SelectTokenIcon";
import ConfirmDepositIcon from "@/components/svg/instruction/ConfirmDepositIcon";
import CrossChainTransferIcon from "@/components/svg/instruction/CrossChainTransferIcon";
import FinalConfirmationIcon from "@/components/svg/instruction/FinalConfirmationIcon";
import {
  DepositStep,
  useInstructionStepLogic,
} from "@/hooks/useInstructionStepLogic";
import { MoonLoader } from "react-spinners";
import Link from "next/link";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";

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

const DepositInstruction: React.FC<DepositInstructionProps> = (props) => {
  const { isDeposit = true } = props;

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
  } = useInstructionStepLogic(props);

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

          if (step === DepositStep.SELECT_TOKEN) {
            if (isFirstStepActive) {
              bgColor = "#1B46E0";
            }
          } else if (step === DepositStep.CONFIRM_DEPOSIT) {
            if (isSecondStepActive) {
              bgColor = "#1B46E0";
            } else {
              stepStatus = getUserStepStatus(
                step,
                activeFeedback,
                isType2Transaction,
                isDeposit,
              );
              if (stepStatus.status === TransactionStepStatus.processing) {
                bgColor = "#535E73";
                showLoader = true;
              } else if (stepStatus.status === TransactionStepStatus.error) {
                bgColor = "#DC2626";
              }
            }
          } else {
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
                className="rounded-full w-11 h-11 flex items-center justify-center flex-shrink-0"
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
                {step === DepositStep.SELECT_TOKEN ||
                step === DepositStep.CONFIRM_DEPOSIT
                  ? getStepDescription(step, isDeposit)
                  : stepStatus?.description ||
                    getStepDescription(step, isDeposit)}
              </p>
              {stepStatus?.txHash &&
                stepStatus.status === TransactionStepStatus.completed && (
                  <Link
                    href={stepStatus.txHash}
                    className="flex items-center gap-1 group text-white hover:text-blue-600"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ArrowTopRightOnSquareIcon
                      width="20"
                      height="20"
                      className="size-5"
                    />
                  </Link>
                )}
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
          className="absolute top-[-16px] transition-all duration-500 ease-out"
          style={{
            left: isDynamicMode ? `${elephantPosition}%` : "0%",
            transform: "translateX(-50%)",
            zIndex: 10,
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
    </div>
  );
};

export default DepositInstruction;
