import { SUPPORTED_CHAINS } from "@/constants/chainConfig";
import { Token } from "@/types/types";
import { Chain } from "viem";
import { Connector } from "wagmi";
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
  chain: SUPPORTED_CHAINS[1],
  depositAmount: "",
  currency: undefined,
  activeConnector: null,
  walletAddress: "",
};

interface FundWalletState {
  step: FundStep;
  buyWith: BuyWithEnum | null;
  chain: Chain;
  depositAmount: string;
  currency: Token | undefined;
  activeConnector: Connector | null;
  walletAddress: string;

  setStep: (step: FundStep) => void;
  setBuyWith: (buyWith: BuyWithEnum) => void;
  setChain: (chain: Chain) => void;
  setDepositAmount: (depositAmount: string) => void;
  setCurrency: (currency: Token | undefined) => void;
  closeAll: () => void;
  setActiveConnector: (connector: Connector | null) => void;
  setWalletAddress: (walletAddress: string) => void;
}
export const useFundWalletStore = create<FundWalletState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  closeAll: () => {
    set({ ...initialState });
  },
  setActiveConnector: (activeConnector) => set({ activeConnector }),
  setBuyWith: (buyWith) => set({ buyWith }),
  setChain: (chain) => set({ chain }),
  setDepositAmount: (depositAmount) => set({ depositAmount }),
  setWalletAddress: (walletAddress) => set({ walletAddress }),
  setCurrency: (currency) =>
    set({
      currency,
    }),
}));
