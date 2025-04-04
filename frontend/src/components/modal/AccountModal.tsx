import React from "react";
import { AiTwotoneCloseCircle, AiTwotoneCloseSquare } from "react-icons/ai";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { AccountMode } from "@/providers/AccountProvider";
interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMode: AccountMode;
  onSelectMode: (mode: "wallet" | "passkey") => void;
  disconnectWallet: () => void;
}

const AccountModeModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  selectedMode,
  onSelectMode,
  disconnectWallet,
}) => {
  if (!isOpen) return null;

  const switchWalletModeButton = (title: string) => {
    return (
      <div
        className="flex items-center justify-center h-[50px] cursor-pointer w-full text-white rounded-lg border border-borderBtn hover:border-borderBlue duration-300 transition-all"
        onClick={() => onSelectMode("wallet")}
      >
        {title}
      </div>
    );
  };

  const switchPasskeyModeButton = (title: string) => {
    return (
      <div
        className="flex items-center justify-center h-[50px] cursor-pointer w-full text-white rounded-lg border border-borderBtn hover:border-borderBlue duration-300 transition-all mb-2"
        onClick={() => {
          onSelectMode("passkey");
        }}
      >
        {title}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md">
      <div className="relative bg-grayBtn border border-borderBtn p-6 rounded-lg shadow-lg w-80 gap-4 flex flex-col">
        <button
          className="absolute top-4 right-4 rounded-md bg-grayBtn border border-transparent hover:border-borderBtn hover:bg-grayBtnHover duration-300 transition-all"
          onClick={onClose}
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        <div className="flex justify-between items-center gap-3">
          <h2 className="text-lg font-bold text-white text-center">
            {selectedMode ? "Switch Account Type" : "Select Account Type"}
          </h2>
        </div>
        <>
          {switchWalletModeButton("Switch to Abstract Mode")}
          {switchPasskeyModeButton("Switch to Wallet Mode")}
        </>
      </div>
    </div>
  );
};

export default AccountModeModal;
