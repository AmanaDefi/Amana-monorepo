import React from "react";
import { AiTwotoneCloseCircle } from "react-icons/ai";
import { ChainType } from "@/providers/MultiChainProvider";

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
        className="cursor-pointer w-full px-4 py-2 bg-black bg-opacity-95 text-white rounded-lg mb-2 hover:bg-opacity-85 text-center"
        onClick={() => onSelectNetwork("solana")}
      >
        {title}
      </div>
    );
  };

  const connectEVMButton = (title: string) => {
    return (
      <div
        className="cursor-pointer w-full px-4 py-2 bg-black bg-opacity-95 text-white rounded-lg text-center hover:bg-opacity-85 mb-2"
        onClick={() => {
          onSelectNetwork("evm");
        }}
      >
        {title}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80 gap-4 flex flex-col">
        <div className="flex justify-between items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900 text-center">
            {walletAddress ? "Manage wallet" : "Select Network"}
          </h2>
          <div className="text-right">
            <button className=" text-gray-500 text-right" onClick={onClose}>
              <AiTwotoneCloseCircle size={26} />
            </button>
          </div>
        </div>
        {walletAddress ? (
          <div className="flex flex-col gap-3">
            <div className="text-w-full px-4 py-2 bg-black bg-opacity-95 text-white rounded-lg text-center hover:bg-opacity-85 cursor-pointer">
              {`${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`}{" "}
            </div>
            <div
              className="text-w-full px-4 py-2 bg-black bg-opacity-95 text-white rounded-lg text-center hover:bg-opacity-85 cursor-pointer"
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
            {connectSolanaButton("Connect Solana")}
            {connectEVMButton("Connect EVM")}
          </>
        )}
      </div>
    </div>
  );
};

export default SelectNetworkModal;
