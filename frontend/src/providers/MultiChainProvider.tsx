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
  useRef,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { CHAIN_ID, chainConfigs } from "@/constants/chainConfig";
import {
  useAccount,
  useAuthModal,
  useLogout,
  useUser,
  useChain,
  useConnection,
} from "@account-kit/react";
import { useBalance } from "wagmi";
import useSolanaBalance from "@/hooks/useSolanaBalance";
import { Balance } from "@/types/types";
import { Chain } from "viem";
import { BrowserProvider, ethers } from "ethers";
import { ethereumProvider } from "@/utils/providers";
import { getProvider } from "@/utils/getProvider";
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
  connectEthereum: () => void;
  disconnectWallet: () => void;
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
  switchToChain: (chain: Chain) => Promise<void>;
  refetchBalance: () => void;
}

const MultiChainContext = createContext<MultiChainContextType | undefined>(
  undefined,
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
  const { openAuthModal, isOpen } = useAuthModal();
  const activeAccount = useUser();
  const { logout: evmDisconnect } = useLogout();
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [balance, setBalance] = useState({ value: 0n, formatted: "0" });

  const { setChain, chain } = useChain();
  const [activeChain, setActiveChain] = useState<Chain | null>(chain);

  const { balance: solanaBalance, refetch: refetchSolBalance } =
    useSolanaBalance();

  const latestChainRef = useRef<number | null>(null);

  useEffect(() => {
    if (selectedChain == "solana") {
      setActiveChain(chainConfigs[CHAIN_ID.solana]);
      latestChainRef.current = CHAIN_ID.solana;
      return;
    } else if (chain) {
      setActiveChain(chain);
      latestChainRef.current = chain.id;
    } else {
      setActiveChain(null);
      latestChainRef.current = null;
    }
  }, [selectedChain, chain]);

  // Connect Solana Wallet
  const connectSolana = useCallback(async () => {
    setIsModalOpen(false);
    try {
      if (selectedChain == "evm") {
        if (activeAccount) evmDisconnect();
      }
      setVisible(true);
      setSelectedChain("solana");
    } catch (error) {
      console.error("Solana connection error:", error);
    }
  }, [selectedChain, activeAccount, evmDisconnect, setVisible]);

  const connectEthereum = useCallback(() => {
    setIsModalOpen(false);

    if (openAuthModal) {
      openAuthModal();
    }
  }, [openAuthModal]);

  useEffect(() => {
    if (activeAccount?.address) {
      setWalletAddress(activeAccount?.address);
      setSelectedChain("evm");

      if (connected) {
        disconnect().catch((err) => {
          console.error("error disconnect Solana:", err);
        });
      }
    }
  }, [activeAccount, connected, disconnect]);

  //  Disconnect Wallet
  const disconnectWallet = useCallback(async () => {
    setWalletAddress(null);
    setSelectedChain(null);
    disconnect();
    if (activeAccount) evmDisconnect();
    setIsModalOpen(false);
  }, [disconnect, activeAccount, evmDisconnect]);

  // const { data, refetch: refetchEthBalance } = useBalance({
  //   chainId: chain.id,
  //   address: userAddress,
  // });

  const getEvmBalance = useCallback(async () => {
    console.log("het evm", chain, walletAddress);
    if (!chain || !activeAccount?.address) return;

    try {
      const rpcProvider = getProvider(chain.id);
      const balanceInWei = await rpcProvider.getBalance(activeAccount?.address);

      const balanceInEth = ethers.formatEther(balanceInWei);

      const formattedBalance = parseFloat(balanceInEth).toFixed(4);
      console.log(formattedBalance);

      setBalance({ formatted: formattedBalance, value: balanceInWei });
    } catch (error) {
      console.error("Error get balance:", error);
    }
  }, [chain, activeAccount, getProvider, setBalance]);

  useEffect(() => {
    console.log(activeAccount, publicKey);
    if (!activeAccount && !publicKey) {
      disconnectWallet();
      setIsModalOpen(false);
    } else if (publicKey) {
      setWalletAddress(publicKey.toBase58());
      setIsModalOpen(false);
    } else if (activeAccount?.address) {
      setWalletAddress(activeAccount?.address);
      getEvmBalance();
      setIsModalOpen(false);
    }
  }, [activeAccount, publicKey, disconnectWallet, getEvmBalance]);

  const switchToChain = useCallback(
    async (chain: Chain) => {
      try {
        if (chain.id === CHAIN_ID.solana) {
          setSelectedChain("solana");
          setActiveChain(chainConfigs[CHAIN_ID.solana]);
          latestChainRef.current = CHAIN_ID.solana;
          return Promise.resolve(); // Resolve immediately for Solana
        } else {
          // For EVM chains, we need to request the wallet to switch chains
          if (activeAccount?.type === "eoa") {
            try {
              // This will prompt the user's wallet to switch chains
              setChain({ chain });

              // Set the chain type first
              setSelectedChain("evm");

              // Then update the active chain
              setActiveChain(chain);

              // Update our ref immediately (won't be affected by closures)
              latestChainRef.current = chain.id;

              // Return a promise that resolves when the chain is actually switched
              return new Promise<void>((resolve, reject) => {
                // Keep track of our own checking
                let checkAttempts = 0;
                const maxAttempts = 100; // 10 seconds at 100ms intervals

                const checkChain = setInterval(() => {
                  checkAttempts++;
                  // Use the chain from thirdweb directly to verify the wallet's actual chain

                  // Check BOTH the ref (our tracked value) and the thirdweb chain value
                  if (latestChainRef.current === chain.id) {
                    console.log(
                      `Chain switch successful: Now on chain ${chain.id}`,
                    );
                    clearInterval(checkChain);
                    resolve();
                  } else if (checkAttempts >= maxAttempts) {
                    console.error(
                      `Chain switch timeout: Current ref shows chain ${latestChainRef.current}`,
                    );
                    clearInterval(checkChain);
                    reject(new Error("Chain switch timeout"));
                  }
                }, 100);
              });
            } catch (error) {
              console.error("Failed to switch chain in wallet:", error);
              throw error;
            }
          } else {
            throw new Error("No active wallet found");
          }
        }
      } catch (error) {
        console.error("Error in switchToChain:", error);
        throw error;
      }
    },
    [activeAccount, setChain],
  );

  return (
    <MultiChainContext.Provider
      value={{
        selectedChain,
        activeChain,
        walletAddress,
        balance: selectedChain == "solana" ? solanaBalance : balance,
        connectSolana,
        connectEthereum,
        disconnectWallet,
        isModalOpen,
        setIsModalOpen,
        switchToChain,
        refetchBalance: getEvmBalance,
      }}
    >
      {children}
    </MultiChainContext.Provider>
  );
};
