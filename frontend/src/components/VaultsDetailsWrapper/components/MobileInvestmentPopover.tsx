"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import YourInvestment from "@/components/VaultsDetailsWrapper/components/YourInvestment";
import { VaultData } from "@/types/types";

interface MobileInvestmentPopoverProps {
  isVisible: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  depositAmount: string;
  vaultTokenSymbol: string;
  depositUSDValue: number;
  vaultData: VaultData;
}

const MobileInvestmentPopover = ({
  isVisible,
  onClose,
  triggerRef,
  depositAmount,
  vaultTokenSymbol,
  depositUSDValue,
  vaultData,
}: MobileInvestmentPopoverProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible, onClose, triggerRef]);

  const top = triggerRef.current
    ? triggerRef.current.getBoundingClientRect().bottom + 16
    : 80;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={dropdownRef}
          className="fixed left-4 right-4 z-50"
          style={{ top }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <YourInvestment
            depositAmount={depositAmount}
            vaultTokenSymbol={vaultTokenSymbol}
            depositUSDValue={depositUSDValue}
            vaultData={vaultData}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileInvestmentPopover;
