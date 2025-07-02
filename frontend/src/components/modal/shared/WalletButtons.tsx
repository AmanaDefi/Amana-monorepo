import ModalButton from "../shared/ModalButton";
import SmartWalletIcon from "@/components/svg/SmartWalletIcon";
import AllWalletsIcon from "@/components/svg/AllWalletsIcon";
import GoogleEmailIcon from "@/components/svg/GoogleEmailIcon";
import GooglePasskeyIcon from "@/components/svg/GooglePasskeyIcon";
import CryptoIcons from "../shared/CryptoIcons";
import { AuthStep } from "@/store/authStore";

interface WalletButtonsProps {
  handleSmartWallets: () => void;
  openStep: (step: AuthStep) => void;
}

const WalletButtons = ({
  handleSmartWallets,
  openStep,
}: WalletButtonsProps) => {
  const handleAllWalletsClick = () => {
    const isMobile = window.innerWidth < 1024;

    if (isMobile) {
      openStep("mobileAllWallets");
    } else {
      openStep("allWallets");
    }
  };

  return (
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
        onClick={handleAllWalletsClick}
      >
        <CryptoIcons />
      </ModalButton>
    </div>
  );
};

export default WalletButtons;
