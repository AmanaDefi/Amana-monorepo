"use client";

import { Modal } from "../base/Modal";
import { useAuthStore } from "@/store/authStore";
import ConnectWallet from "../shared/ConnectWallet";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import PopularOptions from "../shared/PopularOptions";
import SmartWalletIcon from "@/components/svg/SmartWalletIcon";
import ModalButton from "../shared/ModalButton";
import AllWalletsIcon from "@/components/svg/AllWalletsIcon";
import BackedBy from "../shared/BackedBy";
import { useRouter } from "next/navigation";

const OptionsModalA = () => {
  const { step, closeAll, openStep } = useAuthStore();

  return (
    <Modal
      isOpen={step === "optionsA"}
      onClose={closeAll}
      paddingClass="pt-[45px] pl-[57px] pb-[26px] pr-[91px]"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[761px]"
      minHeight="min-h-[560px]"
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
      <div className="flex flex-col justify-between min-h-[489px]">
        <div className="flex max-w-[761px] flex-row gap-[56px]">
          <div className="flex flex-col justify-between">
            <ConnectWallet />
          </div>
          <div className="flex flex-col ">
            <PopularOptions />
            <div className="flex flex-col gap-4 mt-6">
              <ModalButton
                label="Smart Wallet"
                icon={<SmartWalletIcon width={29} height={25} />}
                onClick={() => openStep("onboarding")}
              />
              <ModalButton
                label="All Wallets"
                icon={<AllWalletsIcon width={28} height={27} />}
                onClick={() => openStep("allWallets")}
              />
            </div>
          </div>
        </div>
        <div>
          <BackedBy />
        </div>
      </div>
    </Modal>
  );
};

export default OptionsModalA;