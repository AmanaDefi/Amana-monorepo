"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  const dropdownVariants = {
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

  const handleDisconnect = () => {
    disconnectWallet();
    onClose();
  };

  const handleCopy = async () => {
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
  };

  if (!isOpen || !walletAddress) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        className="dropdown-menu"
        variants={dropdownVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{
          position: "absolute",
          top: "115px",
          right: "44px",
          backgroundColor: "#14171F",
          borderRadius: "16px",
          padding: "16px 10px",
          minWidth: "360px",
          zIndex: 1000,
          border: "1px solid #2A2D36",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div className="font-gotham px-4">
          <p className="text-sm font-normal text-[#535E73]">Connected with</p>
          <div className="flex mt-2 justify-between items-center">
            <div className=" flex flex-row gap-2 items-center">
              <div className="rounded-[200px] p-1 flex items-center justify-center bg-[#09090F] h-[44px] w-[44px] transition-all duration-200">
                <ProfileDropdownIcon width={26} height={26} />
              </div>
              <p className="text-[14px] text-[#535E73] font-normal">
                {walletAddress.slice(0, 1)}...{walletAddress.slice(-6)}
              </p>
              <div onClick={handleCopy}>
                {copySuccess ? <CheckIcon /> : <CopyIcon />}
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="p-1 text-[#535E73] hover:text-white"
            >
              <LogOutIcon width={19} height={18} className="fill-[#535E73]" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProfileDropdown;
