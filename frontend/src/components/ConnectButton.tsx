import { client } from "@/app/client";
import { SUPPORTED_CHAINS } from "@/constants/chainConfig";
import { ConnectButton as ThirdwebConnectButton } from "thirdweb/react";
import { wallets } from "./header";
import { useMultiChain } from "@/providers/MultiChainProvider";
import SelectNetworkModal from "./modal/SelectNetworkModal";

export default function ConnectButton() {
  const {
    selectedChain,
    walletAddress,
    solanaBalance,
    isModalOpen,
    connectSolana,
    connectEthereum,
    disconnectWallet,
    setIsModalOpen,
  } = useMultiChain();

  return (
    <>
      {selectedChain == "evm" ? (
        <ThirdwebConnectButton
          client={client}
          chains={SUPPORTED_CHAINS}
          wallets={wallets}
          connectModal={{ size: "compact" }}
        />
      ) : (
        <div>
        {walletAddress ? (
          <div className="flex items-center space-x-3">
            <button
              className="p-2 bg-grayBtn rounded-lg border border-borderBtn hover:bg-grayBtnHover w-[165px] h-[50px]"
              onClick={() => setIsModalOpen(true)}
            >
              <div className="flex space-x-2">
                <div className="w-[35px] h-[35px] bg-green-500 rounded-full"></div>
                <div className="flex flex-col items-start">
                  <span className="text-white text-[12px]">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                  <span className="text-gray-500 text-[12px]">
                    {`${solanaBalance?.toFixed(3)} SOL`}
                  </span>
                </div>
              </div>
            </button>
          </div>
        ) : (
          <button
            className="p-2 bg-grayBtn rounded-lg border border-borderBtn hover:bg-grayBtnHover w-[165px] h-[50px] text-white"
            onClick={() => setIsModalOpen(true)}
          >
            Connect
          </button>
          )}
        </div>
      )}
      <SelectNetworkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedChain={selectedChain}
        walletAddress={walletAddress}
        onSelectNetwork={(network) => {
          if (network === "solana") {
            connectSolana();
          } else {
            connectEthereum();
          }
        }}
        disconnectWallet={disconnectWallet}
      />
    </>
  );
}
