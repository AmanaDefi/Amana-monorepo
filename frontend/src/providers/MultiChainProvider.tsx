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
import {
  CHAIN_ID,
  chainConfigs,
  SUPPORTED_CHAINS,
} from "@/constants/chainConfig";
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
import { format } from "@/utils/utils";
import { EMPTY_BALANCE } from "@/utils/helpers";

// Constants for localStorage
const WALLET_STATE_KEY = 'amana-wallet-state';
const DEBUG_WALLET = false; // Set to false in production

// Helper function for debug logging
const debugLog = (message: string, data?: any) => {
  if (DEBUG_WALLET) {
    console.log(`[MultiChainProvider Debug] ${message}`, data || '');
  }
};

// Helper functions for state persistence
const saveWalletState = (selectedChain: ChainType | null, walletAddress: string | null) => {
  if (typeof window !== 'undefined') {
    const state = { selectedChain, walletAddress, timestamp: Date.now() };
    localStorage.setItem(WALLET_STATE_KEY, JSON.stringify(state));
  }
};

const loadWalletState = (): { selectedChain: ChainType | null; walletAddress: string | null } => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(WALLET_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        
        return { selectedChain: parsed.selectedChain, walletAddress: parsed.walletAddress };
      }
    } catch (error) {
     
    }
  }

  return { selectedChain: null, walletAddress: null };
};

