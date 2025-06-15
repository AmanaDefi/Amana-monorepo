import { create } from "zustand";

export type FundStep =
  | "chooseBuyWith"
  | "setValues"
  | "connectWallet"
  | "confirm"
  | null;

export enum BuyWithEnum {
  CRYPTO = "crypto",
  FIAT = "fiat",
}

const initialState = {
  step: null,
  buyWith: null,
  networkId: null,
  depositAmount: 0,
  currency: null,
};

interface FundWalletState {
  step: FundStep;
  buyWith: BuyWithEnum | null;
  networkId: number | null;
  depositAmount: number;
  currency: string | null;

  setStep: (step: FundStep) => void;
  setBuyWith: (buyWith: BuyWithEnum) => void;
  setNetworkId: (networkId: number) => void;
  setDepositAmount: (depositAmount: number) => void;
  setCurrency: (currency: string) => void;
  successTopUp: () => void;
  closeAll: () => void;
}
export const useFundWalletStore = create<FundWalletState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  closeAll: () => {set({...initialState})},
  successTopUp: () =>
    set({
      step: null,
      buyWith: null,
      networkId: null,
      depositAmount: 0,
      currency: null,
    }),
  setBuyWith: (buyWith) => set({ buyWith }),
  setNetworkId: (networkId) => set({ networkId }),
  setDepositAmount: (depositAmount) => set({ depositAmount }),
  setCurrency: (currency) =>
    set({
      currency,
    }),
}));
