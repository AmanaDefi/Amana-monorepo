"use client";

import { Modal } from "../base/Modal";
import { motion } from "framer-motion";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import { useFundWalletStore } from "@/store/fundWalletStore";
import ChainSelector from "@/components/VaultsDetailsWrapper/components/ChainSelector";
import { Chain } from "viem";
import InputTokenWithError from "@/components/input/InputTokenWithError";

export const Deposit = () => {
  const { step, setStep, closeAll, setChain, chain } = useFundWalletStore();

  const handleSelectChain = (chain: Chain) => {
    setChain(chain);
  };

  return (
    <Modal
      isOpen={step === "setValues"}
      onClose={closeAll}
      paddingClass="px-4 pt-5 pb-6"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[526px]"
    >
      <div className="flex justify-end">
        <button
          onClick={closeAll}
          className="rounded-[8px] flex items-center justify-center w-10 h-10"
          aria-label="Close"
        >
          <CloseModalIcon width={16} height={16} />
        </button>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
      >
        <div className="flex flex-col justify-center items-center gap-[45px] px-7 font-gotham">
          <h2 className="text-center text-[24px] font-medium text-white">
            Add Funds
          </h2>
          <div className="flex flex-col gap-4">
            <div className="mb-4">
              <ChainSelector
                selectedChain={chain}
                onSelectChain={handleSelectChain}
              />
            </div>

          </div>
        </div>
      </motion.div>
    </Modal>
  );
};
