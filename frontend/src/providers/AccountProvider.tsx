"use client";

import React, { PropsWithChildren, useEffect, useState } from "react";
import {
  useActiveAccount,
  useConnectModal,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { client } from "../utils/client";
import { usePathname } from "next/navigation";
import { trackPageView, identifyUser, trackWalletConnection } from "@/utils/trackEvent";

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
  const [hasIdentified, setHasIdentified] = useState(false);

  const route = usePathname();

  useEffect(() => {
    if (initialCheckCount >= 2) {
      setIsThirdwebReady(true);
    }
  }, [initialCheckCount]);

  useEffect(() => {
    setHasTrackedPage(false);
  }, [route]);

  useEffect(() => {
    if (initialCheckCount < 2) {
      setInitialCheckCount((prev) => prev + 1);
      return;
    }

    if (!isThirdwebReady) return;


  const handleAnalytics = async () => {

  if (account?.address && !hasIdentified) {
    await identifyUser(account.address);
    
    if (connectionStatus === "connected") {
      await trackWalletConnection(account.address);
    }
    
    setHasIdentified(true);
  }

  if (!hasTrackedPage) {
    await trackPageView(route, account?.address);
    setHasTrackedPage(true);
  }
};

    handleAnalytics();
  }, [
    route,
    account,
    connect,
    connectionStatus,
    initialCheckCount,
    isConnecting,
    isThirdwebReady,
    hasTrackedPage,
    hasIdentified, // Include hasIdentified to prevent multiple wallet connect events
  ]);

  return <>{children}</>;
}
