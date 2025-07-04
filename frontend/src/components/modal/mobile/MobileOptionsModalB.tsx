"use client";

import { useAuthStore } from "@/store/authStore";
import PopularOptions from "../shared/PopularOptions";
import ModalButton from "../shared/ModalButton";
import EmailOptionsIcon from "@/components/svg/EmailOptionsIcon";
import PasskeyOptionsIcon from "@/components/svg/PasskeyOptionsIcon";
import GoogleOptionsIcon from "@/components/svg/GoogleOptionsButton";

import { MobileModal } from "./MobileModal";
import { useLoginWithOAuth, useCreateWallet } from "@privy-io/react-auth";
import { useWallet } from "@solana/wallet-adapter-react";

const MobileOptionsModalB = () => {
  const { step, closeAll, openStep, setError, successAuth } = useAuthStore();
  const { createWallet } = useCreateWallet();
  const { disconnect, publicKey } = useWallet();

  const { initOAuth } = useLoginWithOAuth({
    onError: (e) => {
      setError(e);
    },
    onComplete: async (result) => {
      if (!result?.user?.wallet) {
        await createWallet();
      }
      if (publicKey) {
        disconnect();
      }
      if (!result.wasAlreadyAuthenticated) {
        successAuth();
      }
    },
  });

  const handleLogin = () => {
    initOAuth({
      provider: "google",
    });
  };
  return (
    <MobileModal
      isOpen={step === "mobileOptionsB"}
      onClose={closeAll}
      height="h-[484px]"
      paddingClass="pt-8 px-[20px]"
      showHeader={true}
    >
      <div className="h-full flex flex-col justify-center items-center">
        <div className="flex flex-col flex-1 mt-[72px] ">
          <PopularOptions />
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
