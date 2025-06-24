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
}

export const useTransactionStore = create<TransactionState>((set) => ({
  finishedTransaction: false,
  lastTransactionStepFeedback: {},
  transactionStepFeedback: {},
  isTransactionProcessing: false,

  currentInputBalance: undefined,
  currentErrorMessage: "",
  crosschainInvestHash: "",

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
}));
