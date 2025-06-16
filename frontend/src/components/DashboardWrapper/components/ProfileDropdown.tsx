"use client";
import QRcodeIcon from "@/components/svg/QRcodeIcon";
import CopyIcon from "@/components/svg/CopyIcon";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileDropdownProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

export default function ProfileDropdown({
  isOpen,
  setIsOpen,
}: ProfileDropdownProps) {
  const handleQRCode = () => {
    console.log("QR Code clicked");
    setIsOpen(false);
  };

  const handleCopyAddress = () => {
    console.log("Copy Address clicked");
    setIsOpen(false);
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
            className="absolute top-full mt-2 bg-[#1D2A41] rounded-lg shadow-lg z-50"
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
                onClick={handleQRCode}
              >
                <div className="flex gap-2">
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
                onClick={handleCopyAddress}
              >
                <div className="flex gap-2">
                  <CopyIcon width={16} height={17} color="#fff" />
                  <span className="text-[14px] whitespace-nowrap">
                    Copy Address
                  </span>
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
