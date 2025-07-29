import React from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
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

const stepVariants: Variants = {
  pending: {
    scale: 1,
    opacity: 0.7,
    x: 0,
  },
  active: {
    scale: 1.02,
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
  processing: {
    scale: 1,
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
    },
  },
  completed: {
    scale: 1,
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  error: {
    scale: 1,
    opacity: 1,
    x: [-2, 2, -2, 2, 0],
    transition: {
      x: {
        duration: 0.5,
        ease: "easeInOut",
      },
    },
  },
};

const highlightVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: [0, 0.4, 0],
    scale: [0.95, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const MobileDepositInstruction: React.FC<MobileDepositInstructionProps> = (
  props,
) => {
  const {
    isDeposit = true,
    finishedTransaction = false,
    isFailedOnConfirmation,
    transactionStepFeedback,
    lastTransactionStepFeedback,
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
    completedSteps,
    currentStepIndex,
    getUserStepStatus,
    getStepDescription,
    steps,
  } = useInstructionStepLogic(props);

  const currentStep = steps[currentStepIndex] || DepositStep.SELECT_TOKEN;

  const stepState = getStepState(
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

  let currentStepStatus = TransactionStepStatus.pending;
  let showLoader = false;
  let isHighlighted = false;
  let textColor = "#9A9CB3";

  switch (stepState) {
    case "completed":
      currentStepStatus = TransactionStepStatus.completed;
      showLoader = false;
      textColor = "#FFFFFF";
      break;
    case "active":
      currentStepStatus = TransactionStepStatus.pending;
      showLoader = false;
      isHighlighted = true;
      textColor = "#FFFFFF";
      break;
    case "processing":
      currentStepStatus = TransactionStepStatus.processing;
      showLoader = true;
      isHighlighted = true;
      textColor = "#FFFFFF";
      break;
    case "error":
      currentStepStatus = TransactionStepStatus.error;
      showLoader = false;
      textColor = "#FFFFFF";
      break;
    default:
      currentStepStatus = TransactionStepStatus.pending;
      showLoader = false;
      textColor = "#9A9CB3";
  }

  if (isStaticMode && currentStep === DepositStep.SELECT_TOKEN) {
    isHighlighted = true;
    textColor = "#FFFFFF";
  }

  let stepStatus;
  if (
    currentStep !== DepositStep.SELECT_TOKEN &&
    currentStep !== DepositStep.CONFIRM_DEPOSIT
  ) {
    const shouldShowFinalStep =
      finishedTransaction &&
      Object.keys(activeFeedback ?? {}).length > 0 &&
      hasNoErrors(activeFeedback ?? {}) &&
      !isFailedOnConfirmation;

    stepStatus = getUserStepStatus(
      currentStep,
      activeFeedback,
      isType2Transaction,
      isDeposit,
      shouldShowFinalStep,
      isFailedOnConfirmation,
    );
  }

  const fullDescription =
    currentStep === DepositStep.SELECT_TOKEN ||
    currentStep === DepositStep.CONFIRM_DEPOSIT
      ? getStepDescription(currentStep, isDeposit)
      : stepStatus?.description || getStepDescription(currentStep, isDeposit);

  const { textBeforeHash, hashValue } =
    parseTransactionMessage(fullDescription);

  return (
    <motion.div
      className="flex flex-col gap-[20px] bg-[#14171F] py-4 px-[14px] rounded-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
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
            <motion.div
              className="absolute left-0 top-0 h-full bg-[#1B46E0] transition-all duration-500 ease-out rounded-[2px]"
              initial={{ width: "0%" }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          )}
        </div>
        <AnimatePresence>
          {isDynamicMode && progressPercent > 0 && (
            <motion.div
              className="absolute top-[-16px] transition-all duration-500 ease-out"
              style={{
                left: `${Math.max(0, elephantPosition - 4)}%`,
                transform: "translateX(-50%)",
                zIndex: 1,
              }}
              initial={{ opacity: 0, scale: 0, y: -10 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: [0, -3, 0],
              }}
              exit={{ opacity: 0, scale: 0, y: -10 }}
              transition={{
                left: { duration: 1.2, ease: "easeOut" },
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 },
                y: {
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            >
              <motion.img
                src="/elephant.gif"
                alt="Progress elephant"
                className="w-6 h-6"
                style={{
                  filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))",
                }}
                animate={{
                  rotate: [0, 2, -2, 0],
                }}
                transition={{
                  rotate: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className="relative"
        variants={stepVariants}
        initial="pending"
        animate={stepState}
        layout
      >
        {currentStepStatus !== TransactionStepStatus.completed && (
          <AnimatePresence>
            {isHighlighted && (
              <motion.div
                className="absolute inset-0 -mx-4 -my-2 rounded-lg bg-gradient-to-r from-gray-500/10 via-gray-400/20 to-gray-500/10"
                variants={highlightVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              />
            )}
          </AnimatePresence>
        )}

        <div className="relative flex w-full flex-row gap-2 items-center z-10">
          <motion.div
            className="rounded-full w-6 h-6 flex items-center justify-center relative flex-shrink-0 transition-colors duration-300"
            style={{
              backgroundColor:
                currentStepStatus === TransactionStepStatus.error
                  ? "#DC2626"
                  : isFirstStepActive ||
                      currentStepStatus === TransactionStepStatus.completed
                    ? "#1B46E0"
                    : "#535E73",
            }}
          >
            {currentStepStatus !== TransactionStepStatus.completed && (
              <AnimatePresence>
                {isHighlighted && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-[#3E73C4]"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    exit={{ scale: 1, opacity: 0 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </AnimatePresence>
            )}

            <div>{getStepIcon(currentStep)}</div>

            <AnimatePresence>
              {showLoader && (
                <motion.div
                  className="absolute inset-0 rounded-full flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <motion.div
                    className="w-6 h-6 rounded-full border border-transparent border-t-gray-400"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.p
            className="text-sm break-words w-full font-normal tracking-[-0.06em] transition-all duration-300"
            style={{ color: textColor }}
            animate={
              isHighlighted
                ? {
                    color: [textColor, "#FFFFFF", textColor],
                  }
                : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span>{textBeforeHash}</span>
            {hashValue && <p className="!break-all">{hashValue}</p>}
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MobileDepositInstruction;
