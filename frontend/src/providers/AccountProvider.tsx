"use client";

import React, { PropsWithChildren, useEffect, useMemo, useState } from "react";
import mixpanel from "mixpanel-browser";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/utils/trackEvent";
import {
  useUser,
  useSignerStatus,
} from "@account-kit/react";

export default function AccountProvider({ children }: PropsWithChildren) {
  const { isConnected, isInitializing } = useSignerStatus();
  const user = useUser();

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

    if (user?.address && !isInitializing) {
      if (!hasIdentified) {
        mixpanel.identify(user.address);
        mixpanel.people.set({ wallet_address: user.address });
        trackEvent("Wallet Connected", { walletAddress: user.address });
        setHasIdentified(true);
      }
    } else if (!isInitializing) {
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
        isWalletConnected: isConnected,
        walletAddress: user?.address || null,
      });
      setHasTrackedPage(true);
    }
  }, [
    route,
    user?.address,
    isConnected,
    hasTrackedPage,
    hasIdentified,
    isInitializing,
  ]);

  return <>{children}</>;
}
