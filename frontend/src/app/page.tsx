"use client";

import React from "react";
import VaultsContainer from "../containers/VaultsContainer";
import { useActiveAccount } from "thirdweb/react";
import { useWallet } from "@solana/wallet-adapter-react";

export default function Page() {
  const account = useActiveAccount();
  const wallet = useWallet();
  return (
    <>
      {(account || wallet) && (
        <div className="flex-1 flex flex-col w-full justify-between pt-20">
          <div className="flex-1 p-4 container mx-auto">
            <VaultsContainer />
          </div>
        </div>
      )}
    </>
  );
}
