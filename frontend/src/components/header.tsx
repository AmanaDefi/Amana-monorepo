"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import { useRef, useState, useEffect } from "react";
import { NAV_LINKS } from "@/constants/navigation";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useAuthStore } from "@/store/authStore";
import Button from "./common/Button";
import ChainSwitcher from "./chainswitcher/ChainSwitcher";
import ProfileIcon from "./svg/Profile";
import ProfileDropdown from "./ProfileDropdown";
import BurgerMenuIcon from "./svg/BurgerMenu";
import MobileMenuModal from "./modal/MobileMenuModal";
import { useWallets } from "@privy-io/react-auth";

interface HeaderProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const Header: React.FC<HeaderProps> = ({ activeSection, onSectionChange }) => {
  const path = usePathname();
  const router = useRouter();
  const {wallets} = useWallets();
  const activeAccount = wallets[0];
  const { walletAddress} =
    useMultiChain();
  const isConnected = !!walletAddress;
  const [isMenuOpened, setIsMenuOpened] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  const { openStep } = useAuthStore();

  const checkScreenSize = () => {
    setIsMobile(window?.innerWidth <= 768);
  };

  useEffect(() => {
    checkScreenSize();
    window?.addEventListener("resize", checkScreenSize);
    return () => {
      window?.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  const handleSignInClick = () => {
    const currentWidth = window?.innerWidth;
    if (currentWidth <= 768) {
      openStep("mobileOptionsA");
    } else {
      openStep("optionsA");
    }
  };

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
            ? "px-0 lg:px-11 mb-7 lg:mb-10 h-[60px] lg:h-[40px]"
            : "px-0 lg:pl-11 lg:pr-0 h-[80px] mb-0 lg:mb-9"
        }`}
      >
        <div className="flex items-center gap-[41px]">
          <Link
            href="/"
            className={`flex items-center ${!isConnected ? "block" : "lg:hidden"}`}
          >
            <AmanaLogo width={65} height={46} className="w-[65px] h-[46px]" />
          </Link>

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

        <div className="flex items-center gap-2 lg:gap-6">
          {isConnected && activeAccount?.walletClientType !== "privy" && !isMenuOpened && (
            <ChainSwitcher />
          )}

          <div className="hidden lg:block">
            {!isConnected ? (
              <Button variant="signIn" onClick={handleSignInClick}>
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

          <div className="lg:hidden flex flex-row items-center gap-2">
            {path === "/" && (
              <div className="lg:hidden flex">
                {!isConnected ? (
                  <Button variant="signIn" onClick={handleSignInClick}>
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
              className="lg:hidden h-10"
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
