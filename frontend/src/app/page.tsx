"use client";

import React from "react";
import VaultsContainer from "../containers/VaultsContainer";
import { useActiveAccount } from "thirdweb/react";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import {BannersCarousel} from "@/components/banners/BannersCarousel";

export default function Page() {
  const account = useActiveAccount();
  const wallet = useWallet();
  return (
    <div className="flex flex-col w-full">
      <div className="w-full text-center bg-amber-50">
        <span className="py-2 lg:py-4 px-4 text-black text-sm">
          This site is currently in beta and may contain bugs 🐞. Report any
          bugs or give feedback{" "}
          <Link
            href="mailto:info@amanadefi.com"
            className="underline-offset-2 underline"
          >
            here
          </Link>
        </span>
      </div>
      {(account || wallet) && (
        <div className="flex-1 flex flex-col w-full justify-between pt-20">
          <div className="flex-1 p-4 container mx-auto">
            <VaultsContainer />
          </div>
        </div>
      )}
    </div>
  );
}
