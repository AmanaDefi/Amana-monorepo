"use client";

import React, { Suspense } from "react";
import VaultsDetailContainer from "@/containers/VaultsDetailContainer";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMultiChain } from "@/providers/MultiChainProvider";

function Index({ }) {
    const {activeEvmWallet} = useMultiChain();

    const { id } = useParams();
    const wallet = useWallet();

    return (
        <>
            {(activeEvmWallet || wallet) && (
                <div className="flex-1 flex flex-col w-full justify-between py-20 pl-6">
                    <div className="flex-1">
                        <Suspense fallback={<div>Loading...</div>}>
                            <VaultsDetailContainer vaultID={id} />
                        </Suspense>
                    </div>
                </div>
            )}
        </>
    );
}

export default Index;
