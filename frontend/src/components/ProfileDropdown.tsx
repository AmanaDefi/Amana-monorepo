"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { usePathname } from "next/navigation";
import ProfileDropdownIcon from "./svg/ProfileDropdownIcon";
import CheckIcon from "./svg/CheckIcon";
import CopyIcon from "./svg/CopyIcon";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { LogOutIcon } from "./svg/sidebar/LogOutIcon";

interface MenuItem {
  label: string;
  href?: string;
  onClick?: () => void;
  isLogout?: boolean;
}

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  onDisconnect?: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  onDisconnect,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { walletAddress, disconnectWallet } = useMultiChain();
  const [copySuccess, setCopySuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [pathname]);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    },
    [onClose, triggerRef],
  );

  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  const handleScroll = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleResize = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    isOpen,
    handleClickOutside,
    handleEscapeKey,
    handleScroll,
    handleResize,
    handleVisibilityChange,
  ]);

  useEffect(() => {
    if (!walletAddress && isOpen) {
      onClose();
    }
  }, [walletAddress, isOpen, onClose]);

  const dropdownVariants: Variants = {
    hidden: {
      opacity: 0,
      y: -10,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: {
        duration: 0.15,
        ease: "easeIn",
      },
    },
  };

  const handleDisconnect = useCallback(() => {
    disconnectWallet();
    onClose();
  }, [disconnectWallet, onClose]);

  const handleCopy = useCallback(async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopySuccess(true);

      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      setCopySuccess(false);
      console.log("Error copy address", err);
    }
  }, [walletAddress]);

  const getMobileStyles = () => {
    if (!isMobile) return {};

    return {
      position: "fixed" as const,
      top: "80px",
      right: "16px",
      width: "calc(100vw - 32px)",
      maxWidth: "360px",
    };
  };

  const getDesktopStyles = () => {
    if (isMobile) return {};

    return {
      position: "absolute" as const,
      top: "115px",
      right: "44px",
      minWidth: "360px",
    };
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && walletAddress && (
        <>
          {isMobile && (
            <motion.div
              className="fixed inset-0 bg-black/20 z-[999]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
          )}

          <motion.div
            ref={dropdownRef}
            className="dropdown-menu"
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              ...getMobileStyles(),
              ...getDesktopStyles(),
              backgroundColor: "#14171F",
              borderRadius: "16px",
              padding: "16px 10px",
              zIndex: 1000,
              border: "1px solid #2A2D36",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div className="font-gotham px-4">
              <p className="text-sm font-normal text-[#535E73]">
                Connected with
              </p>
              <div className="flex mt-2 justify-between items-center">
                <div className="flex flex-row gap-2 items-center">
                  <div className="rounded-[200px] p-1 flex items-center justify-center bg-[#09090F] h-[44px] w-[44px] transition-all duration-200">
                    <ProfileDropdownIcon width={26} height={26} />
                  </div>
                  <p className="text-[14px] text-[#535E73] font-normal">
                    {isMobile
                      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                      : `${walletAddress.slice(0, 1)}...${walletAddress.slice(-6)}`}
                  </p>
                  <div
                    onClick={handleCopy}
                    className={`cursor-pointer transition-colors rounded ${
                      isMobile
                        ? "p-2 hover:bg-gray-700"
                        : "p-1 hover:bg-gray-700"
                    }`}
                  >
                    {copySuccess ? <CheckIcon /> : <CopyIcon />}
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className={`text-[#535E73] hover:text-white transition-colors ${
                    isMobile ? "p-2" : "p-1"
                  }`}
                >
                  <LogOutIcon
                    width={19}
                    height={18}
                    className="fill-[#535E73]"
                  />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfileDropdown;
