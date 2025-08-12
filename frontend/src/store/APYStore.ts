import { create } from "zustand";

interface APYState {
  previousAPY: Record<string, number>;
  currentAPY: Record<string, number>;
  activeTransactionVaultId: string | null;

  setPreviousAPY: (vaultId: string, apy: number) => void;

  setCurrentAPY: (vaultId: string, apy: number) => void;

  setActiveTransactionVault: (vaultId: string | null) => void;

  getAPYDirection: (vaultId: string) => "up" | "down" | "unchanged";

  getAPYChange: (vaultId: string) => number;

  hasAPYChangeData: (vaultId: string) => boolean;

  clearVaultData: (vaultId: string) => void;
}

export const useAPYStore = create<APYState>((set, get) => ({
  previousAPY: {},
  currentAPY: {},
  activeTransactionVaultId: null,

  setPreviousAPY: (vaultId: string, apy: number) => {
    set((state) => ({
      previousAPY: {
        ...state.previousAPY,
        [vaultId]: apy,
      },
    }));
  },

  setCurrentAPY: (vaultId: string, apy: number) => {
    set((state) => ({
      currentAPY: {
        ...state.currentAPY,
        [vaultId]: apy,
      },
    }));
  },

  setActiveTransactionVault: (vaultId: string | null) => {
    set({ activeTransactionVaultId: vaultId });
  },

  getAPYDirection: (vaultId: string) => {
    const { previousAPY, currentAPY } = get();

    const prev = previousAPY[vaultId];
    const current = currentAPY[vaultId];

    if (prev === undefined || current === undefined) return "unchanged";

    if (current > prev) return "up";
    if (current < prev) return "down";
    return "unchanged";
  },

  getAPYChange: (vaultId: string) => {
    const { previousAPY, currentAPY } = get();

    const prev = previousAPY[vaultId];
    const current = currentAPY[vaultId];

    if (prev === undefined || current === undefined) return 0;

    return ((current - prev) / prev) * 100;
  },

  hasAPYChangeData: (vaultId: string) => {
    const { previousAPY, currentAPY, activeTransactionVaultId } = get();
    const hasBothValues =
      previousAPY[vaultId] !== undefined && currentAPY[vaultId] !== undefined;
    const wasActiveVault = activeTransactionVaultId === vaultId;
    const valuesAreDifferent =
      hasBothValues && previousAPY[vaultId] !== currentAPY[vaultId];

    return hasBothValues && wasActiveVault && valuesAreDifferent;
  },

  clearVaultData: (vaultId: string) => {
    set((state) => {
      const newPreviousAPY = { ...state.previousAPY };
      const newCurrentAPY = { ...state.currentAPY };

      delete newPreviousAPY[vaultId];
      delete newCurrentAPY[vaultId];

      return {
        previousAPY: newPreviousAPY,
        currentAPY: newCurrentAPY,
        activeTransactionVaultId:
          state.activeTransactionVaultId === vaultId
            ? null
            : state.activeTransactionVaultId,
      };
    });
  },
}));
