import React, { PropsWithChildren, useEffect, useState } from "react";
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

  const route = usePathname();

  useEffect(() => {
    if (initialCheckCount >= 2) {
      setIsThirdwebReady(true);
    }
  }, [initialCheckCount]);

  useEffect(() => {
    // Skip tracking until thirdweb is ready
    if (initialCheckCount < 2) {
      setInitialCheckCount((prev) => prev + 1);
      return;
    }

    if (!isThirdwebReady) return;

    // Initialize Mixpanel once
    if (!(mixpanel as any).__initialized) {
      mixpanel.init("1f01d05893463c7ba9d4ac7280821010", {
        debug: true,
        persistence: "localStorage",
      });
      (mixpanel as any).__initialized = true;
    }

    // Identify the user if wallet is connected
    if (account?.address) {
      mixpanel.identify(account.address);
      mixpanel.people.set({
        wallet_address: account.address,
      });
    }

    // Track page view once per route
    if (!hasTrackedPage) {
      mixpanel.track("Page Viewed", {
        page: "Vaults List",
        route,
        isWalletConnected: !!account?.address,
        walletAddress: account?.address || null,
      });
      setHasTrackedPage(true);
    }
  }, [
    route,
    account,
    connect,
    connectionStatus,
    initialCheckCount,
    isConnecting,
    isThirdwebReady,
    hasTrackedPage,
  ]);

  // Reset page tracking on route change
  useEffect(() => {
    setHasTrackedPage(false);
  }, [route]);

  return <>{children}</>;
}
