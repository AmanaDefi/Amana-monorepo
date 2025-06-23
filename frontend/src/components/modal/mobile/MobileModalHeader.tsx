import CloseModalIcon from "@/components/svg/CloseModalIcon";
import { MobileInfoBlock } from "./MobileInfoBlock";


type MobileModalHeaderProps = {
  onClose: () => void;
  infoText?: string;
  showInfoBlock?: boolean;
};

export const MobileModalHeader = ({
  onClose,
  infoText = '💡 Connecting your wallet is like "logging in" to Web3. Select your wallet from the options to get started',
  showInfoBlock = true,
}: MobileModalHeaderProps) => {
  return (
    <>
      {showInfoBlock && (
        <div className="absolute top-[16px] left-[16px] z-10 rounded-[8px] flex items-center justify-center w-10 h-10">
          <MobileInfoBlock isLeft>{infoText}</MobileInfoBlock>
        </div>
      )}
      <button
        onClick={onClose}
        className="absolute top-[16px] right-[16px] z-10 rounded-[8px] flex items-center justify-center w-10 h-10"
        aria-label="Close"
      >
        <CloseModalIcon width={12} height={12} />
      </button>
    </>
  );
};
