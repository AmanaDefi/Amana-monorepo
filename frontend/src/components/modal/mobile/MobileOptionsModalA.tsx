"use client";

import { useAuthStore } from "@/store/authStore";
import PopularOptions from "../shared/PopularOptions";
import { MobileModal } from "./MobileModal";
import WalletButtons from "../shared/WalletButtons";

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
      showHeader={true}
    >
      <div className="flex flex-col flex-1 h-full justify-center items-center">
        <div className="flex flex-col flex-1 mt-[72px] ">
          <PopularOptions />
          <WalletButtons
            handleSmartWallets={handleSmartWallets}
            openStep={openStep}
          />
        </div>
      </div>
    </MobileModal>
  );
};

export default MobileOptionsModalA;
