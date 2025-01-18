"use client";

import React, { useEffect } from "react";
import { ConnectButton, useActiveAccount, useConnectModal } from "thirdweb/react";
import VaultsContainer from "../containers/VaultsContainer";
import Footer from "../components/Footer";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import mixpanel from "mixpanel-browser";
import { client } from "../utils/client"; // Import the client instance

// Explicitly type the shared configuration for ConnectButton and connect
const connectModalConfig: {
  client: typeof client;
  chains: typeof SUPPORTED_CHAINS;
  wallets: ReturnType<typeof inAppWallet | typeof createWallet>[];
  connectModal: { size: "compact" };
} = {
  client,
  chains: [SUPPORTED_CHAINS[0]],
  wallets: [
    inAppWallet({
      auth: {
        options: ["google", "email", "passkey"],
      },
    }),
    createWallet("io.metamask"),
    createWallet("com.coinbase.wallet"),
    createWallet("me.rainbow"),
    createWallet("io.rabby"),
    createWallet("com.trustwallet.app"),
    createWallet("com.ledger"),
    createWallet("global.safe"),
  ],
  connectModal: { size: "compact" }, // Explicitly set the type to "compact"
};

export default function Page() {
  const account = useActiveAccount();
  const { connect, isConnecting } = useConnectModal(); // Access the connect function

  useEffect(() => {
    // Initialize Mixpanel
    mixpanel.init("1f01d05893463c7ba9d4ac7280821010", {
      debug: true,
      track_pageview: true,
      persistence: "localStorage",
    });

    mixpanel.track("Page Viewed", {
      page: "Vaults List",
    });

    // Automatically show the connect modal if no account is connected
    if (!account && !isConnecting) {
      connect({
        ...connectModalConfig, // Use shared configuration
        locale: "en_US", // Additional options if needed
      }).catch(() => {
        console.log("Connect modal closed without connecting.");
      });
    } else if (account) {
      mixpanel.identify(account.address);
      mixpanel.people.set({
        wallet_address: account.address,
      });
    }
  }, [account, connect, isConnecting]);

  return (
    <main className="p-4 pb-10 min-h-screen flex flex-col container mx-auto relative overflow-hidden">
      <header className="w-5/6 text-white p-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tighter text-zinc-100">Amana</h1>
        <div className="absolute top-5 right-5">
          <ConnectButton
            {...connectModalConfig} // Use the same shared configuration
          />
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-between py-20 px-6">
        <VaultsContainer activeChain={SUPPORTED_CHAINS[0]} />
        <Footer />
      </div>
    </main>
  );
}
