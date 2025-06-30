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
  useMemo,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { CHAIN_ID, chainConfigs } from "@/constants/chainConfig";

import useSolanaBalance from "@/hooks/useSolanaBalance";
import { Balance } from "@/types/types";
import { Chain, formatEther, WalletClient } from "viem";
import { getPublicClient, getWalletClient } from "@/utils/getPublicClient";
import { usePathname, useRouter } from "next/navigation";
import { PREVIOUS_ADDRESS } from "@/hooks/hooks";
import { useConnect } from "wagmi";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { zetachain } from "viem/chains";
import { useFundWalletStore } from "@/store/fundWalletStore";

// Constants for localStorage
const WALLET_STATE_KEY = "amana-wallet-state";
const DEBUG_WALLET = true; // Set to false in production

// Helper function for debug logging
const debugLog = (message: string, data?: any) => {
  if (DEBUG_WALLET) {
    console.log(`[MultiChainProvider Debug] ${message}`, data || "");
  }
};

// Helper functions for state persistence
const saveWalletState = (
  selectedChain: ChainType | null,
  walletAddress: string | null,
) => {
  if (typeof window !== "undefined") {
    const state = { selectedChain, walletAddress, timestamp: Date.now() };
    localStorage.setItem(WALLET_STATE_KEY, JSON.stringify(state));
    debugLog("Saved wallet state:", state);
  }
};

const loadWalletState = (): {
  selectedChain: ChainType | null;
  walletAddress: string | null;
} => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(WALLET_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        debugLog("Loaded wallet state:", parsed);
        return {
          selectedChain: parsed.selectedChain,
          walletAddress: parsed.walletAddress,
        };
      }
    } catch (error) {
      debugLog("Error loading wallet state:", error);
    }
  }
  debugLog("No saved wallet state found or SSR");
  return { selectedChain: null, walletAddress: null };
};

