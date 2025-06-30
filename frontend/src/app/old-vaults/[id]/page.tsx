"use client";

import React, { useEffect } from "react";
import VaultsDetailContainer from "@/containers/VaultsDetailContainer";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWallets } from "@privy-io/react-auth";

function Index({ }) {
    const {wallets} = useWallets();
    const privyUser = wallets[0];
    const { id } = useParams();
    const wallet = useWallet();

    return (
        <>
            {(privyUser || wallet) && (
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
