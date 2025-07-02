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
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import { Token } from "@/types/types";
import { useWallets } from "@privy-io/react-auth";

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
    walletAddress,
  } = useFundWalletStore();

  const [error, setError] = useState("");

  const { wallets } = useWallets();
  const activeWallet = wallets[0];

  const handleSelectChain = (chain: Chain) => {
    setChain(chain);
    if (!!walletAddress && activeWallet.walletClientType !== "privy") {
      activeWallet.switchChain(chain.id);
    }
    setCurrency(undefined);
    setDepositAmount("");
  };

  const handleConnectWallet = () => {
    setStep("connectWallet");
  };

  const handleClose = async () => {
    await activeConnector?.disconnect();
    closeAll();
  };

  const handleConfirm = async () => {
    showSuccessToast("Successfully Topped Up");
    await activeConnector?.disconnect();
    handleClose();
  };

  const handlePressButton = () => {
    if (step === "confirm") {
      handleConfirm();
    } else {
      handleConnectWallet();
    }
  };

  const onTokenSelect = (token: Token) => {
    setCurrency(token);
    setError("");
  };

  const onSelectChainAndToken = (chain: Chain, token: Token) => {
    onTokenSelect(token);
    setChain(chain);
    if (!!walletAddress && activeWallet.walletClientType !== "privy") {
      activeWallet.switchChain(chain.id);
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
      <button
        onClick={closeAll}
        className="rounded-[8px] absolute top-5 right-4 flex items-center justify-center w-10 h-10"
        aria-label="Close"
      >
        <CloseModalIcon width={16} height={16} />
      </button>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
      >
        <div className="flex flex-col justify-center items-center gap-[24px] px-7 w-full font-gotham">
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
                onSelectChainAndToken={onSelectChainAndToken}
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

          <div className="flex flex-row items-center gap-3 opacity-40">
            <span className="uppercase text-white text-base leading-7 font-normal tracking-wide">
              Backed by
            </span>
            <Link href="https://www.zetachain.com/" target="_blank">
              <ZetaChainLogo height={26} className="w-auto h-[26px] mb-[1px]" />
            </Link>
          </div>
        </div>
      </motion.div>
    </Modal>
  );
};
