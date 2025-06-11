"use client";

import React, { useEffect } from "react";
import VaultsDetailContainer from "@/containers/VaultsDetailContainer";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useUser } from "@account-kit/react";

function Index({ }) {
    const account = useUser();
    const { id } = useParams();
    const wallet = useWallet();

    return (
        <>
            {(account || wallet) && (
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
