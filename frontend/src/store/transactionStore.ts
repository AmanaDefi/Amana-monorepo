import { TransactionStepMessages } from "@/types/types";
import { create } from "zustand";

interface TransactionState {
  finishedTransaction: boolean;
  lastTransactionStepFeedback: TransactionStepMessages;
  transactionStepFeedback: TransactionStepMessages;
  isTransactionProcessing: boolean,
  
  setIsTransactionProcessing: (isTransactionProcessing: boolean) => void;
  setFinishedTransaction: (finishedTransaction: boolean) => void;
  setTransactionStepFeedback: (
    transactionStepFeedback: TransactionStepMessages,
  ) => void;
  setLastTransactionStepFeedback: (
    lastTransactionStepFeedback: TransactionStepMessages,
  ) => void;
}
export const useTransactionStore = create<TransactionState>((set) => ({
  finishedTransaction: false,
  lastTransactionStepFeedback: {},
  transactionStepFeedback: {},
  isTransactionProcessing: false,

  setIsTransactionProcessing: (isTransactionProcessing) =>
    set({ isTransactionProcessing }),
  setFinishedTransaction: (finishedTransaction) => set({ finishedTransaction }),

  setTransactionStepFeedback: (transactionStepFeedback) =>
    set({ transactionStepFeedback }),
  setLastTransactionStepFeedback: (lastTransactionStepFeedback) =>
    set({ lastTransactionStepFeedback }),
}));
