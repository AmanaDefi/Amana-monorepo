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
import { ethers } from "ethers";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { solanaRpcUrl, SUPPORTED_CHAINS } from "@/constants/chainConfig";
import {
  useActiveAccount,
  useActiveWallet,
  useConnectedWallets,
  useConnectModal,
  useConnect,
  useDisconnect,
} from "thirdweb/react";
import { client } from "@/utils/client";
import { wallets } from "@/components/header";
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
  const [solanaBalance, setSolanaBalance] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { connect, isConnecting } = useConnectModal();
  const activeAccount = useActiveWallet();
  const { disconnect: evmDisconnect } = useDisconnect();
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const account = useActiveAccount();

  // Connect Solana Wallet
  const connectSolana = async () => {
    setIsModalOpen(false);
    try {
      if (selectedChain == "evm") {
        if (activeAccount) evmDisconnect(activeAccount);
      }
      setVisible(true);
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
        console.log("walletAccount", walletAccount.address);

        setWalletAddress(walletAccount.address);
        setSelectedChain("evm");
        //Disconnect Solana
        setSolanaBalance(0);
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
    setSolanaBalance(0);
    disconnect();
    if (activeAccount) evmDisconnect(activeAccount);
    setIsModalOpen(false);
  };

  const initSolana = async () => {
    if (publicKey) {
      setSelectedChain("solana");
      setWalletAddress(publicKey?.toBase58());
      const solanaConnection = new Connection(solanaRpcUrl);
      const bal = await solanaConnection.getBalance(publicKey);
      setSolanaBalance(bal / LAMPORTS_PER_SOL);
    }
  };

  useEffect(() => {
    initSolana();
  }, [publicKey]);

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
