import OptionsModal from "./options/OptionsModal";
import { SignUpModal } from "./smartWallet/SignUpModal";
import { VerifyOtpModal } from "./smartWallet/VerifyOtpModal";

export const AppModals = () => {
  return (
    <>
      <SignUpModal />
          <VerifyOtpModal />
          <OptionsModal />
    </>
  );
};
