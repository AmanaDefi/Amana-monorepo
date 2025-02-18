import React, {PropsWithChildren, useEffect, useState} from "react";
import mixpanel from "mixpanel-browser";
import { useActiveAccount, useConnectModal, useActiveWalletConnectionStatus } from "thirdweb/react";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { client } from "../utils/client";
import {usePathname} from "next/navigation";

// Explicitly type the shared configuration for ConnectButton and connect
const connectModalConfig: {
    client: typeof client;
    chains: typeof SUPPORTED_CHAINS;
    wallets: ReturnType<typeof inAppWallet | typeof createWallet>[];
    connectModal: { size: "compact" };
} = {
    client,
    chains: [SUPPORTED_CHAINS[0]],
    wallets: [
        // inAppWallet({
        //     auth: {
        //         options: ["google", "email", "passkey"],
        //     },
        // }),
        createWallet("io.metamask"),
        createWallet("com.coinbase.wallet"),
        createWallet("me.rainbow"),
        createWallet("io.rabby"),
        createWallet("com.trustwallet.app"),
        createWallet("com.ledger"),
        createWallet("global.safe"),
    ],
    connectModal: { size: "compact" }, // Explicitly set the type to "compact"
};

export default function AccountProvider({ children }: PropsWithChildren) {
    const account = useActiveAccount();
    const { connect, isConnecting } = useConnectModal(); // Access the connect function
    const connectionStatus = useActiveWalletConnectionStatus();
    const [initialCheckCount, setInitialCheckCount] = useState(0);
    const [isThirdwebReady, setIsThirdwebReady] = useState(false);

    const route = usePathname();

    useEffect(() => {
        if (initialCheckCount >= 2) {
            setIsThirdwebReady(true);
        }
    }, [initialCheckCount]);

    useEffect(() => {
        // Thirdweb provider initialization triggers two state changes on page load
        // We ignore these before handling real connected wallet state
        if (initialCheckCount < 2) {
            setInitialCheckCount(prev => prev + 1);
        }
        if (!isThirdwebReady) return;

        // Initialize Mixpanel
        mixpanel.init("1f01d05893463c7ba9d4ac7280821010", {
            debug: true,
            track_pageview: true,
            persistence: "localStorage",
        });

        mixpanel.track("Page Viewed", {
            page: "Vaults List",
        });

        if (route === '/') return;

        // Automatically show the connect modal if no account is connected
        if (!account && !isConnecting && connectionStatus !== 'connecting') {
            // connect({
            //     ...connectModalConfig, // Use shared configuration
            //     locale: "en_US", // Additional options if needed
            // }).catch(() => {
            //     console.log("Connect modal closed without connecting.");
            // });
        } else if (account) {
            mixpanel.identify(account.address);
            mixpanel.people.set({
                wallet_address: account.address,
            });
        }
    }, [route, account, connect, connectionStatus, initialCheckCount, isConnecting, isThirdwebReady]);

    return <>{children}</>
}
