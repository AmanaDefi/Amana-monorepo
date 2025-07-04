import { chainsWithCustomRpcs } from "@/constants/chainConfig";
import { Token } from "@/types/types";
import { Adapter } from "@solana/wallet-adapter-base";
import { Chain } from "viem";
import { Connector } from "wagmi";
import { create } from "zustand";

export type FundStep =
  | "chooseBuyWith"
  | "setValues"
  | "connectWallet"
  | "selectChain"
  | "confirm"
  | "reconnectChain"
  | "finishDeposit"
  | null;

export enum BuyWithEnum {
  CRYPTO = "crypto",
  FIAT = "fiat",
}

const initialState = {
  step: null,
  buyWith: null,
  chain: chainsWithCustomRpcs()[1],
  depositAmount: "",
  currency: undefined,
  activeConnector: null,
  walletAddress: "",
  transactionHash: null,
};

interface FundWalletState {
  step: FundStep;
  buyWith: BuyWithEnum | null;
  chain: Chain;
  depositAmount: string;
  currency: Token | undefined;
  activeConnector: Connector | Adapter | null;
  walletAddress: string;
  transactionHash: string | null;

  setStep: (step: FundStep) => void;
  setBuyWith: (buyWith: BuyWithEnum) => void;
  setChain: (chain: Chain) => void;
  setDepositAmount: (depositAmount: string) => void;
  setCurrency: (currency: Token | undefined) => void;
  closeAll: () => void;
  setActiveConnector: (connector: Connector | Adapter | null) => void;
  setWalletAddress: (walletAddress: string) => void;
  setTxHash: (transactionHash: string | null) => void;
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
  setTxHash: (transactionHash) => set({ transactionHash }),
  setCurrency: (currency) =>
    set({
      currency,
    }),
}));
