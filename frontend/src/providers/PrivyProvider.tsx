"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { chainsWithCustomRpcs, customZetachain } from "@/constants/chainConfig";
import {
  bsc,
  bscTestnet,
  avalanche,
  avalancheFuji,
  zetachain,
  zetachainAthensTestnet,
  mainnet,
  sepolia,
  base,
  baseSepolia,
  polygon,
  polygonAmoy,
  arbitrum,
  arbitrumSepolia,
} from "viem/chains";
import { createConfig, WagmiProvider } from "wagmi";
import { http } from "wagmi";
import {
  walletConnect,
  metaMask,
  coinbaseWallet,
  injected,
} from "wagmi/connectors";

export default function CustomPrivyProvider({ children }: PropsWithChildren) {
  const walletConnectProjectId =
    process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ||
    "fc48f2e065ff110cc6683b9af8b654c5";

  const providers = [
    metaMask(),
    coinbaseWallet({
      appName: "Amana",
    }),
    walletConnect({
      projectId: walletConnectProjectId,
      showQrModal: true,
      qrModalOptions: {
        themeMode: "dark",
      },
    }),
    injected(),
  ];

  const wagmiConfig = createConfig({
    ssr: true,
    connectors: providers,
    chains: [
      zetachain,
      bsc,
      bscTestnet,
      avalanche,
      avalancheFuji,
      zetachainAthensTestnet,
      mainnet,
      sepolia,
      base,
      baseSepolia,
      polygon,
      polygonAmoy,
      arbitrum,
      arbitrumSepolia,
    ],
    transports: [
      zetachain,
      bsc,
      bscTestnet,
      avalanche,
      avalancheFuji,
      zetachainAthensTestnet,
      mainnet,
      sepolia,
      base,
      baseSepolia,
      polygon,
      polygonAmoy,
      arbitrum,
      arbitrumSepolia,
    ].reduce(
      (acc, item) => {
        if (item.id) {
          acc[item.id] = http();
        }
        return acc;
      },
      {} as Record<number, any>,
    ),
  });
  const queryClient = new QueryClient();
  return (
    <PrivyProvider
      appId={
        process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmca71qv600kfl40m18l83vcc"
      }
      config={{
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        defaultChain: customZetachain,
        supportedChains: chainsWithCustomRpcs(),
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}
