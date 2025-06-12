"use client";

import React, { useEffect, useState } from "react";
import {useUser} from "@account-kit/react";
import VaultsDetailContainer from "@/containers/VaultsDetailContainer";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { trackEvent } from "@/utils/trackEvent";

function Index({}) {
  const account = useUser();
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
        <div className="flex-1 flex flex-col w-full justify-between pl-6">
          <div className="flex-1 mt-8">
            <VaultsDetailContainer vaultID={id} setVaultSymbol={setVaultSymbol} />
          </div>
        </div>
      )}
    </>
  );
}

export default Index;
