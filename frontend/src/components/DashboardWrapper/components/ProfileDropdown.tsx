"use client";
import QRcodeIcon from "@/components/svg/QRcodeIcon";
import CopyIcon from "@/components/svg/CopyIcon";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useState } from "react";

interface ProfileDropdownProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

export default function ProfileDropdown({
  isOpen,
  setIsOpen,
}: ProfileDropdownProps) {
  const { openStep } = useAuthStore();

  const [copied, setCopied] = useState(false);

  const { walletAddress } = useMultiChain();

  const handleCopy = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute 
              top-full right-1/2 transform -translate-x-1/2 mt-4
              md:top-0 md:left-full md:transform-none md:ml-2 md:mt-0
              bg-[#1D2A41] rounded-lg shadow-lg z-50"
            style={{
              minWidth: "160px",
              height: "84px",
              padding: "13px",
              borderRadius: "8px",
            }}
          >
            <div className="flex flex-col gap-1">
              <motion.button
                whileHover={{
                  backgroundColor: "#14171F",
                  transition: { duration: 0.15 },
                }}
                className="flex items-center gap-2 text-white text-sm font-normal rounded transition-colors"
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: 400,
                }}
                onClick={() => openStep("receive")}
              >
                <div className="flex gap-2 items-center">
                  <QRcodeIcon width={16} height={17} />
                  <span className="text-[14px]">QR Code</span>
                </div>
              </motion.button>
              <motion.button
                whileHover={{
                  backgroundColor: "#14171F",
                  transition: { duration: 0.15 },
                }}
                className="flex items-center gap-2 text-white text-sm font-normal rounded transition-colors"
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: 400,
                }}
                onClick={handleCopy}
              >
                <div className="flex gap-2 items-center">
                  {copied ? (
                    <p className="text-green-400 text-sm">Copied!</p>
                  ) : (
                    <>
                      <CopyIcon width={16} height={17} color="#fff" />
                      <span className="text-[14px] whitespace-nowrap">
                        Copy Address
                      </span>
                    </>
                  )}
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
