import { ConnectedWallet } from "@privy-io/react-auth";
import { Chain } from "viem";
import { create } from "zustand";

export type AuthStep =
  | "signup"
  | "verify"
  | "import"
  | "optionsA"
  | "optionsB"
  | "mobileOptionsA"
  | "mobileOptionsB"
  | "allWallets"
  | "mobileAllWallets"
  | "success"
  | "onboarding"
  | "logout"
  | "passkey"
  | "signature"
  | "checking"
  | "notVerify"
  | "receive"
  | "send"
  | "mobileInfo"
  | "connectInChosenChain"
  | null;

interface AuthState {
  step: AuthStep;
  username: string;
  email: string;
  otp: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userAddress: string | null;
  chosenChain: Chain | null;
  _isProcessingAuth: boolean;

  openStep: (step: AuthStep) => void;
  closeAll: () => void;
  successAuth: (
    walletAddress?: string | null,
    activeAccount?: ConnectedWallet,
    fromAllWallets?: boolean,
  ) => void;
  updateField: (name: "username" | "email" | "otp", value: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setChain: (chain: Chain | null) => void;
  authenticate: (address: string) => void;
  logout: () => void;
}

export const handleAuthSuccess = (
  result: any,
  successAuthCallback: (
    walletAddress?: string | null,
    activeAccount?: ConnectedWallet,
  ) => void,
) => {
  if (!result.wasAlreadyAuthenticated) {
    const walletAccount = result.user.linkedAccounts?.find(
      (account: any) => account.type === "wallet",
    );

    const walletAddress =
      walletAccount && "address" in walletAccount
        ? walletAccount.address
        : null;

    successAuthCallback(
      walletAddress as string | null,
      walletAccount as ConnectedWallet | undefined,
    );
  }
};

let successAuthTimeout: NodeJS.Timeout | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  step: null,
  username: "",
  email: "",
  otp: "",
  isAuthenticated: false,
  isLoading: false,
  error: null,
  userAddress: null,
  chosenChain: null,
  _isProcessingAuth: false,

  openStep: (step) => set({ step }),
  closeAll: () => {
    if (successAuthTimeout) {
      clearTimeout(successAuthTimeout);
      successAuthTimeout = null;
    }
    set({
      step: null,
      isLoading: false,
      error: null,
      email: "",
      username: "",
      otp: "",
      _isProcessingAuth: false,
    });
  },
  successAuth: (walletAddress, activeAccount, fromAllWallets = false) => {
    const state = get();

    if (state._isProcessingAuth) {
      return;
    }

    if (state.step === "success" && !fromAllWallets) {
      return;
    }

    if (successAuthTimeout) {
      clearTimeout(successAuthTimeout);
    }

    set({ _isProcessingAuth: true });

    if (fromAllWallets) {
      set({
        step: null,
        isLoading: false,
        error: null,
        username: "",
        otp: "",
        _isProcessingAuth: false,
        isAuthenticated: true,
        userAddress: walletAddress || activeAccount?.address || null,
      });
    } else {
      if (!activeAccount || activeAccount?.walletClientType === "privy") {
        const walletAddr = walletAddress || activeAccount?.address;
        const viewedWallets = JSON.parse(
          localStorage.getItem("viewedWelcomeWallets") || "[]",
        );

        const hasThisWalletViewedWelcome = viewedWallets.includes(walletAddr);

        if (hasThisWalletViewedWelcome) {
          set({
            step: null,
            isLoading: false,
            error: null,
            username: "",
            otp: "",
            _isProcessingAuth: false,
            isAuthenticated: true,
            userAddress: walletAddr || null,
          });
        } else {
          if (walletAddr) {
            viewedWallets.push(walletAddr);
            localStorage.setItem(
              "viewedWelcomeWallets",
              JSON.stringify(viewedWallets),
            );
          }

          set({
            step: "success",
            isLoading: false,
            error: null,
            username: "",
            otp: "",
            _isProcessingAuth: false,
            isAuthenticated: true,
            userAddress: walletAddr || null,
          });
        }
      } else {
        set({
          step: null,
          isLoading: false,
          error: null,
          username: "",
          otp: "",
          _isProcessingAuth: false,
          isAuthenticated: true,
          userAddress: walletAddress || activeAccount?.address || null,
        });
      }
    }
  },
  updateField: (name, value) => set((state) => ({ ...state, [name]: value })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setChain: (chosenChain) => set({ chosenChain }),
  authenticate: (address) =>
    set({
      isAuthenticated: true,
      userAddress: address,
      step: null,
      username: "",
      otp: "",
      error: null,
      _isProcessingAuth: false,
    }),
  logout: () => {
    if (successAuthTimeout) {
      clearTimeout(successAuthTimeout);
      successAuthTimeout = null;
    }
    set({
      isAuthenticated: false,
      userAddress: null,
      email: "",
      username: "",
      otp: "",
      _isProcessingAuth: false,
    });
  },
}));
