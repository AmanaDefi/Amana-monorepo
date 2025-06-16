import { create } from "zustand";
import {
  updateLocalStorageObject,
  getLocalStorageObject,
} from "@/utils/localStorageUtils";

interface SlippageSettings {
  isAuto: boolean;
  value: number;
}

interface UserSettingsState {
  slippage: SlippageSettings;
  setSlippage: (vaultId: string, value: number) => void;
  toggleAuto: (vaultId: string) => void;
  loadSlippageFromStorage: (vaultId: string) => void;
}

export const useUserSettingsStore = create<UserSettingsState>((set) => ({
  slippage: { isAuto: true, value: 0.1 },

  setSlippage: (vaultId, value) => {
    updateLocalStorageObject(vaultId, {
      slippage: { isAuto: false, value },
    });

    set({ slippage: { isAuto: false, value } });
  },

  toggleAuto: (vaultId) => {
    const current = getLocalStorageObject(vaultId);
    const prevValue = current?.slippage?.value ?? 0.1;
    const isAuto = !(current?.slippage?.isAuto ?? true);

    updateLocalStorageObject(vaultId, {
      slippage: { isAuto, value: prevValue },
    });

    set({ slippage: { isAuto, value: prevValue } });
  },

  loadSlippageFromStorage: (vaultId) => {
    const fromStorage = getLocalStorageObject(vaultId);
    if (fromStorage?.slippage) {
      set({ slippage: fromStorage.slippage });
    }
  },
}));