const clearWalletState = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(WALLET_STATE_KEY);
    debugLog("Cleared wallet state");
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
  disconnectWallet: () => void;
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
  switchToChain: (chain: Chain) => Promise<void>;
  refetchBalance: (address: string) => Promise<Balance | undefined>;
  isHydrated: boolean;
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
  // HYDRATION FIX: Start with consistent state for SSR
  const [isHydrated, setIsHydrated] = useState(false);

  const [selectedChain, setSelectedChain] = useState<ChainType | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { logout } = usePrivy();
  const { publicKey, disconnect, connected } = useWallet();
  const [balance, setBalance] = useState({ value: 0n, formatted: "0" });
  const { connectors } = useConnect();
  const { step } = useFundWalletStore();

  const router = useRouter();
  const path = usePathname();

  const { wallets } = useWallets();
  const { user } = usePrivy();
  const privyWallet = wallets[0];
  const [activeChain, setActiveChain] = useState<Chain>(
    chainConfigs[Number(privyWallet?.chainId?.split(":")[1] ?? 7000)],
  );
  const [isInitialized, setIsInitialized] = useState(false);

  debugLog("Provider initialized with hydration-safe state:", {
    selectedChain,
    walletAddress,
    isHydrated,
  });
  const { setVisible, visible } = useWalletModal();

  const { balance: solanaBalance, refetch: refetchSolBalance } =
    useSolanaBalance();

  const latestChainRef = useRef<string | null>(null);

  const disconnectConnectors = useCallback(async () => {
    if (!!wallets?.length) {
      wallets.forEach(async (wallet) => {
        await connectors?.find((con) => con.id === wallet.meta.id)?.disconnect();
      });
    }
  }, [connectors, wallets]);

  const evmDisconnect = useCallback(async () => {
    await disconnectConnectors();
    await logout();
  }, [logout, disconnectConnectors]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // HYDRATION FIX: Load saved state only after hydration
  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     setIsHydrated(true);
  //     const savedState = loadWalletState();

  //     if (savedState.selectedChain || savedState.walletAddress) {
  //       debugLog("Hydration complete - loading saved state:", savedState);
  //       setSelectedChain(savedState.selectedChain);
  //       console.log('set wallet from setIsHydrated(true);')
  //       setWalletAddress(savedState.walletAddress);
  //     } else {
  //       debugLog("Hydration complete - no saved state found");
  //     }
  //   }
  // }, []);

  // Persist state changes (only after hydration)
  useEffect(() => {
    if (isInitialized && isHydrated) {
      saveWalletState(selectedChain, walletAddress);
    }
  }, [selectedChain, walletAddress, isInitialized, isHydrated]);

  // Log wallet provider states
  useEffect(() => {
    if (isHydrated) {
      debugLog("Wallet provider states changed:", {
        account: privyWallet?.address,
        publicKey: publicKey?.toBase58(),
        selectedChain,
        walletAddress,
        isInitialized,
        isHydrated,
      });
    }
  }, [
    privyWallet,
    publicKey,
    selectedChain,
    walletAddress,
    isInitialized,
    isHydrated,
  ]);

  useEffect(() => {
    if (selectedChain == "solana") {
      setActiveChain(chainConfigs[CHAIN_ID.solana]);
      latestChainRef.current = CHAIN_ID.solana.toString();
      return;
    } else if (privyWallet?.chainId) {
      setActiveChain(
        chainConfigs[Number(privyWallet?.chainId?.split(":")[1] ?? 7000)],
      );
      latestChainRef.current = privyWallet?.chainId?.split(":")[1];
    } else {
      setActiveChain(zetachain);
      latestChainRef.current = null;
    }
  }, [selectedChain, privyWallet?.chainId]);

  // Connect Solana Wallet
  const connectSolana = async () => {
    debugLog("Connecting Solana wallet...");
    setIsModalOpen(false);
    try {
      if (selectedChain == "evm") {
        debugLog("Disconnecting EVM wallet before Solana connection");
        await evmDisconnect();
      }
      setVisible(true);
      setSelectedChain("solana");
      debugLog("Solana connection initiated");
    } catch (error) {
      debugLog("Solana connection error:", error);
      console.error("Solana connection error:", error);
    }
  };

  useEffect(() => {
    if (privyWallet?.address) {
      if (!step) {
        setWalletAddress(privyWallet?.address);
        setSelectedChain("evm");

        if (wallets.length > 1 && user?.wallet) {
          disconnectConnectors();
        }
      }

      if (connected) {
        disconnect().catch((err) => {
          console.error("error disconnect Solana:", err);
        });
      }
    } else if (!privyWallet?.address && !connected) {
      setWalletAddress(null);
    }
  }, [
    privyWallet,
    connected,
    disconnect,
    user,
    step,
    disconnectConnectors,
    wallets,
  ]);

  //  Disconnect Wallet
  const disconnectWallet = useCallback(async () => {
    debugLog("Disconnecting all wallets...");
    setWalletAddress(null);
    localStorage.setItem(PREVIOUS_ADDRESS, "");
    localStorage.removeItem("connectorId");
    setSelectedChain(null);
    disconnect();
    await evmDisconnect();
    setIsModalOpen(false);
    clearWalletState();
    debugLog("All wallets disconnected");
    const isVaultAddressPath = /^\/vaults\/0x[0-9a-fA-F]{40}$/;

    if (
      path !== "/" &&
      path !== "/leaderboard" &&
      path !== "/about" &&
      !isVaultAddressPath.test(path)
    ) {
      router.push("/");
    }
  }, [disconnect, evmDisconnect, router, path]);

  const getEvmBalance = useCallback(
    async (walletAddress: string) => {
      if (!privyWallet?.chainId || !walletAddress) return;

      const publicClient = await getPublicClient(privyWallet);
      if (!publicClient) return;

      try {
        const balanceInEth = await publicClient.getBalance({
          address: walletAddress,
        });

        const formattedBalance = formatEther(balanceInEth);

        if (!step) {
          setBalance({ formatted: formattedBalance, value: balanceInEth });
        }
        return { formatted: formattedBalance, value: balanceInEth };
      } catch (error) {
        console.error("Error get balance:", error);
      }
    },
    [privyWallet, setBalance, step],
  );

  // IMPROVED: Better connection detection logic with initialization delay
  useEffect(() => {
    // Wait for hydration before starting initialization
    if (!isHydrated) return;

    // Add initialization delay to allow wallets to load
    const initTimer = setTimeout(() => {
      setIsInitialized(true);
      debugLog("Provider initialization complete after hydration");

      // Now check wallet connections
      const checkTimer = setTimeout(() => {
        debugLog("Checking wallet connections after initialization:", {
          account: !!privyWallet?.address,
          publicKey: !!publicKey,
          savedChain: selectedChain,
          hasAnyConnection: !!(privyWallet?.address || publicKey),
        });

        if (!privyWallet?.address && !publicKey) {
          // No active connections detected
          if (selectedChain) {
            debugLog(
              "No active connections but saved state exists - showing modal",
            );
            setIsModalOpen(true);
          } else {
            debugLog("No active connections and no saved state - clean slate");
          }
        } else if (publicKey) {
          debugLog("Solana wallet connected:", publicKey.toBase58());
          setWalletAddress(publicKey.toBase58());
          setSelectedChain("solana");
          setIsModalOpen(false);
        } else if (privyWallet?.address) {
          if (!step) {
            debugLog("EVM wallet connected:", privyWallet?.address);
            setWalletAddress(privyWallet?.address);
            // getEvmBalance(activeAccount.address);
            setSelectedChain("evm");
            setIsModalOpen(false);
          }
        }
      }, 500); // Additional delay for wallet connection detection

      return () => clearTimeout(checkTimer);
    }, 1000); // Initial delay for provider setup

    return () => clearTimeout(initTimer);
  }, [
    privyWallet,
    publicKey,
    disconnectWallet,
    getEvmBalance,
    isHydrated,
    selectedChain,
    user,
    step,
  ]);

  // Enhanced storage event handling for cross-tab synchronization
  useEffect(() => {
    // Only add listeners after hydration
    if (!isHydrated) return;

    const handleStorageChange = (e: StorageEvent) => {
      debugLog("Storage event detected:", {
        key: e.key,
        newValue: e.newValue,
        oldValue: e.oldValue,
      });

      if (e.key === WALLET_STATE_KEY) {
        if (e.newValue === null) {
          // Wallet was disconnected in another tab
          debugLog("Wallet disconnected in another tab");
          setSelectedChain(null);
          setWalletAddress(null);
          localStorage.setItem(PREVIOUS_ADDRESS, "");
          setIsModalOpen(true);
        } else if (e.newValue !== e.oldValue) {
          // Wallet state changed in another tab
          try {
            if (!step) {
              const newState = JSON.parse(e.newValue);
              debugLog("Wallet state changed in another tab:", newState);
              setSelectedChain(newState.selectedChain);
              setWalletAddress(newState.walletAddress);
              if (newState.selectedChain && newState.walletAddress) {
                setIsModalOpen(false);
              }
            }
          } catch (error) {
            debugLog("Error parsing storage event data:", error);
          }
        }
      }
    };

    const handleBeforeUnload = () => {
      debugLog("Page unloading - preserving wallet state");
      // State is already saved by the useEffect above
    };

    window?.addEventListener("storage", handleStorageChange);
    window?.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window?.removeEventListener("storage", handleStorageChange);
      window?.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isHydrated, step]);

  // Recovery mechanism for wallet reconnection
  useEffect(() => {
    if (!isInitialized || !isHydrated) return;

    // Recovery logic for saved state without active connections
    const recoveryTimer = setTimeout(() => {
      if (selectedChain && !privyWallet?.chainId && !publicKey) {
        debugLog("Attempting wallet recovery for:", selectedChain);

        if (selectedChain === "solana") {
          // Solana should auto-connect due to autoConnect={true}
          debugLog("Waiting for Solana auto-connection...");
        } else if (selectedChain === "evm") {
          // EVM wallets should auto-connect via ThirdWeb AutoConnect component
          debugLog("Waiting for EVM auto-connection...");
        }
      }
    }, 2000); // Wait 2 seconds after initialization for auto-connect

    return () => clearTimeout(recoveryTimer);
  }, [
    isInitialized,
    selectedChain,
    privyWallet?.chainId,
    publicKey,
    isHydrated,
  ]);

  const switchToChain = useCallback(
    async (chain: Chain) => {
      try {
        if (chain.id === CHAIN_ID.solana) {
          setSelectedChain("solana");
          setActiveChain(chainConfigs[CHAIN_ID.solana]);
          latestChainRef.current = CHAIN_ID.solana.toString();
          return Promise.resolve(); // Resolve immediately for Solana
        } else {
          // For EVM chains, we need to request the wallet to switch chains
          if (privyWallet?.walletClientType !== "privy") {
            try {
              // This will prompt the user's wallet to switch chains
              privyWallet?.switchChain(chain.id);

              // Set the chain type first
              setSelectedChain("evm");

              // Then update the active chain
              setActiveChain(chain);

              // Update our ref immediately (won't be affected by closures)
              latestChainRef.current = chain.id.toString();

              // Return a promise that resolves when the chain is actually switched
              return new Promise<void>((resolve, reject) => {
                // Keep track of our own checking
                let checkAttempts = 0;
                const maxAttempts = 100; // 10 seconds at 100ms intervals

                const checkChain = setInterval(() => {
                  checkAttempts++;
                  if (latestChainRef.current === chain.id.toString()) {
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
        console.log("Error in switchToChain:", error);
        throw error;
      }
    },
    [privyWallet],
  );

  useEffect(() => {
    if (privyWallet?.chainId && privyWallet?.address) {
      getEvmBalance(privyWallet?.address);
    }
  }, [privyWallet?.chainId, privyWallet?.address, getEvmBalance]);

  return (
    <MultiChainContext.Provider
      value={{
        selectedChain,
        activeChain: activeChain,
        walletAddress,
        balance: selectedChain == "solana" ? solanaBalance : balance,
        connectSolana,
        disconnectWallet,
        isModalOpen,
        setIsModalOpen,
        switchToChain,
        refetchBalance: getEvmBalance,
        isHydrated,
      }}
    >
      {children}
    </MultiChainContext.Provider>
  );
};
