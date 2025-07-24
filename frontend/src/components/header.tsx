"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import { useRef, useState, useEffect } from "react";
import { NAV_LINKS } from "@/constants/navigation";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useAuthStore } from "@/store/authStore";
import { useInitializationStore } from "@/store/initializationStore";
import Button from "./common/Button";

import ChainSwitcher from "./chainswitcher/ChainSwitcher";
import ProfileIcon from "./svg/Profile";
import ProfileDropdown from "./ProfileDropdown";
import BurgerMenuIcon from "./svg/BurgerMenu";
import MobileMenuModal from "./modal/MobileMenuModal";
import { CHAIN_ID } from "@/constants/chainConfig";
import ButtonSkeleton from "./button/Skeleton";

interface HeaderProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const Header: React.FC<HeaderProps> = ({ activeSection, onSectionChange }) => {
  const path = usePathname();
  const router = useRouter();
  const { isReady } = useInitializationStore();

  const {
    walletAddress,
    activeChain,
    activeEvmWallet: activeAccount,
  } = useMultiChain();
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

  const renderAuthButton = () => {
    if (!isReady()) {
      return <ButtonSkeleton variant="responsive" />;
    }

    if (!isConnected) {
      return (
        <Button variant="signIn" onClick={handleSignInClick}>
          Sign in
        </Button>
      );
    }

    return (
      <Button
        ref={profileButtonRef}
        variant="secondary"
        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
        className={`
          transition-all duration-300 ease-in-out
          lg:!w-[192px] lg:!h-[56px] lg:!px-[16px] lg:!py-[17px]
          max-lg:!w-[96px] max-lg:!h-[40px] max-lg:!px-[12px] max-lg:!py-[10px]
          relative z-50
        `}
      >
        <div className="flex flex-row gap-2 leading-[18px] items-center transition-all duration-300">
          <ProfileIcon width={18} height={18} className="flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <p className="text-white font-normal truncate transition-all duration-300 lg:text-[18px] max-lg:text-[14px]">
              <span className="lg:hidden">
                {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
              </span>
              <span className="hidden lg:inline">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </p>
          </div>
        </div>
      </Button>
    );
  };

  const renderMobileAuthButton = () => {
    if (!isReady()) {
      return <ButtonSkeleton variant="mobile" />;
    }

    if (!isConnected) {
      return (
        <Button variant="signIn" onClick={handleSignInClick}>
          Sign in
        </Button>
      );
    }

    return (
      <Button
        ref={profileButtonRef}
        variant="secondary"
        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
        className={`
          transition-all duration-300 ease-in-out
          !w-[96px] !h-[40px] !px-[12px] !py-[10px]
          relative z-50
        `}
      >
        <div className="flex flex-row gap-1 leading-[18px] items-center transition-all duration-300">
          <div className="flex flex-col min-w-0">
            <p className="text-[14px] text-white font-normal truncate transition-all duration-300">
              {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </p>
          </div>
        </div>
      </Button>
    );
  };

  return (
    <>
      <header
        className={`w-full flex items-center justify-between font-gotham relative z-50 h-[60px] px-0 lg:px-11 transition-all duration-300 ease-in-out ${
          isConnected ? " mb-7 lg:mb-10" : "mb-0 lg:mb-10"
        }`}
      >
        <div className="flex items-center gap-[41px] flex-1 relative z-50">
          <Link
            href="/"
            className={`flex items-center transition-all duration-300 ${!isConnected ? "block" : "lg:hidden"}`}
          >
            <AmanaLogo width={65} height={46} className="w-[65px] h-[46px]" />
          </Link>

          <nav className="hidden lg:flex items-center min-w-[427px]">
            {navLinks.map(({ label, href }) => (
              <span
                key={href}
                className={`cursor-pointer font-normal text-white text-[16px] border rounded-lg px-[14px] py-[10px] flex items-center justify-center relative z-50 
        transition-all duration-200 ease-in-out
        hover:scale-105 
        active:scale-95
        ${path === href ? "border-[#1B46E0]" : "border-transparent"}
      `}
                onClick={() => router.push(href)}
              >
                {label}
              </span>
            ))}
          </nav>
        </div>

        {path === "/leaderboard" && (
          <div className="absolute left-1/2 transform -translate-x-1/2 lg:hidden z-50">
            <span className="text-[20px] font-bold text-white leading-[-0.5]">
              Leaderboard
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 lg:gap-6 flex-1 justify-end relative z-50">
          <div className="transition-all duration-300 ease-in-out">
            {isConnected &&
              activeAccount?.walletClientType !== "privy" &&
              !isMenuOpened &&
              activeChain?.id !== CHAIN_ID["solana"] && <ChainSwitcher />}
          </div>

          <div className="hidden lg:flex flex-shrink-0 transition-all duration-300 ease-in-out">
            {renderAuthButton()}
          </div>

          {/* Mobile Section */}
          <div className="lg:hidden flex flex-row items-center gap-2 flex-shrink-0">
            {(path === "/" || path === "/about") && (
              <div className="flex transition-all duration-300 ease-in-out">
                {renderMobileAuthButton()}
              </div>
            )}
            <button
              onClick={toggleMenu}
              className="lg:hidden h-10 relative z-50 transition-all duration-200 hover:scale-105 active:scale-95"
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
