import {
  AlchemyAccountsUIConfig,
  cookieStorage,
  createConfig,
} from "@account-kit/react";
import { alchemy } from "@account-kit/infra";
import { QueryClient } from "@tanstack/react-query";
import { SUPPORTED_CHAINS, AlchemyZetachain } from "@/constants/chainConfig";

const apiKey =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "WOD1jehYaPtOI8ix7dFiP";
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ||
  "fc48f2e065ff110cc6683b9af8b654c5";

if (!apiKey) throw new Error("Invalid API KEY");
if (!walletConnectProjectId) throw new Error("Invalid WalletConnect Id");

const uiConfig: AlchemyAccountsUIConfig = {
  illustrationStyle: "filled",
  auth: {
    sections: [
      [{ type: "email" }],
      [
        { type: "passkey" },
        { type: "social", authProviderId: "google", mode: "popup" },
      ],
      [
        {
          type: "external_wallets",
          walletConnect: { projectId: walletConnectProjectId },
        },
      ],
    ],
    addPasskeyOnSignup: true,
  },
};

export const alchemyConfig = createConfig(
  {
    transport: alchemy({ apiKey }),
    chain: AlchemyZetachain,
    chains: SUPPORTED_CHAINS,
    ssr: true,
    storage: cookieStorage,
    enablePopupOauth: true,
  },
  uiConfig,
);

export const queryClient = new QueryClient();
