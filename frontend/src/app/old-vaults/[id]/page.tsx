"use client";

import React, { useEffect } from "react";
import { useActiveAccount, useActiveWalletConnectionStatus, useConnectModal } from "thirdweb/react";
import VaultsDetailContainer from "@/containers/VaultsDetailContainer";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";

function Index({ }) {
    const account = useActiveAccount();
    const { id } = useParams();
    const wallet = useWallet();

    return (
        <>
            {(account || wallet) && (
                <div className="flex-1 flex flex-col w-full justify-between py-20 pl-6">
                    <div className="flex-1">
                        <VaultsDetailContainer vaultID={id} old={true}/>
                    </div>
                </div>
            )}
        </>
    );
}

export default Index;
