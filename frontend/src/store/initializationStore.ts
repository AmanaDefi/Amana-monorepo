import { create } from "zustand";

interface InitializationState {
  isHydrated: boolean;
  isInitializationComplete: boolean;
  isWalletConnecting: boolean;
  setIsHydrated: (hydrated: boolean) => void;
  setIsInitializationComplete: (complete: boolean) => void;
  setIsWalletConnecting: (connecting: boolean) => void;
  isReady: () => boolean;
  startInitialization: () => void;
  completeInitialization: () => void;
  resetInitialization: () => void;
}

export const useInitializationStore = create<InitializationState>(
  (set, get) => ({
    isHydrated: false,
    isInitializationComplete: false,
    isWalletConnecting: false,

    setIsHydrated: (hydrated) => {
      console.log("Hydration state changed:", hydrated);
      set({ isHydrated: hydrated });
    },

    setIsInitializationComplete: (complete) => {
      console.log("Initialization complete state changed:", complete);
      set({ isInitializationComplete: complete });
    },

    setIsWalletConnecting: (connecting) => {
      console.log("Wallet connecting state changed:", connecting);
      set({ isWalletConnecting: connecting });
    },

    isReady: () => {
      const state = get();
      return (
        state.isHydrated &&
        state.isInitializationComplete &&
        !state.isWalletConnecting
      );
    },

    startInitialization: () => {
      set({
        isInitializationComplete: false,
        isWalletConnecting: true,
      });
    },

    completeInitialization: () => {
      set({
        isInitializationComplete: true,
        isWalletConnecting: false,
      });
    },

    resetInitialization: () => {
      set({
        isHydrated: false,
        isInitializationComplete: false,
        isWalletConnecting: false,
      });
    },
  }),
);