const clearWalletState = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(WALLET_STATE_KEY);
 
  }
};

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
  switchToChain: (chain: Chain) => Promise<void>;
  refetchBalance: () => void;
  isHydrated: boolean;
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
  // HYDRATION FIX: Start with consistent state for SSR
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedChain, setSelectedChain] = useState<ChainType | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  


  const { connect, isConnecting } = useConnectModal();
  const activeAccount = useActiveWallet();
  const { disconnect: evmDisconnect } = useDisconnect();
  const { publicKey, disconnect } = useWallet();
  const { setVisible, visible } = useWalletModal();
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const [activeChain, setActiveChain] = useState<Chain | null>(null);

  const { balance: solanaBalance, refetch: refetchSolBalance } =
    useSolanaBalance();

  const latestChainRef = useRef<number | null>(null);

  // HYDRATION FIX: Load saved state only after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsHydrated(true);
      const savedState = loadWalletState();
      
      if (savedState.selectedChain || savedState.walletAddress) {
      
        setSelectedChain(savedState.selectedChain);
        setWalletAddress(savedState.walletAddress);
      } else {
       
      }
    }
  }, []);

  // Persist state changes (only after hydration)
  useEffect(() => {
    if (isInitialized && isHydrated) {
      saveWalletState(selectedChain, walletAddress);
    }
  }, [selectedChain, walletAddress, isInitialized, isHydrated]);

  // Log wallet provider states
  useEffect(() => {
    if (isHydrated) {
     
    }
  }, [account, publicKey, selectedChain, walletAddress, isInitialized, isHydrated]);

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
  const connectSolana = async () => {
   
    setIsModalOpen(false);
    try {
      if (selectedChain == "evm") {
       
        if (activeAccount) evmDisconnect(activeAccount);
      }
      setVisible(true);
      setSelectedChain("solana");
     
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
    clearWalletState();
  };

  const EOAaccount = useActiveAccount();
  const userAddress = EOAaccount?.address;
  const { data, refetch: refetchEthBalance } = useWalletBalance({
    chain: chain,
    address: userAddress,
    client,
  });

  const evmBalance: Balance = data
    ? {
        value: data.value || 0n,
        formatted: format(data.value, data.decimals),
      }
    : EMPTY_BALANCE;

  const refetchBalance = () => {
    refetchSolBalance();
    refetchEthBalance();
  };

  // IMPROVED: Better connection detection logic with initialization delay
  useEffect(() => {
    // Wait for hydration before starting initialization
    if (!isHydrated) return;
    
    // Add initialization delay to allow wallets to load
    const initTimer = setTimeout(() => {
      setIsInitialized(true);
     
      
      // Now check wallet connections
      const checkTimer = setTimeout(() => {
       

        if (!account && !publicKey) {
          // No active connections detected
          if (selectedChain) {
           
            setIsModalOpen(true);
          } else {
           
          }
        } else if (publicKey) {
         
          setWalletAddress(publicKey.toBase58());
          setSelectedChain("solana");
          setIsModalOpen(false);
        } else if (account) {
         
          setWalletAddress(account.address);
          setSelectedChain("evm");
          setIsModalOpen(false);
        }
      }, 500); // Additional delay for wallet connection detection

      return () => clearTimeout(checkTimer);
    }, 1000); // Initial delay for provider setup

    return () => clearTimeout(initTimer);
  }, [account, publicKey, isHydrated, selectedChain]); // Add isHydrated to dependencies

  // Enhanced storage event handling for cross-tab synchronization
  useEffect(() => {
    // Only add listeners after hydration
    if (!isHydrated) return;
    
    const handleStorageChange = (e: StorageEvent) => {
     
      
      if (e.key === WALLET_STATE_KEY) {
        if (e.newValue === null) {
          // Wallet was disconnected in another tab
         
          setSelectedChain(null);
          setWalletAddress(null);
          setIsModalOpen(true);
        } else if (e.newValue !== e.oldValue) {
          // Wallet state changed in another tab
          try {
            const newState = JSON.parse(e.newValue);
           
            setSelectedChain(newState.selectedChain);
            setWalletAddress(newState.walletAddress);
            if (newState.selectedChain && newState.walletAddress) {
              setIsModalOpen(false);
            }
          } catch (error) {
            debugLog('Error parsing storage event data:', error);
          }
        }
      }
    };

    const handleBeforeUnload = () => {
      debugLog('Page unloading - preserving wallet state');
      // State is already saved by the useEffect above
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isHydrated]);

  // Recovery mechanism for wallet reconnection
  useEffect(() => {
    if (!isInitialized || !isHydrated) return;

    // Recovery logic for saved state without active connections
    const recoveryTimer = setTimeout(() => {
      if (selectedChain && !account && !publicKey) {
        
        if (selectedChain === "solana") {
          // Solana should auto-connect due to autoConnect={true}
          debugLog('Waiting for Solana auto-connection...');
        } else if (selectedChain === "evm") {
          // EVM wallets should auto-connect via ThirdWeb AutoConnect component
          debugLog('Waiting for EVM auto-connection...');
        }
      }
    }, 2000); // Wait 2 seconds after initialization for auto-connect

    return () => clearTimeout(recoveryTimer);
  }, [isInitialized, selectedChain, account, publicKey, isHydrated]);

  const switchToChain = async (chain: Chain) => {

    try {
      if (chain.id === CHAIN_ID.solana) {
        setSelectedChain("solana");
        setActiveChain(chainConfigs[CHAIN_ID.solana]);
        latestChainRef.current = CHAIN_ID.solana;
        return Promise.resolve(); // Resolve immediately for Solana
      } else {
        // For EVM chains, we need to request the wallet to switch chains
        const wallet = activeAccount;
        if (wallet) {
          try {
            // This will prompt the user's wallet to switch chains
            await wallet.switchChain(chain);

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
                console.log(
                  `Checking chain switch: Wallet chain is ${chain?.id}, our ref is ${latestChainRef.current}`
                );

                // Check BOTH the ref (our tracked value) and the thirdweb chain value
                if (latestChainRef.current === chain.id) {
                  console.log(
                    `Chain switch successful: Now on chain ${chain.id}`
                  );
                  clearInterval(checkChain);
                  resolve();
                } else if (checkAttempts >= maxAttempts) {
                  console.error(
                    `Chain switch timeout: Current ref shows chain ${latestChainRef.current}`
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
  };

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
        switchToChain,
        refetchBalance,
        isHydrated,
      }}
    >
      {children}
    </MultiChainContext.Provider>
  );
};
