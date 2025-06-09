import OptionsModalA from "./options/OptionsModalA";
import OptionsModalB from "./options/OptionsModalB";
import { SignUpModal } from "./smartWallet/SignUpModal";
import { VerifyOtpModal } from "./smartWallet/VerifyOtpModal";

export const AppModals = () => {
  return (
    <>
      <SignUpModal />
      <VerifyOtpModal />
      <OptionsModalA />
      <OptionsModalB />
    </>
  );
};
