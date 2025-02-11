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
  useDisconnect,
} from "thirdweb/react";
import { client } from "@/utils/client";
import { wallets } from "@/components/header";
declare global {
  interface Window {
    solana?: any;
    ethereum?: any;
  }
}

export type ChainType = "solana" | "evm" | null;

interface MultiChainContextType {
  selectedChain: ChainType;
  walletAddress: string | null;
  solanaBalance: number | null;
  ethBalance: number | null;
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
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [ethBalance, setEthBalance] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { connect, isConnecting } = useConnectModal();
  const activeAccount = useActiveWallet();
  const { disconnect: etherDisconnect } = useDisconnect();
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const account = useActiveAccount();
  // Connect Solana Wallet
  const connectSolana = async () => {
    try {
      if (selectedChain == "evm") {
        if (activeAccount) etherDisconnect(activeAccount);
      }
      setVisible(true);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Solana connection error:", error);
    }
  };

  // Connect Ethereum Wallet
  const connectEthereum = async () => {
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

        //Fetch ETH balance
        const provider = new ethers.BrowserProvider(window.ethereum);
        const balance = await provider.getBalance(walletAccount.address);
        setEthBalance(parseFloat(ethers.formatEther(balance)));

        //Disconnect Solana
        setSolanaBalance(null);
        await disconnect();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("Ethereum connection error:", error);
    }
  };

  //  Disconnect Wallet
  const disconnectWallet = async () => {
    setWalletAddress(null);
    setSelectedChain(null);
    setSolanaBalance(null);
    setEthBalance(null);
    disconnect();
    if (activeAccount) etherDisconnect(activeAccount);
    setIsModalOpen(false);
  };

  const initSolana = async () => {
    if (publicKey) {
      setSelectedChain("solana");
      setWalletAddress(publicKey?.toBase58());
      console.log(publicKey.toBase58());
      setEthBalance(null);
      const solanaConnection = new Connection(solanaRpcUrl);
      const bal = await solanaConnection.getBalance(publicKey);
      setSolanaBalance(bal / LAMPORTS_PER_SOL);
    } else {
      // if (selectedChain == 'solana' || selectedChain == null) {
      //   setSelectedChain(null);
      //   setWalletAddress(null)
      //   setSolanaBalance(null)
      // }
    }
  };

  useEffect(() => {
    initSolana();
  }, [publicKey]);

  useEffect(() => {
    console.log("publicKey?.toBase58()", publicKey?.toBase58());
  }, []);

  return (
    <MultiChainContext.Provider
      value={{
        selectedChain,
        walletAddress,
        solanaBalance,
        ethBalance,
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
