"use client";

import { useAuthStore } from "@/store/authStore";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import PopularOptions from "../shared/PopularOptions";
import ModalButton from "../shared/ModalButton";
import EmailOptionsIcon from "@/components/svg/EmailOptionsIcon";
import PasskeyOptionsIcon from "@/components/svg/PasskeyOptionsIcon";
import GoogleOptionsIcon from "@/components/svg/GoogleOptionsButton";
import { useAuthenticate } from "@account-kit/react";
import { MobileModal } from "./MobileModal";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";

const MobileOptionsModalB = () => {
  const { step, closeAll, openStep, setError, successAuth } = useAuthStore();

  const { authenticate, isPending, error } = useAuthenticate({
    onSuccess: (result) => {
      console.log("Success google auth", result);
      successAuth();
    },
    onError: (err) => {
      console.log("Error google auth:", err);
      setError(err.message);
    },
  });

  const handleLogin = () => {
    if (isPending) return;
    authenticate({
      type: "oauth",
      authProviderId: "google",
      isCustomProvider: false,
      mode: "popup",
    });
  };

  return (
    <MobileModal
      isOpen={step === "mobileOptionsB"}
      onClose={closeAll}
      height="h-[484px]"
      paddingClass="pt-8 px-[20px]"
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
      <div className="h-full flex flex-col justify-center items-center">
        <div className="flex flex-col flex-1 mt-[72px] ">
          <PopularOptions />
          <p className="text-sm text-[#535E73] mt-4">Popular options</p>

          <div className="flex flex-col gap-4 mt-6">
            <ModalButton
              label="E-mail"
              icon={<EmailOptionsIcon width={20} height={16} />}
              onClick={() => openStep("signup")}
            />
            <ModalButton
              label="Passkey"
              icon={<PasskeyOptionsIcon width={19} height={19} />}
              onClick={() => openStep("passkey")}
            />
            <ModalButton
              label="Google"
              icon={<GoogleOptionsIcon width={20} height={20} />}
              onClick={handleLogin}
            />
          </div>
        </div>
      </div>
    </MobileModal>
  );
};

export default MobileOptionsModalB;
