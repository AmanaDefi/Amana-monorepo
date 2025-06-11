"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import MobileSidebar from "./MobileSidebarMenu";
import { useState } from "react";
import { NAV_LINKS } from "@/constants/navigation";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { AppButton } from "./button/AppButton";
import { useAuthStore } from "@/store/authStore";
import Button from "./Button";
import { BrowserProvider, ethers, Signer } from "ethers";
import { ethereumProvider } from "@/utils/providers";
import Image from "next/image";
import ChainSwitcher from "./chainswitcher/ChainSwitcher";
import { formatBalance, formatTokenBalance } from "@/utils/utils";


const BurgerIcon = ({ isOpen }: { isOpen: boolean }) => (
  <div className="flex flex-col w-6 h-6 justify-center items-center">
    <span
      className={`block h-0.5 w-6 bg-white transform transition duration-300 ease-in-out ${
        isOpen ? "rotate-45 translate-y-1.5" : ""
      }`}
    />
    <span
      className={`block h-0.5 w-6 bg-white transform transition duration-300 ease-in-out ${
        isOpen ? "opacity-0" : "opacity-100"
      } mt-1`}
    />
    <span
      className={`block h-0.5 w-6 bg-white transform transition duration-300 ease-in-out ${
        isOpen ? "-rotate-45 -translate-y-1.5" : ""
      } mt-1`}
    />
  </div>
);

interface HeaderProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const Header: React.FC<HeaderProps> = ({ activeSection, onSectionChange }) => {
  const path = usePathname();
  const router = useRouter();
  const { walletAddress, switchToChain, activeChain, balance } =
    useMultiChain();
  const isConnected = !!walletAddress;
  const [isSolanaWalletModalOpen, setIsSolanaWalletModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [signer, setSigner] = useState<Signer | null>(null);
  console.log("active chain", activeChain);

  const { openStep } = useAuthStore();

  const navLinks = isConnected
    ? [{ label: "Home", href: "/" }, ...NAV_LINKS.slice(1)]
    : NAV_LINKS;

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <>
      <header
        className={`w-full flex items-center justify-between font-gotham ${
          isConnected
            ? "px-4 md:px-11 mb-7 h-[60px] md:h-[40px]"
            : "px-4 md:pl-11 md:pr-0 h-[80px]"
        }`}
      >
        <div className="flex items-center gap-[41px]">
          {isConnected && (
            <button
              onClick={toggleMobileSidebar}
              className="md:hidden text-white p-2"
              aria-label="Toggle mobile menu"
            >
              <BurgerIcon isOpen={isMobileSidebarOpen} />
            </button>
          )}

          {!isConnected && (
            <Link href="/" className="flex items-center">
              <AmanaLogo width={65} height={46} className="w-[65px] h-[46px]" />
            </Link>
          )}

          <nav className="hidden md:flex items-center min-w-[427px]">
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
          <ChainSwitcher />
          {/* {SUPPORTED_CHAINS.map((chain) => (
            <button key={chain.chain.id} className={classNames({"text-blue-button": activeChain?.id === chain.chain.id})} onClick={() => switchToChain(chain.chain)}>
              {chain.chain.name}
            </button>
          ))} */}

          <div className="hidden md:block thirdweb-connect-override">
            {!isConnected ? (
              <AppButton onClick={() => openStep("optionsA")}>
                Sign in
              </AppButton>
            ) : (
              <AppButton onClick={() => {}}>
                <div className="flex flex-row gap-2 text-base leading-[18px] items-center">
                  <Image
                    src={"/accountEllipse.png"}
                    alt={""}
                    width={32}
                    height={32}
                    className="h-[32px] w-[32px]"
                    sizes="32px"
                  />
                  <div className="flex flex-col">
                    <p>
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                    <p className="text-[#535E73]">
                      {Number(balance.formatted).toFixed(4)}{" "}
                      {activeChain?.nativeCurrency?.symbol}
                    </p>
                  </div>
                </div>
              </AppButton>
            )}
          </div>

          {path === "/" && (
            <div className="thirdweb-connect-override md:hidden ">
              {!isConnected ? (
                <AppButton onClick={() => openStep("optionsA")}>
                  Sign in
                </AppButton>
              ) : (
                <div className="flex flex-row gap-2 text-base leading-[18px] items-center">
                  <Image
                    src={"/accountEllipse.png"}
                    alt={""}
                    width={32}
                    height={32}
                    className="h-[32px] w-[32px]"
                    sizes="32px"
                  />
                  <div className="flex flex-col">
                    <p>
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                    <p className="text-[#535E73]">
                      {balance.formatted} {activeChain?.nativeCurrency?.symbol}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* {!isConnected && (
            <Button
              variant="signIn"
              onClick={() => openStep("optionsA")}
              className=""
            >
              Sign in
            </Button>
          )} */}
        </div>
      </header>

      {isConnected && (
        <MobileSidebar
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Header;
