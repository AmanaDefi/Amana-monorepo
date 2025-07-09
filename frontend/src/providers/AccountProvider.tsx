"use client";

import React, { PropsWithChildren, useEffect, useMemo, useState } from "react";
import mixpanel from "mixpanel-browser";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/utils/trackEvent";
import { usePrivy, useWallets } from "@privy-io/react-auth";

export default function AccountProvider({ children }: PropsWithChildren) {
  const { wallets } = useWallets();
  const filteredWallets = wallets.filter(
    (wallet) => wallet.meta.id !== "app.phantom",
  );
  const activePrivyWallet = filteredWallets[0];
  const { ready, authenticated} = usePrivy();

  const [hasTrackedPage, setHasTrackedPage] = useState(false);
  const [hasIdentified, setHasIdentified] = useState(false);

  const route = usePathname();

  useEffect(() => {
    setHasTrackedPage(false);
  }, [route]);

  useEffect(() => {
    if (!(mixpanel as any).__initialized) {
      mixpanel.init("1f01d05893463c7ba9d4ac7280821010", {
        debug: true,
        persistence: "localStorage",
      });
      (mixpanel as any).__initialized = true;
    }

    if (activePrivyWallet?.address && ready) {
      if (!hasIdentified) {
        mixpanel.identify(activePrivyWallet?.address);
        mixpanel.people.set({ wallet_address: activePrivyWallet?.address });
        trackEvent("Wallet Connected", { walletAddress: activePrivyWallet?.address });
        setHasIdentified(true);
      }
    } else if (ready) {
      if (hasIdentified) {
        mixpanel.reset();
        setHasIdentified(false);
      }
    }

    const page =
      route === "/"
        ? "Vaults List"
        : route.startsWith("/vaults/")
          ? "Vault Details"
          : route === "/about"
            ? "About"
            : route === "/leaderboard"
              ? "Leaderboard"
                : route;

    if (!hasTrackedPage) {
      trackEvent("Page Viewed", {
        page,
        route,
        isWalletConnected: authenticated,
        walletAddress: activePrivyWallet?.address || null,
      });
      setHasTrackedPage(true);
    }
  }, [
    route,
    activePrivyWallet?.address,
    authenticated,
    hasTrackedPage,
    hasIdentified,
    ready,
  ]);

  return <>{children}</>;
}
