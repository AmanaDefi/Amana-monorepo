"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import { useRef, useState } from "react";
import { NAV_LINKS } from "@/constants/navigation";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useAuthStore } from "@/store/authStore";
import Button from "./Button";
import ChainSwitcher from "./chainswitcher/ChainSwitcher";
import { useAccount, useUser } from "@account-kit/react";
import ProfileIcon from "./svg/Profile";
import ProfileDropdown from "./ProfileDropdown";
import BurgerMenuIcon from "./svg/BurgerMenu";
import MobileMenuModal from "./modal/MobileMenuModal";



interface HeaderProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const Header: React.FC<HeaderProps> = ({ activeSection, onSectionChange }) => {
  const path = usePathname();
  const router = useRouter();
  const activeAccount = useUser();
  const account = useAccount({ type: "ModularAccountV2" });
  const { walletAddress, switchToChain, activeChain, balance } =
    useMultiChain();
  const isConnected = !!walletAddress;
  const [isMenuOpened, setIsMenuOpened] = useState(false);

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  const { openStep } = useAuthStore();

  const navLinks = isConnected
    ? [{ label: "Home", href: "/" }, ...NAV_LINKS.slice(1)]
    : NAV_LINKS;

  const toggleMenu = () => {
    setIsMenuOpened((prev) => !prev);
  };

  return (
    <>
      <header
        className={`w-full flex items-center justify-between font-gotham ${
          isConnected
            ? "px-0 md:px-11 mb-7 h-[60px] md:h-[40px]"
            : "px-0 md:pl-11 md:pr-0 h-[80px] mb-0 md:mb-9"
        }`}
      >
        <div className="flex items-center gap-[41px]">
          <Link
            href="/"
            className={`flex items-center ${!isConnected ? "block" : "md:hidden"}`}
          >
            <AmanaLogo width={65} height={46} className="w-[65px] h-[46px]" />
          </Link>

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

        <div className="flex items-center gap-2 md:gap-6">
          {isConnected && activeAccount?.type === "eoa" && !isMenuOpened && <ChainSwitcher />}
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
                className="py-4 !px-[31px] !h-[56px]"
              >
                <div className="flex flex-row gap-2 leading-[18px] items-center">
                  <ProfileIcon width={18} height={18} />
                  <div className="flex flex-col">
                    <p className="text-[18px] text-white font-normal">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                  </div>
                </div>
              </Button>
            )}
          </div>

          <div className="md:hidden flex flex-row items-center gap-2">
            {path === "/" && (
              <div className="md:hidden flex">
                {!isConnected ? (
                  <Button
                    variant="signIn"
                    className="w-[96px] !h-10"
                    onClick={() => openStep("mobileOptionsA")}
                  >
                    Sign in
                  </Button>
                ) : (
                  <Button
                    ref={profileButtonRef}
                    variant="secondary"
                    onClick={() =>
                      setIsProfileDropdownOpen(!isProfileDropdownOpen)
                    }
                    className="!px-4 !h-10"
                  >
                    <div className="flex flex-row gap-2 leading-[18px] items-center">
                      <ProfileIcon width={18} height={18} />
                      <div className="flex flex-col">
                        <p className="text-[18px] text-white font-normal">
                          {walletAddress.slice(0, 6)}...
                          {walletAddress.slice(-4)}
                        </p>
                      </div>
                    </div>
                  </Button>
                )}
              </div>
            )}
            <button
              onClick={toggleMenu}
              className="md:hidden h-10"
              aria-label="Toggle mobile menu"
            >
              <BurgerMenuIcon />
            </button>
          </div>
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
      <MobileMenuModal isOpen={isMenuOpened} toggleMenu={toggleMenu} />
    </>
  );
};

export default Header;
