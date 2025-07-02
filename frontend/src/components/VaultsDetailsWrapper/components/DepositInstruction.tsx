import React from "react";
import { motion, AnimatePresence } from "framer-motion";
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
) => {
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

    const stepStatus = getUserStepStatus(
      step,
      activeFeedback,
      isType2Transaction,
      isDeposit,
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

const stepVariants = {
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
      type: "spring" as const,
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
      type: "spring" as const,
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

const highlightVariants = {
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

const progressVariants = {
  initial: { width: "0%" },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: {
      duration: 1.2,
      ease: "easeOut",
    },
  }),
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
    currentStepIndex,
    completedSteps,
  } = useInstructionStepLogic(props);

  const shouldShowElephant = isDynamicMode && progressPercent > 0;

  return (
    <motion.div
      className="flex flex-col gap-[30px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <AnimatePresence mode="wait">
        {steps.map((step, index) => {
          const stepState = getStepState(
            step,
            currentStepIndex,
            completedSteps,
            isFirstStepActive,
            isSecondStepActive,
            activeFeedback,
            isType2Transaction,
            isDeposit,
            getUserStepStatus,
            isStaticMode,
          );

          let stepStatus;
          let bgColor = "#535E73";
          let showLoader = false;
          let isHighlighted = false;
          let textColor = "#9A9CB3";

          switch (stepState) {
            case "completed":
              bgColor = "#1B46E0";
              textColor = "#FFFFFF";
              break;
            case "active":
              bgColor = "#535E73";
              isHighlighted = true;
              textColor = "#FFFFFF";
              break;
            case "processing":
              bgColor = "#535E73";
              showLoader = true;
              isHighlighted = true;
              textColor = "#FFFFFF";
              break;
            case "error":
              bgColor = "#535E73";
              textColor = "#FFFFFF";
              break;
            default:
              bgColor = "#535E73";
              textColor = "#9A9CB3";
          }

          if (isStaticMode && step === DepositStep.SELECT_TOKEN) {
            isHighlighted = true;
            textColor = "#FFFFFF";
          }

          if (
            step !== DepositStep.SELECT_TOKEN &&
            step !== DepositStep.CONFIRM_DEPOSIT
          ) {
            stepStatus = getUserStepStatus(
              step,
              activeFeedback,
              isType2Transaction,
              isDeposit,
            );
          }

          return (
            <motion.div
              key={`step-${step}`}
              className="relative"
              variants={stepVariants}
              initial="pending"
              animate={stepState}
              layout
            >
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

              <div className="relative flex flex-row gap-4 items-center z-10">
                <motion.div
                  className="relative rounded-full w-11 h-11 flex items-center justify-center flex-shrink-0 transition-colors duration-300"
                  style={{ backgroundColor: bgColor }}
                  animate={
                    isHighlighted
                      ? {
                          boxShadow: [
                            "0 0 0 0 rgba(62, 115, 196, 0)",
                            "0 0 0 4px rgba(62, 115, 196, 0.2)",
                            "0 0 0 0 rgba(62, 115, 196, 0)",
                          ],
                        }
                      : {}
                  }
                  transition={{ duration: 2, repeat: Infinity }}
                >
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

                  <div>{getStepIcon(step)}</div>
                  <AnimatePresence>
                    {showLoader && (
                      <motion.div
                        className="absolute inset-0 rounded-full flex items-center justify-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <motion.div
                          className="w-11 h-11 rounded-full border-2 border-transparent border-t-gray-400"
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
                  <AnimatePresence>
                    {stepState === "completed" && (
                      <motion.div
                        className="absolute inset-0 rounded-full flex items-center justify-center"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: "spring" as const,
                          stiffness: 400,
                          damping: 20,
                        }}
                      >
                        <motion.svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                        >
                          <motion.path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </motion.svg>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <div className="flex-1">
                  <motion.p
                    className="text-[18px] font-normal tracking-[-0.06em] transition-all duration-300"
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
                    {step === DepositStep.SELECT_TOKEN ||
                    step === DepositStep.CONFIRM_DEPOSIT
                      ? getStepDescription(step, isDeposit)
                      : stepStatus?.description ||
                        getStepDescription(step, isDeposit)}
                  </motion.p>
                </div>
                <AnimatePresence>
                  {stepStatus?.txHash &&
                    stepStatus.status === TransactionStepStatus.completed && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Link
                          href={stepStatus.txHash}
                          className="flex items-center gap-1 group text-white hover:text-blue-600 transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ArrowTopRightOnSquareIcon
                            width="20"
                            height="20"
                            className="size-5"
                          />
                        </Link>
                      </motion.div>
                    )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <div className="relative w-full">
        <div className="rounded-[4px] h-[2px] relative overflow-hidden bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600">
          <AnimatePresence>
            {isDynamicMode && (
              <>
                <motion.div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 rounded-[4px]"
                  variants={progressVariants}
                  initial="initial"
                  animate="animate"
                  custom={progressPercent}
                />
                <motion.div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-60 rounded-[4px]"
                  style={{ width: `${Math.min(progressPercent + 5, 100)}%` }}
                  animate={{
                    x: ["-20%", "120%"],
                    opacity: [0, 0.8, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5,
                  }}
                />
              </>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {shouldShowElephant && (
            <motion.div
              className="absolute top-[-16px] z-10"
              style={{
                left: `${elephantPosition}%`,
                transform: "translateX(-50%)",
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
    </motion.div>
  );
};

export default DepositInstruction;
