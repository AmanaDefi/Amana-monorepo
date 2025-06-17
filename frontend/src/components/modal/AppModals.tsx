
import { ChooseBuyWith } from "./TopUpModals/ChooseBuyWith";
import { Deposit } from "./TopUpModals/DepositModal";
import AllWAllets from "./allWallets/AllWallets";
import OnboardingModal from "./onboarding/OnboardingModal";
import OptionsModalA from "./options/OptionsModalA";
import OptionsModalB from "./options/OptionsModalB";
import { Checking } from "./passkey/CheckingLoader";
import { NotVerify } from "./passkey/NotVerify";
import { SignIn } from "./passkey/SignIn";
import { SignatureCheck } from "./passkey/SignatureCheck";
import ReceiveModal from "./recieve/RecieveModal";
import { SignUpModal } from "./smartWallet/SignUpModal";
import { VerifyOtpModal } from "./smartWallet/VerifyOtpModal";
import WelcomeModal from "./welcome/WelcomeModal";

export const AppModals = () => {
  return (
    <>
      <SignUpModal />
      <VerifyOtpModal />
      <OptionsModalA />
      <OptionsModalB />
      <AllWAllets />
      <WelcomeModal />
      <OnboardingModal />
      <SignIn />
      <SignatureCheck />
      <Checking />
      <NotVerify />
      <ChooseBuyWith />
      <Deposit />
      <ReceiveModal />
    </>
  );
};
