"use client";

import { Modal } from "../Modal";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";
import ConnectWallet from "../shared/ConnectWallet";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import PopularOptions from "../shared/PopularOptions";
import SmartWalletIcon from "@/components/svg/SmartWalletIcon";
import ModalButton from "../shared/ModalButton";
import AllWalletsIcon from "@/components/svg/AllWalletsIcon";

const OptionsModal = () => {
  const { step, closeAll, openStep } = useAuthStore();

  return (
    <Modal
      isOpen={step === "options"}
      onClose={closeAll}
      paddingClass="pt-[45px] pl-[57px] pb-[26px] pr-[91px]"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[761px]"
      customCloseButton={
        <button
          onClick={closeAll}
          className="absolute top-[20px] right-[16px] z-10 rounded-[8px] flex items-center justify-center w-10 h-10"
          aria-label="Close"
        >
          <CloseModalIcon width={16} height={16} />
        </button>
      }
    >
      <div className="flex max-w-[761px] flex-row gap-[56px]">
        <div className="flex flex-col justify-between">
          <ConnectWallet />
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-[#1B46E0]" />
              <div className="w-2 h-2 rounded-full bg-[#3F3D5A]" />
              <div className="w-2 h-2 rounded-full bg-[#3F3D5A]" />
            </div>
            <span className="ml-4 text-xs text-white">BACKED BY</span>
            <Image
              src="/logo/zetachain.svg"
              alt="Zetachain"
              width={60}
              height={14}
            />
          </div>
        </div>
        <div className="flex flex-col ">
          <PopularOptions />
          <div className="flex flex-col gap-4 mt-6">
            <ModalButton
              label="Smart Wallet"
              icon={<SmartWalletIcon width={29} height={25} />}
              onClick={() => openStep("signup")}
            />
            <ModalButton
              label="All Wallets"
              icon={<AllWalletsIcon width={28} height={27} />}
              onClick={() => {}}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OptionsModal;