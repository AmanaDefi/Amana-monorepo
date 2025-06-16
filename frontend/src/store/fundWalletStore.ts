import { SUPPORTED_CHAINS } from "@/constants/chainConfig";
import { Token } from "@/types/types";
import { Chain } from "viem";
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
  chain: SUPPORTED_CHAINS[0].chain,
  depositAmount: "",
  currency: null,
};

interface FundWalletState {
  step: FundStep;
  buyWith: BuyWithEnum | null;
  chain: Chain;
  depositAmount: string;
  currency: Token | null;

  setStep: (step: FundStep) => void;
  setBuyWith: (buyWith: BuyWithEnum) => void;
  setChain: (chain: Chain) => void;
  setDepositAmount: (depositAmount: string) => void;
  setCurrency: (currency: Token) => void;
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
      chain: SUPPORTED_CHAINS[0].chain,
      depositAmount: "",
      currency: null,
    }),
  setBuyWith: (buyWith) => set({ buyWith }),
  setChain: (chain) => set({ chain }),
  setDepositAmount: (depositAmount) => set({ depositAmount }),
  setCurrency: (currency) =>
    set({
      currency,
    }),
}));
