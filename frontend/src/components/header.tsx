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
import { useMultiChain } from "@/providers/MultiChainProvider";
import { wallets } from "@/constants/wallets";

const Header = () => {
  const path = usePathname();
  const router = useRouter();
  const { walletAddress } = useMultiChain();
  const isConnected = !!walletAddress;
  const [isSolanaWalletModalOpen, setIsSolanaWalletModalOpen] = useState(false);

  const navLinks = isConnected
    ? [{ label: "Home", href: "/" }, ...NAV_LINKS.slice(1)]
    : NAV_LINKS;
  
  return (
    <header
      className={`w-full flex items-center justify-between  ${isConnected ? "px-11 mb-7 h-[40px]" : "pl-11 mb-9 h-[80px]"}`}
    >
      <div className="flex items-center gap-[41px]">
        {!isConnected && (
          <Link href="/" className="flex items-center">
            <AmanaLogo width={65} height={46} className="w-[65px] h-[46px]" />
          </Link>
        )}
        <nav className="hidden lg:flex items-center min-w-[427px]">
          {navLinks.map(({ label, href }) => (
            <span
              key={href}
              className={`cursor-pointer transition font-normal text-white text-[16px] border rounded-lg px-[14px] py-[10px] flex items-center justify-center ${
                path === href ? "border-[#1B46E0]" : "border-transparent"
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
