"use client";

import { Modal } from "../Modal";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";
import ConnectWallet from "../shared/ConnectWallet";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import PopularOptions from "../shared/PopularOptions";
import SmartWalletIcon from "@/components/svg/SmartWalletIcon";
import ModalButton from "../shared/ModalButton";

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
      <div className="flex max-w-[761px]">
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
        <div className="flex flex-col">
          <PopularOptions />

          <ModalButton
            label="Smart Wallet"
            icon={<SmartWalletIcon width={29} height={25} />}
            onClick={() => openStep("signup")}
          />

          <button className="flex items-center gap-3 border border-[#3E73C4] rounded-[8px] px-4 py-3 text-white text-[16px] font-semibold hover:bg-[#3E73C4]/10 transition">
            <Image
              src="/icons/all-wallets.svg"
              width={24}
              height={24}
              alt="All Wallets"
            />
            All Wallets
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default OptionsModal;