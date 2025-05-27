"use client";

import React, { PropsWithChildren, useCallback, useEffect, useState } from "react";
import mixpanel from "mixpanel-browser";
import {
  useActiveAccount,
  useConnectModal,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { client } from "../utils/client";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/utils/trackEvent";

// Explicitly type the shared configuration for ConnectButton and connect
export const connectModalConfig: {
  client: typeof client;
  chains: typeof SUPPORTED_CHAINS;
  wallets: ReturnType<typeof inAppWallet | typeof createWallet>[];
  connectModal: { size: "compact" };
} = {
  client,
  chains: SUPPORTED_CHAINS,
  wallets: [
    createWallet("io.metamask"),
    createWallet("com.coinbase.wallet"),
    createWallet("me.rainbow"),
    createWallet("io.rabby"),
    createWallet("com.trustwallet.app"),
    createWallet("com.ledger"),
    createWallet("global.safe"),
  ],
  connectModal: { size: "compact" },
};

export default function AccountProvider({ children }: PropsWithChildren) {
  const account = useActiveAccount();
  const { connect, isConnecting } = useConnectModal();
  const connectionStatus = useActiveWalletConnectionStatus();

  const [initialCheckCount, setInitialCheckCount] = useState(0);
  const [isThirdwebReady, setIsThirdwebReady] = useState(false);
  const [hasTrackedPage, setHasTrackedPage] = useState(false);
  const [hasIdentified, setHasIdentified] = useState(false); // Track identification status
  const [hasTrackedWalletConnect, setHasTrackedWalletConnect] = useState(false);

  const route = usePathname();

  useEffect(() => {
    if (initialCheckCount >= 2) {
      setIsThirdwebReady(true);
    }
  }, [initialCheckCount]);

  // 🔄 Reset page tracking when route changes
  useEffect(() => {
    setHasTrackedPage(false);
  }, [route]);

  // ✅ Define human-readable page name
  const getPageName = useCallback((currentRoute: string) => {
    if (currentRoute === "/") return "Vaults List";
    if (currentRoute.startsWith("/vaults/")) return "Vault Details";
    if (currentRoute === "/about") return "About";
    if (currentRoute === "/leaderboard") return "Leaderboard";
    if (currentRoute === "/roadmap") return "Roadmap";
    return currentRoute;
  }, []);

  // ✅ Track page views + wallet connect
  useEffect(() => {
    if (initialCheckCount < 2) {
      setInitialCheckCount((prev) => prev + 1);
      return;
    }

    if (!isThirdwebReady) return;

    // ✅ Initialize Mixpanel (only once)
    if (!(mixpanel as any).__initialized) {
      mixpanel.init("1f01d05893463c7ba9d4ac7280821010", {
        debug: true,
        persistence: "localStorage",
      });
      (mixpanel as any).__initialized = true;
    }

    // ✅ Identify user only once when wallet is connected
    if (account?.address && !hasIdentified) {
      mixpanel.identify(account.address);
      mixpanel.people.set({
        wallet_address: account.address,
      });
      setHasIdentified(true);
    }

    // ✅ Track "Wallet Connected" explicitly
    if (
      connectionStatus === "connected" &&
      account?.address &&
      !hasTrackedWalletConnect
    ) {
      trackEvent("Wallet Connected", {
        walletAddress: account.address,
      });
      setHasTrackedWalletConnect(true);
    }

    // ✅ Track page view once per route
    if (!hasTrackedPage) {
      const page = getPageName(route);

      trackEvent("Page Viewed", {
        page,
        route,
        isWalletConnected: !!account?.address,
        walletAddress: account?.address || null,
      });
      setHasTrackedPage(true);
    }
  }, [
    route,
    account?.address,
    connectionStatus,
    initialCheckCount,
    isThirdwebReady,
    hasTrackedPage,
    hasIdentified, // Include hasIdentified to prevent multiple wallet connect events
    hasTrackedWalletConnect,
    getPageName,
  ]);

  useEffect(() => {
    if (!account?.address) {
      setHasIdentified(false);
      setHasTrackedWalletConnect(false);
    }
  }, [account?.address]);

  return <>{children}</>;
}

