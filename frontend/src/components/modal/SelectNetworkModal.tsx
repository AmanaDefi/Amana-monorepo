import React from "react";
import { AiTwotoneCloseCircle, AiTwotoneCloseSquare } from "react-icons/ai";
import { ChainType } from "@/providers/MultiChainProvider";
import { XMarkIcon } from "@heroicons/react/24/outline";
interface SelectNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChain: ChainType;
  walletAddress: string | null;
  onSelectNetwork: (network: "solana" | "evm") => void;
  disconnectWallet: () => void;
}

const SelectNetworkModal: React.FC<SelectNetworkModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
  onSelectNetwork,
  disconnectWallet,
  selectedChain,
}) => {
  if (!isOpen) return null;

  const connectSolanaButton = (title: string) => {
    return (
      <div
        className="flex items-center justify-center h-[50px] cursor-pointer w-full text-white rounded-lg border border-borderBtn hover:border-borderBlue duration-300 transition-all"
        onClick={() => onSelectNetwork("solana")}
      >
        {title}
      </div>
    );
  };

  const connectEVMButton = (title: string) => {
    return (
      <div
        className="flex items-center justify-center h-[50px] cursor-pointer w-full text-white rounded-lg border border-borderBtn hover:border-borderBlue duration-300 transition-all mb-2"
        onClick={() => {
          onSelectNetwork("evm");
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
            {walletAddress ? "Manage wallet" : "Select Network"}
          </h2>
        </div>
        {walletAddress ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center h-[50px] cursor-pointer w-full text-white rounded-lg border border-borderBtn hover:border-borderBlue duration-300 transition-all mb-2">
              {`${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`}{" "}
            </div>
            <div
              className="flex items-center justify-center h-[50px] cursor-pointer w-full text-white rounded-lg border border-borderBtn hover:border-borderBlue duration-300 transition-all mb-2"
              onClick={disconnectWallet}
            >
              Disconnect{" "}
            </div>
            {selectedChain == "evm"
              ? connectSolanaButton("Switch to Solana")
              : connectEVMButton("Switch to EVM")}
          </div>
        ) : (
          <>
            {connectSolanaButton("Solana")}
            {connectEVMButton("EVM")}
          </>
        )}
      </div>
    </div>
  );
};

export default SelectNetworkModal;
