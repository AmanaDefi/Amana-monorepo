"use client";

import React, { useEffect } from "react";
import VaultsDetailContainer from "@/containers/VaultsDetailContainer";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePrivy } from "@privy-io/react-auth";

function Index({ }) {
    const {user} = usePrivy();
    const { id } = useParams();
    const wallet = useWallet();

    return (
        <>
            {(user || wallet) && (
                <div className="flex-1 flex flex-col w-full justify-between py-20 pl-6">
                    <div className="flex-1">
                        <VaultsDetailContainer vaultID={id} />
                    </div>
                </div>
            )}
        </>
    );
}

export default Index;
