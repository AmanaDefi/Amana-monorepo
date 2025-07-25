"use client";

import { create } from "zustand";
import {
  getGlobalSlippageSettings,
  updateGlobalSlippageSettings,
  GlobalSlippageStorage,
} from "@/utils/slippageStorage";
import { DEFAULT_SETTINGS, SlippageSettings } from "@/types/types";

interface UserSettingsState {
  slippage: Record<string, SlippageSettings>;
  setSlippage: (vaultId: string, value: number) => void;
  toggleAuto: (vaultId: string) => void;
  loadSlippageForVault: (vaultId: string) => void;
  getSlippageForVault: (vaultId: string) => SlippageSettings;
}

export const useUserSettingsStore = create<UserSettingsState>((set, get) => ({
  slippage: {},

  setSlippage: (vaultId, value) => {
    const newSlippageSettings: SlippageSettings = { isAuto: false, value };
    const updatedSlippageState = {
      ...get().slippage,
      [vaultId]: newSlippageSettings,
    };
    updateGlobalSlippageSettings({ slippage: updatedSlippageState });
    set({ slippage: updatedSlippageState });
  },

  toggleAuto: (vaultId) => {
    const currentSlippageForVault =
      get().slippage[vaultId] || DEFAULT_SETTINGS.slippage;
    const isAuto = !currentSlippageForVault.isAuto;
    const prevValue = currentSlippageForVault.value;

    const newSlippageSettings: SlippageSettings = { isAuto, value: prevValue };
    const updatedSlippageState = {
      ...get().slippage,
      [vaultId]: newSlippageSettings,
    };
    updateGlobalSlippageSettings({ slippage: updatedSlippageState });
    set({ slippage: updatedSlippageState });
  },

  loadSlippageForVault: (vaultId) => {
    const allStoredSettings = getGlobalSlippageSettings();

    let currentSlippage: Record<string, SlippageSettings> =
      allStoredSettings?.slippage || {};

    if (!currentSlippage[vaultId]) {
      currentSlippage = {
        ...currentSlippage,
        [vaultId]: DEFAULT_SETTINGS.slippage,
      };
    }
    set({ slippage: currentSlippage });
  },

  getSlippageForVault: (vaultId) => {
    return get().slippage[vaultId] || DEFAULT_SETTINGS.slippage;
  },
}));

export const getUserSettings = useUserSettingsStore.getState;
export const getSlippageForVault = (vaultId: string) => getUserSettings().getSlippageForVault(vaultId);
