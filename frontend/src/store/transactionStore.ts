import { Balance, TransactionStepMessages } from "@/types/types";
import { create } from "zustand";

interface TransactionState {
  currentVaultId: string | null;
  finishedTransaction: boolean;
  failedTransaction: boolean;
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

  // New fields for deposit calculation caching
  lastDepositCalculation: {
    inputAmount: string;
    vaultId: string;
    result: any;
    timestamp: number;
  } | null;

  setCurrentVaultId: (vaultId: string | null) => void;
  setIsTransactionProcessing: (isTransactionProcessing: boolean) => void;
  setFinishedTransaction: (finishedTransaction: boolean) => void;
  setFailedTransaction: (failedTransaction: boolean) => void;
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

  setLastDepositCalculation: (
    calculation: {
      inputAmount: string;
      vaultId: string;
      result: any;
      timestamp: number;
    } | null,
  ) => void;

  // Clear deposit calculation cache
  clearDepositCalculationCache: () => void;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  currentVaultId: null,
  finishedTransaction: false,
  failedTransaction: false,
  lastTransactionStepFeedback: {},
  transactionStepFeedback: {},
  isTransactionProcessing: false,

  currentInputBalance: undefined,
  currentErrorMessage: "",
  crosschainInvestHash: "",

  lastDepositInfo: null,
  lastWithdrawInfo: null,
  lastDepositCalculation: null,
  isFailedOnConfirmation: false,

  setCurrentVaultId: (currentVaultId) => set({ currentVaultId }),
  setIsTransactionProcessing: (isTransactionProcessing) =>
    set({ isTransactionProcessing }),
  setFinishedTransaction: (finishedTransaction) => set({ finishedTransaction }),
  setFailedTransaction: (failedTransaction) => set({ failedTransaction }),
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
  setIsFailedOnCOnfirmation: (isFailedOnConfirmation) =>
    set({ isFailedOnConfirmation }),

  setLastDepositInfo: (info) => set({ lastDepositInfo: info }),
  setLastWithdrawInfo: (info) => set({ lastWithdrawInfo: info }),
  setLastDepositCalculation: (calculation) =>
    set({ lastDepositCalculation: calculation }),

  // Clear deposit calculation cache
  clearDepositCalculationCache: () => set({ lastDepositCalculation: null }),
}));
