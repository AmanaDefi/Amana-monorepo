import { ConnectButton } from "thirdweb/react";
import { client } from "../utils/client";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { ZC_TEST_ETH_BASESEPOLIA_ADDRESS } from "../../../constants";
import { usePathname } from 'next/navigation';
import { useState } from "react";
import { useRouter } from 'next/navigation';

const wallets = [
    inAppWallet({
        auth: {
            options: ["google", "email", "passkey"],
        },
        // smartAccount: ACCOUNT_ABSTRACTION_CONFIG,
    }),
    createWallet("io.metamask"),
    createWallet("com.coinbase.wallet"),
    createWallet("me.rainbow"),
    createWallet("io.rabby"),
    createWallet("com.trustwallet.app"),
    createWallet("com.ledger"),
    createWallet("global.safe"),
];

const Header = () => {

    const pathname = usePathname();
    const [path] = useState(pathname)
    const router = useRouter();

    return (
        <div>
            <header className="w-5/6 text-white p-4 flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tighter text-zinc-100">Amana</h1>
                <nav className="flex space-x-8">
                    <span
                        className={`cursor-pointer ${path === "/vaults" ? "font-bold text-primaryYellow" : ""
                            }`}
                        onClick={() => router.push("/vaults")}
                    >
                        Vaults
                    </span>
                    <span
                        className={`cursor-pointer ${path === "/buy" ? "font-bold text-primaryYellow" : ""
                            }`}
                        onClick={() => router.push("/buy")}
                    >
                        Fund Wallet
                    </span>
                    <span
                        className={`cursor-pointer ${path === "/about" ? "font-bold text-primaryYellow" : ""
                            }`}
                        onClick={() => router.push("/about")}
                    >
                        About
                    </span>
                </nav>

                {/* Connect Button */}
                <div className="absolute top-5 right-5">
                    <ConnectButton
                        client={client}
                        chains={[SUPPORTED_CHAINS[0]]}
                        wallets={wallets}
                        connectModal={{ size: "compact" }}
                    />
                </div>
            </header>
        </div>
    )
}

export default Header
