"use client";

import React, { useEffect } from "react";
import { useActiveAccount, useActiveWalletConnectionStatus, useConnectModal } from "thirdweb/react";
import VaultsDetailContainer from "@/containers/VaultsDetailContainer";
import { useParams } from 'next/navigation';
import mixpanel from "mixpanel-browser";
import { connectModalConfig } from "@/providers/AccountProvider";

function Index({ }) {

    const account = useActiveAccount();
    const { connect, isConnecting } = useConnectModal(); // Access the connect function
    const connectionStatus = useActiveWalletConnectionStatus();
    const { id } = useParams();

    useEffect(() => {
        //  Automatically show the connect modal if no account is connected
        if (!account && !isConnecting && connectionStatus !== 'connecting') {
            connect({
                ...connectModalConfig, // Use shared configuration
                locale: "en_US", // Additional options if needed
            }).catch(() => {
                console.log("Connect modal closed without connecting.");
            });
        } else if (account) {
            mixpanel.identify(account.address);
            mixpanel.people.set({
                wallet_address: account.address,
            });
        }
    })

    return (
        <>
            {
                account &&
                <div className="flex-1 flex flex-col w-full justify-between py-20 pl-6">
                    <div className="flex-1">
                        <VaultsDetailContainer vaultID={id} />
                    </div>
                </div>
            }
        </>
    )
}

export default Index
