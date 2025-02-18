"use client";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  Dispatch,
  SetStateAction,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { SUPPORTED_CHAINS } from "@/constants/chainConfig";
import {
  useActiveAccount,
  useActiveWallet,
  useConnectModal,
  useDisconnect,
} from "thirdweb/react";
import { client } from "@/utils/client";
import { wallets } from "@/components/header";
import useSolanaBalance from "@/hooks/useSolanaBalance";
import { WalletName } from "@solana/wallet-adapter-base";
declare global {
  interface Window {
    solana?: any;
    evm?: any;
  }
}

export type ChainType = "solana" | "evm" | null;

interface MultiChainContextType {
  selectedChain: ChainType;
  walletAddress: string | null;
  solanaBalance: number | null;
  connectSolana: () => Promise<void>;
  connectEthereum: () => Promise<void>;
  disconnectWallet: () => void;
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
}

const MultiChainContext = createContext<MultiChainContextType | undefined>(
  undefined
);

export const useMultiChain = () => {
  const context = useContext(MultiChainContext);
  if (!context) {
    throw new Error("useMultiChain must be used within MultiChainProvider");
  }
  return context;
};

export const MultiChainProvider = ({ children }: { children: ReactNode }) => {
  const [selectedChain, setSelectedChain] = useState<ChainType>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { connect, isConnecting } = useConnectModal();
  const activeAccount = useActiveWallet();
  const { disconnect: evmDisconnect } = useDisconnect();
  const { publicKey, disconnect, select, connect: solanaConnect } = useWallet();
  const { setVisible, visible } = useWalletModal();
  const account = useActiveAccount();

  const solanaBalance = useSolanaBalance();

  // Connect Solana Wallet
  const connectSolana = async () => {
    setIsModalOpen(false);
    try {
      if (selectedChain == "evm") {
        if (activeAccount) evmDisconnect(activeAccount);
      }
      console.log("visible", visible);
      setVisible(true);
      // await solanaConnect();

      // select("Phantom" as WalletName);
    } catch (error) {
      console.error("Solana connection error:", error);
    }
  };
  // Connect Ethereum Wallet
  const connectEthereum = async () => {
    setIsModalOpen(false);
    try {
      const wallet = await connect({
        client: client,
        chains: SUPPORTED_CHAINS,
        wallets: wallets,
      });
      if (wallet) {
        const walletAccount: any = wallet.getAccount();

        setWalletAddress(walletAccount.address);
        setSelectedChain("evm");
        //Disconnect Solana
        await disconnect();
      }
    } catch (error) {
      console.error("Ethereum connection error:", error);
    }
  };

  //  Disconnect Wallet
  const disconnectWallet = async () => {
    setWalletAddress(null);
    setSelectedChain(null);
    disconnect();
    if (activeAccount) evmDisconnect(activeAccount);
    setIsModalOpen(false);
  };

   useEffect(() => {
    if (!account && !publicKey) {
      disconnectWallet();
      setIsModalOpen(true);
    } else {
      setIsModalOpen(false);
    }
  }, [account, publicKey]);

  return (
    <MultiChainContext.Provider
      value={{
        selectedChain,
        walletAddress,
        solanaBalance,
        connectSolana,
        connectEthereum,
        disconnectWallet,
        isModalOpen,
        setIsModalOpen,
      }}
    >
      {children}
    </MultiChainContext.Provider>
  );
};
