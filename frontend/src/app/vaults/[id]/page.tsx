"use client";

import React, { useEffect, useState } from "react";
import VaultsDetailContainer from "@/containers/VaultsDetailContainer";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { trackEvent } from "@/utils/trackEvent";
import clsx from "clsx";
import { useWallets } from "@privy-io/react-auth";

function Index({}) {
  const { wallets } = useWallets();
  const account = wallets[0];
  const { id } = useParams();
  const wallet = useWallet();
  const [vaultSymbol, setVaultSymbol] = useState<string | null>(null);

  useEffect(() => {
    if (id && typeof id === "string" && vaultSymbol) {
      trackEvent("Vault Page Viewed", {
        vaultAddress: id,
        vaultSymbol,
      });
    }
  }, [id, vaultSymbol]);

  return (
    <>
      {(account || wallet) && (
        <div className="flex-1 flex flex-col w-full justify-between pl-0 lg:pl-6">
          <div className={clsx("flex-1", !wallet && "mt-8", wallet && "mt-0")}>
            <VaultsDetailContainer
              vaultID={id}
              setVaultSymbol={setVaultSymbol}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default Index;
