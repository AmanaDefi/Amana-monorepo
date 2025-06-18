"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Chain } from "viem";

import { useFundWalletStore } from "@/store/fundWalletStore";
import ChainSelector from "@/components/VaultsDetailsWrapper/components/ChainSelector";
import { Modal } from "../base/Modal";
import { DepositInput } from "./components/DepositInput";
import ZetaChainLogo from "@public/logo/zetachain.svg";
import { AppButton } from "@/components/button/AppButton";
import { showSuccessToast } from "@/toasts";
import { useState } from "react";

export const Deposit = () => {
  const {
    step,
    setStep,
    closeAll,
    setChain,
    chain,
    currency,
    depositAmount,
    activeConnector,
    setCurrency,
    setDepositAmount,
  } = useFundWalletStore();

  const [error, setError] = useState("");

  const handleSelectChain = (chain: Chain) => {
    setChain(chain);
    setCurrency(undefined);
    setDepositAmount("");
  };

  const handleConnectWallet = () => {
    setStep("connectWallet");
  };

  const handleClose = () => {
    activeConnector?.disconnect();
    closeAll();
  };

  const handleConfirm = () => {
    showSuccessToast("Successfully Topped Up");
    activeConnector?.disconnect();
    handleClose();
  };

  const handlePressButton = () => {
    if (step === "confirm") {
      handleConfirm();
    } else {
      handleConnectWallet();
    }
  };

  const isButtonDisabled =
    (!chain || !currency || !depositAmount || !!error) && step === "confirm";

  return (
    <Modal
      isOpen={step === "setValues" || step === "confirm"}
      onClose={handleClose}
      paddingClass="px-4 pt-5 pb-6"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[526px]"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
      >
        <div className="flex flex-col justify-center items-center gap-[32px] px-7 w-full font-gotham">
          <div className="flex flex-col w-full">
            <h2 className="text-[24px] font-medium text-white">Deposit</h2>
            <p className="text-[16px] font-normal text-[#4874DB]">
              Select network and asset
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <div className="mb-4 w-full ">
              <ChainSelector
                selectedChain={chain}
                onSelectChain={handleSelectChain}
                isFromTopUp
              />
            </div>
            <DepositInput setError={setError} error={error} />
          </div>
          <div className="mt-3 w-full">
            <div className="bg-[#181D29] h-[1px] w-full mb-6" />
            <AppButton
              disabled={isButtonDisabled}
              variant="reverse"
              onClick={handlePressButton}
            >
              {step === "confirm" ? "Confirm" : "Connect Wallet"}
            </AppButton>
          </div>

          <div className="flex items-center gap-3 opacity-40">
            <span
              className="uppercase text-white text-sm font-normal tracking-wide"
              style={{ fontSize: "16px", lineHeight: "112%" }}
            >
              Backed by
            </span>
            <Link href="https://www.zetachain.com/" target="_blank">
              <ZetaChainLogo height={26} className="w-auto h-[26px]" />
            </Link>
          </div>
        </div>
      </motion.div>
    </Modal>
  );
};
