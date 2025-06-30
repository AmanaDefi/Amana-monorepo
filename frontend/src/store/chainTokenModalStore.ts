import { create } from "zustand";
import { Chain } from "viem";
import { Token, VaultData } from "@/types/types";

interface ChainTokenModalStore {
  isOpen: boolean;
  selectedChainFromModal: Chain | null;
  selectedTokenFromModal: Token | null;
  onSelectChainCallback: ((chain: Chain) => void) | null;
  onSelectChainAndTokenCallback: ((chain: Chain, token: Token) => void) | null;
  vaultDataForModal: VaultData | null;
  isFromTopUpForModal: boolean;

  openModal: (
    currentSelectedChain: Chain | null,
    currentSelectedToken: Token | null,
    onSelectChain?: (chain: Chain) => void,
    onSelectChainAndToken?: (chain: Chain, token: Token) => void,
    vaultData?: VaultData,
    isFromTopUp?: boolean,
  ) => void;

  closeModal: () => void;
  setSelectedChainFromModal: (chain: Chain | null) => void;
  setSelectedTokenFromModal: (token: Token | null) => void;
  resetSelections: () => void;
}

export const useChainTokenModalStore = create<ChainTokenModalStore>((set) => ({
  isOpen: false,
  selectedChainFromModal: null,
  selectedTokenFromModal: null,
  onSelectChainCallback: null,
  onSelectChainAndTokenCallback: null,
  vaultDataForModal: null,
  isFromTopUpForModal: false,

  openModal: (
    currentSelectedChain,
    currentSelectedToken,
    onSelectChain,
    onSelectChainAndToken,
    vaultData,
    isFromTopUp,
  ) =>
    set({
      isOpen: true,
      selectedChainFromModal: currentSelectedChain,
      selectedTokenFromModal: currentSelectedToken,
      onSelectChainCallback: onSelectChain || null,
      onSelectChainAndTokenCallback: onSelectChainAndToken || null,
      vaultDataForModal: vaultData || null,
      isFromTopUpForModal: isFromTopUp || false,
    }),

  closeModal: () =>
    set({
      isOpen: false,
      onSelectChainCallback: null,
      onSelectChainAndTokenCallback: null,
      vaultDataForModal: null,
      isFromTopUpForModal: false,
    }),

  setSelectedChainFromModal: (chain) => set({ selectedChainFromModal: chain }),
  setSelectedTokenFromModal: (token) => set({ selectedTokenFromModal: token }),

  resetSelections: () =>
    set({
      selectedChainFromModal: null,
      selectedTokenFromModal: null,
    }),
}));
