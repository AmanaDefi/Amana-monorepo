"use client";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  Dispatch,
  SetStateAction,
  useCallback,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { CHAIN_ID, chainConfigs, SUPPORTED_CHAINS } from "@/constants/chainConfig";
import {
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useConnectModal,
  useDisconnect,
  useWalletBalance,
} from "thirdweb/react";
import { client } from "@/utils/client";
import { wallets } from "@/components/header";
import useSolanaBalance from "@/hooks/useSolanaBalance";
import { Chain } from "thirdweb";
import { Balance } from "@/types/types";
declare global {
  interface Window {
    solana?: any;
    evm?: any;
  }
}

export type ChainType = "solana" | "evm" | null;

interface MultiChainContextType {
  selectedChain: ChainType | null;
  activeChain: Chain | null;
  walletAddress: string | null;
  balance: Balance;
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
  const [selectedChain, setSelectedChain] = useState<ChainType | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { connect, isConnecting } = useConnectModal();
  const activeAccount = useActiveWallet();
  const { disconnect: evmDisconnect } = useDisconnect();
  const { publicKey, disconnect } = useWallet();
  const { setVisible, visible } = useWalletModal();
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const [activeChain, setActiveChain] = useState<Chain | null>(null);

  const solanaBalance = useSolanaBalance();

  // Connect Solana Wallet
  const connectSolana = async () => {
    setIsModalOpen(false);
    try {
      if (selectedChain == "evm") {
        if (activeAccount) evmDisconnect(activeAccount);
      }
      setVisible(true);
      setSelectedChain("solana")
    } catch (error) {
      console.error("Solana connection error:", error);
    }
  };
  // Connect Ethereum Wallet
  const connectEthereum = useCallback(async () => {
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
  }, [chain]);

  //  Disconnect Wallet
  const disconnectWallet = async () => {
    setWalletAddress(null);
    setSelectedChain(null);
    disconnect();
    if (activeAccount) evmDisconnect(activeAccount);
    setIsModalOpen(false);
  };

  const EOAaccount = useActiveAccount();
  const userAddress = EOAaccount?.address;
  const { data } = useWalletBalance({
    chain: chain,
    address: userAddress,
    client,
  });

  const evmBalance = {
    value: data?.value || 0n,
    formatted: data?.displayValue || "0"
  }

  useEffect(() => {
    if (!account && !publicKey) {
      disconnectWallet();
      setIsModalOpen(true);
    } else if (publicKey) {
      setWalletAddress(publicKey.toBase58());
      setIsModalOpen(false);
    } else if (account) {
      setWalletAddress(account.address);
      setIsModalOpen(false);
    }
  }, [account, publicKey]);

  useEffect(() => {
    if (selectedChain == "solana") {
      setActiveChain(chainConfigs[CHAIN_ID.solana]);
      return
    } else if (chain) setActiveChain(chain);
    else setActiveChain(null);
  }, [selectedChain, chain]);


  return (
    <MultiChainContext.Provider
      value={{
        selectedChain,
        activeChain,
        walletAddress,
        balance: selectedChain == "solana" ? solanaBalance : evmBalance,
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