import { create } from "zustand";

export type AuthStep =
  | "signup"
  | "verify"
  | "import"
  | "optionsA"
  | "optionsB"
  | "allWallets"
  | "success"
  | "onboarding"
  | "logout"
  | "passkey"
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

  openStep: (step: AuthStep) => void;
  closeAll: () => void;
  successAuth: () => void;
  updateField: (name: "username" | "email" | "otp", value: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  authenticate: (address: string) => void;
  logout: () => void;
}
export const useAuthStore = create<AuthState>((set) => ({
  step: null,
  username: "",
  email: "",
  otp: "",
  isAuthenticated: false,
  isLoading: false,
  error: null,
  userAddress: null,

  openStep: (step) => set({ step }),
  closeAll: () =>
    set({
      step: null,
      isLoading: false,
      error: null,
      email: "",
      username: "",
      otp: "",
    }),
  successAuth: () =>
    set({
      step: "success",
      isLoading: false,
      error: null,
      email: "",
      username: "",
      otp: "",
    }),
  updateField: (name, value) => set((state) => ({ ...state, [name]: value })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  authenticate: (address) =>
    set({
      isAuthenticated: true,
      userAddress: address,
      step: null,
      email: "",
      username: "",
      otp: "",
      error: null,
    }),
  logout: () =>
    set({
      isAuthenticated: false,
      userAddress: null,
      email: "",
      username: "",
      otp: "",
    }),
}));


