import { SlippageSettings, DEFAULT_SETTINGS } from "@/types/types";

export interface GlobalSlippageStorage {
  slippage: Record<string, SlippageSettings>;
}

const GLOBAL_SLIPPAGE_SETTINGS_KEY = "globalSlippageSettings";

export function getGlobalSlippageSettings(): GlobalSlippageStorage | null {
  if (typeof window === "undefined" || !window?.localStorage) {
    return null;
  }
  try {
    const saved = localStorage.getItem(GLOBAL_SLIPPAGE_SETTINGS_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch (e) {
    console.error(
      "Error parsing global slippage settings from localStorage:",
      e,
    );
    return null;
  }
}

export function updateGlobalSlippageSettings(
  data: Partial<GlobalSlippageStorage>,
): void {
  if (typeof window === "undefined" || !window?.localStorage) {
    return;
  }
  try {
    const existing = getGlobalSlippageSettings();

    const updatedSlippageRecord = {
      ...(existing?.slippage || {}),
      ...(data.slippage || {}),
    };
    const updatedData: GlobalSlippageStorage = {
      slippage: updatedSlippageRecord,
    };

    localStorage.setItem(
      GLOBAL_SLIPPAGE_SETTINGS_KEY,
      JSON.stringify(updatedData),
    );
  } catch (e) {
    console.error(
      "Error updating global slippage settings in localStorage:",
      e,
    );
  }
}
