"use client";

import { Modal } from "../base/Modal";
import { motion } from "framer-motion";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import CardIcon from "@/components/svg/CardIcon";
import { BuyWithEnum, useFundWalletStore } from "@/store/fundWalletStore";
import ModalButton from "../shared/ModalButton";
import ArrowIcon from "@/components/svg/ArrowIcon";

export const ChooseBuyWith = () => {
  const { step, setStep, setBuyWith, closeAll } = useFundWalletStore();

  const handleChoose = (method: BuyWithEnum) => {
    setBuyWith(method);
    if (method === BuyWithEnum.CRYPTO) {
      setStep("setValues");
    }
  };

  return (
    <Modal
      isOpen={step === "chooseBuyWith"}
      onClose={closeAll}
      paddingClass="px-[21px] pt-5 pb-6"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[358px] md:max-w-[526px]"
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
        <div className="flex flex-col justify-center items-center gap-[45px] font-gotham">
          <h2 className="text-center text-[24px] font-medium text-white">
            Add Funds
          </h2>
          <div className="flex flex-col gap-4">
            <ModalButton
              text="Using Card"
              className="w-[316px] md:w-[484px]"
              label="Buy crypto"
              withArrow
              icon={<CardIcon width={35} height={32} />}
              onClick={() => handleChoose(BuyWithEnum.FIAT)}
            />
            <ModalButton
              text="From another wallet, exchange or chain"
              className="w-[316px] md:w-[484px]"
              label="Transfer in"
              withArrow
              onClick={() => handleChoose(BuyWithEnum.CRYPTO)}
              icon={<ArrowIcon width={35} height={32} />}
            />
          </div>
        </div>
      </motion.div>
    </Modal>
  );
};
