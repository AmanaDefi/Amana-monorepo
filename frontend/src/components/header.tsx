"use client";

import { inAppWallet, createWallet } from "thirdweb/wallets";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import MobileMenuModal from "@/components/modal/MobileMenuModal";
// import ConnectButton from "./ConnectButton";
import { useState } from "react";
import { ConnectButton } from "thirdweb/react";
import { client } from "@/utils/client";
import { SUPPORTED_CHAINS } from "@/constants/chainConfig";
import ChainSwitcher from "./chainswitcher/ChainSwitcher";
import MultiConnectButton from "./ConnectButton";

export const wallets = [
  //   inAppWallet({
  //     auth: {
  //       options: ["google", "email", "passkey"],
  //     },
  // smartAccount: ACCOUNT_ABSTRACTION_CONFIG,
  //   }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("com.trustwallet.app"),
  createWallet("com.ledger"),
];

const Header = () => {
  const path = usePathname();
  const router = useRouter();
  const [isSolanaWalletModalOpen, setIsSolanaWalletModalOpen] = useState(false);

  return (
    <header className="z-[5] text-white px-6 py-2.5 flex justify-between items-center border-b border-tuatara-900 lg:px-8 lg:py-7 max-w-[1536px] mx-auto w-full">
      <Link href='/' className='flex items-center gap-2 lg:gap-3'>
        <AmanaLogo height={30} className='h-[25px] w-auto md:h-[54px] text-white' />
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
              className={`cursor-pointer ${path === "/about" ? "font-bold text-themeColor" : ""
                }`}
              onClick={() => router.push("/about")}
            >
              About
            </span>
            <span
              className={`cursor-pointer ${path === "/leaderboard" ? "font-bold text-themeColor" : ""
                }`}
              onClick={() => router.push("/leaderboard")}
            >
              Leaderboard
            </span>
            <span
              className={`cursor-pointer ${path === "/roadmap" ? "font-bold text-themeColor" : ""
                }`}
              onClick={() => router.push("/roadmap")}
            >
              Roadmap
            </span>
            {/* <span
              className={`cursor-pointer ${path === "/transaction-flow" ? "font-bold text-themeColor" : ""
                }`}
              onClick={() => router.push("/transaction-flow")}
            >
              Transaction Flow
            </span> */}
            {/* <span
              className={`cursor-pointer ${path === "/old-vaults" ? "font-bold text-themeColor" : ""
                }`}
              onClick={() => router.push("/old-vaults")}
            >
              Old Vaults
            </span> */}
          </nav>
          {/* Select Network Modal */}
          <ChainSwitcher/>
          <MultiConnectButton />
          {/* <ConnectButton wallets={wallets} chains={SUPPORTED_CHAINS} client={client} /> */}
        </div>
        <MobileMenuModal />
      </div>
    </header>
  )
}

export default Header;
