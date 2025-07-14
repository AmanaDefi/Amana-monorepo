import { Balance, TransactionStepMessages } from "@/types/types";
import { create } from "zustand";

interface TransactionState {
  finishedTransaction: boolean;
  lastTransactionStepFeedback: TransactionStepMessages;
  transactionStepFeedback: TransactionStepMessages;
  isTransactionProcessing: boolean;

  currentInputBalance?: Balance;
  currentErrorMessage: string;
  crosschainInvestHash: string;
  isFailedOnConfirmation: boolean;

  lastDepositInfo: {
    inputAmount: string;
    outputAmount: string;
    inputSymbol: string;
    outputSymbol: string;
  } | null;

  lastWithdrawInfo: {
    inputAmount: string;
    outputAmount: string;
    inputSymbol: string;
    outputSymbol: string;
  } | null;

  setIsTransactionProcessing: (isTransactionProcessing: boolean) => void;
  setFinishedTransaction: (finishedTransaction: boolean) => void;
  setTransactionStepFeedback: (
    transactionStepFeedback: TransactionStepMessages,
  ) => void;
  setLastTransactionStepFeedback: (
    lastTransactionStepFeedback: TransactionStepMessages,
  ) => void;

  setCurrentInputBalance: (balance?: Balance) => void;
  setCurrentErrorMessage: (error: string) => void;
  setCrosschainInvestHash: (hash: string) => void;
  setIsFailedOnCOnfirmation: (isFailedOnConfirmation: boolean) => void;

  isButtonDisabled: boolean;
  setIsButtonDisabled: (disabled: boolean) => void;

  setLastDepositInfo: (
    info: {
      inputAmount: string;
      outputAmount: string;
      inputSymbol: string;
      outputSymbol: string;
    } | null,
  ) => void;

  setLastWithdrawInfo: (
    info: {
      inputAmount: string;
      outputAmount: string;
      inputSymbol: string;
      outputSymbol: string;
    } | null,
  ) => void;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  finishedTransaction: false,
  lastTransactionStepFeedback: {},
  transactionStepFeedback: {},
  isTransactionProcessing: false,

  currentInputBalance: undefined,
  currentErrorMessage: "",
  crosschainInvestHash: "",

  lastDepositInfo: null,
  lastWithdrawInfo: null,
  isFailedOnConfirmation: false,

  setIsTransactionProcessing: (isTransactionProcessing) =>
    set({ isTransactionProcessing }),
  setFinishedTransaction: (finishedTransaction) => set({ finishedTransaction }),
  setTransactionStepFeedback: (transactionStepFeedback) =>
    set({ transactionStepFeedback }),
  setLastTransactionStepFeedback: (lastTransactionStepFeedback) =>
    set({ lastTransactionStepFeedback }),

  setCurrentInputBalance: (currentInputBalance) => set({ currentInputBalance }),
  setCurrentErrorMessage: (currentErrorMessage) => set({ currentErrorMessage }),
  setCrosschainInvestHash: (crosschainInvestHash) =>
    set({ crosschainInvestHash }),

  isButtonDisabled: true,
  setIsButtonDisabled: (disabled) => set({ isButtonDisabled: disabled }),
  setIsFailedOnCOnfirmation: (isFailedOnConfirmation) => set({ isFailedOnConfirmation }),

  setLastDepositInfo: (info) => set({ lastDepositInfo: info }),
  setLastWithdrawInfo: (info) => set({ lastWithdrawInfo: info }),
}));
