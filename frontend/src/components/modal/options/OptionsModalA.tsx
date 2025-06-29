"use client";

import { Modal } from "../base/Modal";
import { useAuthStore } from "@/store/authStore";
import ConnectWallet from "../shared/ConnectWallet";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import PopularOptions from "../shared/PopularOptions";
import SmartWalletIcon from "@/components/svg/SmartWalletIcon";
import ModalButton from "../shared/ModalButton";
import AllWalletsIcon from "@/components/svg/AllWalletsIcon";
import GoogleEmailIcon from "@/components/svg/GoogleEmailIcon";
import GooglePasskeyIcon from "@/components/svg/GooglePasskeyIcon";
import PhantomIcon from "@/components/svg/PhantomIcon";
import MetaMaskIcon from "@/components/svg/MetaMaskIcon";
import BaseIcon from "@/components/svg/BaseIcon";

const OptionsModalA = () => {
  const { step, closeAll, openStep } = useAuthStore();

  const handleSmartWallets = () => {
    const hasViewedOnboarding = localStorage.getItem('hasViewedOnboarding');
    if (hasViewedOnboarding) {
      openStep('optionsB')
    } else {
      localStorage.setItem('hasViewedOnboarding', 'true');
      openStep("onboarding")
    }
  }

  return (
    <Modal
      isOpen={step === "optionsA"}
      onClose={closeAll}
      paddingClass="pt-[45px] pl-[57px] pb-[26px] pr-[91px]"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[761px]"
      minHeight="min-h-[355px]"
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
      <div className="flex flex-col justify-between">
        <div className="flex max-w-[761px] flex-row gap-[56px]">
          <div className="flex flex-col justify-between">
            <ConnectWallet />
          </div>
          <div className="flex flex-col pt-4">
            <PopularOptions />
            <div className="flex flex-col gap-4 mt-6">
              <ModalButton
                label="Smart Wallet"
                icon={<SmartWalletIcon width={22} height={19} />}
                onClick={handleSmartWallets}
              >
                <div className="flex flex-row gap-2 mr-4 items-center">
                  <GoogleEmailIcon width={19} height={14} />
                  <GooglePasskeyIcon width={19} height={19} />
                </div>
              </ModalButton>
              <ModalButton
                label="All Wallets"
                icon={<AllWalletsIcon width={20} height={20} />}
                onClick={() => openStep("allWallets")}
              >
                <div className="flex flex-row items-center mr-4">
                  <div className="rounded-full bg-[#0C1015] w-5 h-5 border border-[#d9d9d9]/50 flex items-center justify-center z-10">
                    <PhantomIcon width={12} height={10} />
                  </div>
                  <div className="rounded-full bg-[#0C1015] w-5 h-5 border border-[#d9d9d9]/50 flex items-center justify-center -ml-1 z-20">
                    <BaseIcon width={12} height={12} />
                  </div>
                  <div className="rounded-full bg-[#0C1015] w-5 h-5 border border-[#d9d9d9]/50 flex items-center justify-center -ml-1 z-30">
                    <MetaMaskIcon width={13} height={12} />
                  </div>
                </div>
              </ModalButton>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OptionsModalA;