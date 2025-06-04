"use client";

import { inAppWallet, createWallet } from "thirdweb/wallets";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import MobileMenuModal from "@/components/modal/MobileMenuModal";
// import ConnectButton from "./ConnectButton";
import { useState } from "react";
import { ConnectButton, useConnect } from "thirdweb/react";
import { client } from "@/utils/client";
import {
  ACCOUNT_ABSTRACTION_CONFIG,
  SUPPORTED_CHAINS,
} from "@/constants/chainConfig";
import { NAV_LINKS } from "@/constants/navigation";

export const wallets = [
  inAppWallet({
    auth: {
      options: ["google", "email", "passkey"],
    },
    //smartAccount: ACCOUNT_ABSTRACTION_CONFIG,
  }),
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
    // <header className="z-[5] text-white px-6 py-2.5 flex justify-between items-center border-b border-tuatara-900 lg:px-8 lg:py-7 max-w-[1536px] mx-auto w-full">
    <header className="w-full h-[80px] flex items-center justify-between mx-auto px-6 lg:px-0">
      <div className="flex items-center gap-[41px]">
        <Link href="/" className="flex items-center">
          <AmanaLogo width={65} height={46} className="w-[65px] h-[46px]" />
        </Link>
        <nav className="hidden lg:flex items-center min-w-[427px]">
          {NAV_LINKS.map(({ label, href }) => (
            <span
              key={href}
              className={`cursor-pointer transition font-normal text-white text-[16px] border rounded-lg px-[14px] py-[10px] flex items-center justify-center ${
                path === href ? "border-[#1B46E0] " : "border-transparent"
              }`}
              onClick={() => router.push(href)}
            >
              {label}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-6">
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
        {/* Select Network Modal */}
        {/* <ChainSwitcher/> */}
        {/* <ConnectButton /> */}
        <div className="hidden lg:block thirdweb-connect-override">
          <ConnectButton
            wallets={wallets}
            chains={SUPPORTED_CHAINS}
            client={client}
            connectButton={{ label: "Sign in" }}
          />
        </div>
        <MobileMenuModal />
      </div>
    </header>
  );
};

export default Header;
