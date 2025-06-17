"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import MobileSidebar from "./MobileSidebarMenu";
import { useRef, useState } from "react";
import { NAV_LINKS } from "@/constants/navigation";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { AppButton } from "./button/AppButton";
import { useAuthStore } from "@/store/authStore";
import Button from "./Button";
import { Signer } from "ethers";
import ChainSwitcher from "./chainswitcher/ChainSwitcher";
import { useUser } from "@account-kit/react";
import ProfileIcon from "./svg/Profile";
import ProfileDropdown from "./ProfileDropdown";

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
  const activeAccount = useUser();
  const { walletAddress, switchToChain, activeChain, balance } =
    useMultiChain();
  const isConnected = !!walletAddress;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

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
            : "px-4 md:pl-11 md:pr-0 h-[80px] mb-9"
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

          {isConnected && activeAccount?.type === "eoa" && <ChainSwitcher />}
          <div className="hidden md:block">

            {!isConnected ? (
              <Button variant="signIn" onClick={() => openStep("optionsA")}>
                Sign in
              </Button>
            ) : (
              <Button
                ref={profileButtonRef}
                variant="secondary"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="!py-4 !px-[31px] !h-[56px]"
              >
                <div className="flex flex-row gap-2 leading-[18px] items-center">
                  <ProfileIcon width={18} height={18} />
                  <div className="flex flex-col">
                    <p className="text-[18px] text-white font-normal">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                    {/* <p className="text-[#535E73]">
                      {Number(balance.formatted).toFixed(4)}{" "}
                      {activeChain?.nativeCurrency?.symbol}
                    </p> */}
                  </div>
                </div>
              </Button>
            )}
          </div>

          {path === "/" && (
            <div className="md:hidden ">
              {!isConnected ? (
                <Button variant="signIn" onClick={() => openStep("optionsA")}>
                  Sign in
                </Button>
              ) : (
                <Button
                  ref={profileButtonRef}
                  variant="secondary"
                  onClick={() =>
                    setIsProfileDropdownOpen(!isProfileDropdownOpen)
                  }
                  className="!py-4 !px-[31px] !h-[56px]"
                >
                  <div className="flex flex-row gap-2 leading-[18px] items-center">
                    <ProfileIcon width={18} height={18} />
                    <div className="flex flex-col">
                      <p className="text-[18px] text-white font-normal">
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </p>
                      {/* <p className="text-[#535E73]">
                      {Number(balance.formatted).toFixed(4)}{" "}
                      {activeChain?.nativeCurrency?.symbol}
                    </p> */}
                    </div>
                  </div>
                </Button>
              )}
            </div>
          )}
        </div>
      </header>
      <ProfileDropdown
        isOpen={isProfileDropdownOpen}
        onClose={() => setIsProfileDropdownOpen(false)}
        triggerRef={profileButtonRef}
        onDisconnect={() => {
          setIsProfileDropdownOpen(false);
        }}
      />

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
