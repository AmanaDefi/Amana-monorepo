"use client"

import { ConnectButton } from "thirdweb/react";
import { client } from "@/utils/client";
import { SUPPORTED_CHAINS } from "@/constants/chainConfig";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { usePathname } from 'next/navigation';
import { useState } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import AmanaLogo from "@public/logo/amanadefi/logo.svg"
import MobileMenuModal from "@/components/modal/MobileMenuModal";
import { Label } from "@headlessui/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import SelectNetworkModal from "./modal/SelectNetworkModal";

export const wallets = [
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
    const path = usePathname();
    const router = useRouter();

    const { selectedChain, walletAddress, solanaBalance, ethBalance, connectSolana, connectEthereum, disconnectWallet, isModalOpen, setIsModalOpen } = useMultiChain();

    return (
        <header className="z-[5] text-white px-6 py-2.5 flex justify-between items-center border-b border-tuatara-900 lg:px-8 lg:py-7 max-w-[1536px] mx-auto w-full">
            <Link href='/' className='flex items-center gap-2 lg:gap-3'>
                <AmanaLogo height={30} className='h-[30px] w-auto md:h-[54px] text-white' />
                <h1 className="text-xl lg:text-3xl lg:leading-[44px] font-bold font-mono tracking-tighter text-zinc-100">AMANA</h1>
            </Link>
            <div className='flex items-center gap-3'>
                <div className='flex items-center gap-3 lg:gap-16'>
                    <nav className="hidden lg:flex gap-16">
                        <span
                            className={`cursor-pointer ${path === "/" ? "font-bold text-themeColor" : ""
                                }`}
                            onClick={() => router.push("/")}
                        >
                            Vaults
                        </span>
                        <span
                            className={`cursor-pointer ${path === "/buy" ? "font-bold text-themeColor" : ""
                                }`}
                            onClick={() => router.push("/buy")}
                        >
                            Fund Wallet
                        </span>
                        <span
                            className={`cursor-pointer ${path === "/about" ? "font-bold text-themeColor" : ""
                                }`}
                            onClick={() => router.push("/about")}
                        >
                            About
                        </span>
                    </nav>
                    {/* Dynamic Connect Button */}
                    <div>
                        {walletAddress ? (
                            <div className="flex items-center space-x-3">
                                <span>{selectedChain === "solana" ? `${solanaBalance} SOL` : `${ethBalance} ETH`}</span>
                                <button className="px-4 py-2 bg-red-600 rounded-lg" onClick={() => setIsModalOpen(true)}>
                                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                                </button>
                            </div>
                        ) : (
                            (<button className="px-8 py-2 bg-white rounded-lg text-black font-bold" onClick={() => setIsModalOpen(true)}>
                                Connect
                            </button>)
                        )}


                    </div>

                    {/* Select Network Modal */}
                    <SelectNetworkModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        selectedChain={selectedChain}
                        walletAddress={walletAddress}
                        onSelectNetwork={(network) => {
                            if (network === "solana") {
                                connectSolana();
                            } else {
                                connectEthereum();
                            }
                        }}
                        disconnectWallet={disconnectWallet}
                    />
                    {/* <ConnectButton
                        client={client}
                        chains={SUPPORTED_CHAINS}
                        wallets={wallets}
                        connectModal={{ size: "compact" }}
                    /> */}
                </div>
                <MobileMenuModal />
            </div>
        </header>
    )
}

export default Header
