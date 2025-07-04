"use client";

import { useCreateWallet, useLoginWithOAuth } from "@privy-io/react-auth";

import { Modal } from "../base/Modal";
import { useAuthStore } from "@/store/authStore";
import ConnectWallet from "../shared/ConnectWallet";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import PopularOptions from "../shared/PopularOptions";
import ModalButton from "../shared/ModalButton";
import BackedBy from "../shared/BackedBy";
import EmailOptionsIcon from "@/components/svg/EmailOptionsIcon";
import PasskeyOptionsIcon from "@/components/svg/PasskeyOptionsIcon";
import GoogleOptionsIcon from "@/components/svg/GoogleOptionsButton";
import { useWallet } from "@solana/wallet-adapter-react";

const OptionsModalB = () => {
  const { step, closeAll, openStep, setError, successAuth } = useAuthStore();
  const { createWallet } = useCreateWallet();
  const {
    disconnect,
    publicKey
  } = useWallet();

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
    <Modal
      isOpen={step === "optionsB"}
      onClose={closeAll}
      paddingClass="pt-[45px] pl-[57px] pb-[26px] pr-[91px]"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[761px]"
      minHeight="h-[370px]"
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
          <div className="flex flex-col pt-4">
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
      </div>
    </Modal>
  );
};

export default OptionsModalB;
