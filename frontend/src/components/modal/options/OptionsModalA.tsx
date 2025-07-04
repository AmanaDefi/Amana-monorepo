"use client";

import { Modal } from "../base/Modal";
import { useAuthStore } from "@/store/authStore";
import ConnectWallet from "../shared/ConnectWallet";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import PopularOptions from "../shared/PopularOptions";
import WalletButtons from "../shared/WalletButtons";

const OptionsModalA = () => {
  const { step, closeAll, openStep } = useAuthStore();

  const handleSmartWallets = () => {
    const hasViewedOnboarding = localStorage.getItem("hasViewedOnboarding");
    if (hasViewedOnboarding) {
      openStep("optionsB");
    } else {
      localStorage.setItem("hasViewedOnboarding", "true");
      openStep("onboarding");
    }
  };

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
            <WalletButtons
              handleSmartWallets={handleSmartWallets}
              openStep={openStep}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OptionsModalA;
