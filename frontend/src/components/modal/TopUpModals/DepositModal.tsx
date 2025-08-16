"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Chain, parseUnits } from "viem";

import { useFundWalletStore } from "@/store/fundWalletStore";
import ChainSelector from "@/components/VaultsDetailsWrapper/components/ChainSelector";
import { Modal } from "../base/Modal";
import { DepositInput } from "./components/DepositInput";
import ZetaChainLogo from "@public/logo/zetachain.svg";
import { AppButton } from "@/components/button/AppButton";
import { showSuccessToast } from "@/toasts";
import { useEffect, useMemo, useState } from "react";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import { Token } from "@/types/types";
import { useWallets } from "@privy-io/react-auth";
import { useWallet } from "@solana/wallet-adapter-react";
import { executeWalletTopup } from "@/actions/actions";
import { useMultiChain } from "@/providers/MultiChainProvider";
import WarningIcon from "@/components/svg/WarningIcon";
import ChainsModal from "../chains/ChainsModal";
import { useChainTokenModalStore } from "@/store/chainTokenModalStore";

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
    setTxHash,
  } = useFundWalletStore();

  const [error, setError] = useState("");
  const { walletAddress: smartWalletAddress, activeEvmWallet: activeWallet } =
    useMultiChain();

  const walletContext = useWallet();
  const [loading, setLoading] = useState(false);
  const [txError, setTxError] = useState(false);

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
    if (walletContext?.connected) {
      walletContext?.disconnect();
    }
    if (activeConnector) {
      await activeConnector?.disconnect();
    }
    closeAll();
  };

  useEffect(() => {
    if (!step) {
      setLoading(false);
      setTxError(false);
      setError("");
    }
  }, [step]);

  useEffect(() => {
    if (walletContext.publicKey && !chain) {
    }
  }, [walletContext.publicKey, chain]);

  useEffect(() => {
    setError("");
    setTxError(false);
  }, [chain, currency]);

  const isExternalWalletConnected = useMemo(() => {
    if (!chain) return false;

    if (chain.name === "Solana") {
      return !!walletContext.publicKey && walletContext.connected;
    } else {
      return !!activeWallet && activeWallet.walletClientType !== "privy";
    }
  }, [chain, walletContext.publicKey, walletContext.connected, activeWallet]);

  const isButtonDisabled = (() => {
    if (step === "confirm") {
      return !chain || !currency || !depositAmount || !!error;
    }

    if (isExternalWalletConnected && chain && currency) {
      return !depositAmount || !!error;
    }

    return false;
  })();

  useEffect(() => {
    if (step === "confirm" && chain) {
      const isCurrentChainWalletConnected =
        chain.name === "Solana"
          ? !!walletContext.publicKey && walletContext.connected
          : !!activeWallet && activeWallet.walletClientType !== "privy";

      if (!isCurrentChainWalletConnected) {
        setStep("setValues");
      }
    }
  }, [
    chain?.id,
    step,
    walletContext.publicKey,
    walletContext.connected,
    activeWallet,
  ]);

  const handleConfirm = async () => {
    if (
      !chain ||
      !currency ||
      !depositAmount ||
      !!error ||
      !smartWalletAddress
    ) {
      console.log("Early return due to missing values");
      return;
    }

    try {
      setTxError(false);
      setLoading(true);
      const newAmt = parseUnits(depositAmount, currency?.decimals);

      const result = await executeWalletTopup(
        currency,
        activeWallet,
        chain,
        smartWalletAddress,
        newAmt,
        walletContext,
      );

      if (result.transactionHash) {
        setTxHash(result.transactionHash);
        showSuccessToast("Successfully Topped Up");
        setStep("finishDeposit");
      } else {
        console.log("No transaction hash, setting error");
        setTxError(true);
      }
    } catch (e) {
      console.error("Transaction error:", e);
      setTxError(true);
    } finally {
      setLoading(false);
    }
  };
  const handlePressButton = () => {
    if (step === "confirm") {
      handleConfirm();
    } else if (isExternalWalletConnected && chain && currency) {
      setStep("confirm");
    } else {
      handleConnectWallet();
    }
  };

  const onTokenSelect = (token: Token) => {
    setCurrency(token);
    setError("");
  };

  const onSelectChainAndToken = (chain: Chain, token: Token) => {
    setTxError(false);
    onTokenSelect(token);
    setChain(chain);
    if (!!walletAddress && activeWallet.walletClientType !== "privy") {
      activeWallet.switchChain(chain.id);
    }
  };

  const getButtonText = () => {
    if (loading) return "Pending...";
    if (step === "confirm") return "Confirm";
    if (isExternalWalletConnected && chain && currency) return "Confirm";
    return "Connect Wallet";
  };

  const { isOpen: isChainsModalOpen } = useChainTokenModalStore();

  return (
    <>
      <Modal
        isOpen={
          (step === "setValues" || step === "confirm") && !isChainsModalOpen
        }
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
          <div className="flex flex-col justify-center items-center px-0 md:px-7 w-full font-gotham">
            <div className="flex flex-col w-full">
              <h2 className="text-[24px] font-medium text-white">Deposit</h2>
              <p className="text-[16px] font-normal text-[#4874DB]">
                Select network and asset
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-6">
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
            <div className="w-full">
              <div className="bg-[#181D29] h-[1px] w-full mb-6" />
              <AppButton
                disabled={isButtonDisabled}
                variant="reverse"
                onClick={handlePressButton}
              >
                {getButtonText()}
              </AppButton>
            </div>
            {txError && (
              <div className="flex flex-row items-center gap-[10px] mt-[10px] mb-2">
                <WarningIcon height={16} width={16} />
                <p className="text-[#FFC700] text-xs leading-4">
                  Transaction failed please try again
                </p>
              </div>
            )}

            <div className="flex flex-row items-center gap-3 opacity-40 mt-8">
              <span className="uppercase text-white text-base leading-7 font-normal tracking-wide">
                Backed by
              </span>
              <Link href="https://www.zetachain.com/" target="_blank">
                <ZetaChainLogo
                  height={26}
                  className="w-auto h-[26px] mb-[1px]"
                />
              </Link>
            </div>
          </div>
        </motion.div>
      </Modal>

      <ChainsModal />
    </>
  );
};
