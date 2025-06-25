"use client";

import React, { PropsWithChildren, useEffect, useMemo, useState } from "react";
import mixpanel from "mixpanel-browser";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/utils/trackEvent";
import { usePrivy } from "@privy-io/react-auth";

export default function AccountProvider({ children }: PropsWithChildren) {
  const {user, ready, authenticated} = usePrivy();

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

    if (user?.wallet?.address && ready) {
      if (!hasIdentified) {
        mixpanel.identify(user?.wallet?.address);
        mixpanel.people.set({ wallet_address: user?.wallet?.address });
        trackEvent("Wallet Connected", { walletAddress: user?.wallet?.address });
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
              : route === "/roadmap"
                ? "Roadmap"
                : route;

    if (!hasTrackedPage) {
      trackEvent("Page Viewed", {
        page,
        route,
        isWalletConnected: authenticated,
        walletAddress: user?.wallet?.address || null,
      });
      setHasTrackedPage(true);
    }
  }, [
    route,
    user?.wallet?.address,
    authenticated,
    hasTrackedPage,
    hasIdentified,
    ready,
  ]);

  return <>{children}</>;
}
