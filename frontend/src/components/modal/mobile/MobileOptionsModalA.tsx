"use client";

import { useAuthStore } from "@/store/authStore";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import PopularOptions from "../shared/PopularOptions";
import SmartWalletIcon from "@/components/svg/SmartWalletIcon";
import ModalButton from "../shared/ModalButton";
import AllWalletsIcon from "@/components/svg/AllWalletsIcon";
import { MobileModal } from "./MobileModal";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";

const MobileOptionsModalA = () => {
  const { step, closeAll, openStep } = useAuthStore();

  const handleSmartWallets = () => {
    const hasViewedOnboarding = localStorage.getItem("hasViewedOnboarding");
    if (hasViewedOnboarding) {
      openStep("mobileOptionsB");
    } else {
      localStorage.setItem("hasViewedOnboarding", "true");
      openStep("onboarding");
    }
  };

  return (
    <MobileModal
      isOpen={step === "mobileOptionsA"}
      onClose={closeAll}
      height="h-[426px]"
      paddingClass="p-5"
      customCloseButton={
        <>
          <div className="absolute top-[16px] left-[16px] z-10 rounded-[8px] flex items-center justify-center w-10 h-10">
            <ErrorInputIcon width={18} height={18} className="fill-[#1B46E0]" />
          </div>
          <button
            onClick={closeAll}
            className="absolute top-[16px] right-[16px] z-10 rounded-[8px] flex items-center justify-center w-10 h-10"
            aria-label="Close"
          >
            <CloseModalIcon width={12} height={12} />
          </button>
        </>
      }
    >
      <div className="flex flex-col flex-1 h-full justify-center items-center">
        <div className="flex flex-col flex-1 mt-[72px] ">
          <PopularOptions />
          <p className="text-sm text-[#535E73] mt-4">Popular options</p>

          <div className="flex flex-col gap-4 mt-6">
            <ModalButton
              label="Smart Wallet"
              icon={<SmartWalletIcon width={22} height={19} />}
              onClick={handleSmartWallets}
            />
            <ModalButton
              label="All Wallets"
              icon={<AllWalletsIcon width={20} height={20} />}
              onClick={() => openStep("mobileAllWallets")}
            />
          </div>
        </div>
      </div>
    </MobileModal>
  );
};

export default MobileOptionsModalA;
