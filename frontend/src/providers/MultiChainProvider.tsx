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
import { CHAIN_ID, chainConfigs, solanaChain } from "@/constants/chainConfig";

import useSolanaBalance from "@/hooks/useSolanaBalance";
import { Balance } from "@/types/types";
import { Chain, formatEther } from "viem";
import { getPublicClient } from "@/utils/getPublicClient";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { ConnectedWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { zetachain } from "viem/chains";
import { useFundWalletStore } from "@/store/fundWalletStore";
import { useAuthStore } from "@/store/authStore";
import { useChainTokenModalStore } from "@/store/chainTokenModalStore";
import { useInitializationStore } from "@/store/initializationStore";
import { VAULTS_INFO_KEY } from "@/utils/localStorageUtils";

// Constants for localStorage
const WALLET_STATE_KEY = "amana-wallet-state";
const PERSISTED_WALLET_KEY = "amana-persisted-wallet"; // NEW
const PERSISTED_CHAIN_KEY = "amana-persisted-chain"; // NEW
const DEBUG_WALLET = false; // Set to false in production

// Helper function for debug logging
const debugLog = (message: string, data?: any) => {
  if (DEBUG_WALLET) {
    console.log(`[MultiChainProvider Debug] ${message}`, data || "");
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
  disconnectWallet: () => Promise<void>;
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
  switchToChain: (chain: Chain) => Promise<void>;
  refetchBalance: (address: string) => Promise<Balance | undefined>;
  evmDisconnect: () => Promise<void>;
  activeEvmWallet: ConnectedWallet;
  isWalletSwitching: boolean;
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
  const [persistedWalletAddress, setPersistedWalletAddress] = useState<
    string | null
  >(null); // NEW
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { logout } = usePrivy();
  const { publicKey, disconnect, connected } = useWallet();
  const [balance, setBalance] = useState({ value: 0n, formatted: "0" });
  const { connectors } = useConnect();
  const [isWalletSwitching, setIsWalletSwitching] = useState(false);
  const { disconnectAsync } = useDisconnect();

  const {
    step,
    setWalletAddress: setFundWalletAddress,
    setStep,
  } = useFundWalletStore();
  const {
    successAuth,
    userAddress: authUserAddress,
    isAuthenticated,
  } = useAuthStore();
  const isConnectedRef = useRef(connected);
  const { isConnected } = useAccount();

  const router = useRouter();
  const path = usePathname();
  const {
    setSelectedChainFromModal,
    selectedChainFromModal,
    setSelectedTokenFromModal,
  } = useChainTokenModalStore();

  const {
    isHydrated,
    isInitializationComplete,
    setIsHydrated,
    setIsInitializationComplete,
    setIsWalletConnecting,
    completeInitialization,
    startInitialization,
    resetInitialization,
  } = useInitializationStore();

  const { wallets } = useWallets();
  const filteredWallets = useMemo(() => {
    return wallets.filter((wallet) => {
      const isDisconnected = localStorage.getItem(
        `wagmi.${wallet.meta.id}.disconnected`,
      );
      console.log("[DEBUG] Filtering wallet:", {
        walletId: wallet.meta.id,
        walletClientType: wallet.walletClientType,
        isDisconnected,
        timestamp: new Date().toISOString(),
      });

      if (isDisconnected === "true" && wallet.walletClientType !== "privy") {
        return false;
      }

      return true;
    });
  }, [wallets]);
  const { user } = usePrivy();
  const privyWallet = filteredWallets[0];
  const [activeChain, setActiveChain] = useState<Chain | null>(null);

  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPathProcessedRef = useRef<string | null>(null);

  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();

  const setWalletAddressWithLog = useCallback(
    (address: string | null, source?: string) => {
      console.log(`WALLET CHANGE [${source || "unknown"}]:`, {
        from: walletAddress,
        to: address,
        path: path,
      });
      setWalletAddress(address);
    },
    [walletAddress, path],
  );

  // NEW: Persist wallet address when connected
  useEffect(() => {
    if (walletAddress && walletAddress !== persistedWalletAddress) {
      localStorage.setItem(PERSISTED_WALLET_KEY, walletAddress);
      setPersistedWalletAddress(walletAddress);
      console.log("[PERSISTENCE] Saved wallet address:", walletAddress);
    }
  }, [walletAddress, persistedWalletAddress]);

  // NEW: Restore wallet address on hydration
  useEffect(() => {
    if (isHydrated && !walletAddress && !step) {
      const saved = localStorage.getItem(PERSISTED_WALLET_KEY);
      if (saved) {
        console.log("[PERSISTENCE] Restoring wallet from localStorage:", saved);
        setWalletAddressWithLog(saved, "localStorage-restore");
        setSelectedChain("evm");

        // Restore active chain also
        const savedChain = localStorage.getItem(PERSISTED_CHAIN_KEY);
        if (savedChain && chainConfigs[Number(savedChain)]) {
          setActiveChain(chainConfigs[Number(savedChain)]);
        } else {
          // Default to zetachain if no saved chain
          setActiveChain(zetachain);
        }
      }
    }
  }, [isHydrated, walletAddress, step, setWalletAddressWithLog]);

  // NEW: Save active chain to localStorage
  useEffect(() => {
    if (activeChain?.id) {
      localStorage.setItem(PERSISTED_CHAIN_KEY, activeChain.id.toString());
    }
  }, [activeChain?.id]);

  useEffect(() => {
    console.log("[DEBUG] MultiChain state change:", {
      selectedChain,
      walletAddress,
      activeChainId: activeChain?.id,
      privyWalletAddress: privyWallet?.address,
      privyWalletType: privyWallet?.walletClientType,
      connectedSolana: connected,
      publicKeyExists: !!publicKey,
      step,
      isHydrated,
      isConnected,
      persistedWalletAddress, // NEW
      timestamp: new Date().toISOString(),
    });
  }, [
    selectedChain,
    walletAddress,
    activeChain?.id,
    privyWallet?.address,
    privyWallet?.walletClientType,
    connected,
    publicKey,
    step,
    isHydrated,
    isConnected,
    persistedWalletAddress, // NEW
  ]);

  debugLog("Provider initialized with hydration-safe state:", {
    selectedChain,
    walletAddress,
    isHydrated,
  });

  const { balance: solanaBalance, refetch: refetchSolBalance } =
    useSolanaBalance();

  const latestChainRef = useRef<string | null>(null);

  const disconnectConnectors = useCallback(async () => {
    console.log("[DEBUG] Disconnecting connectors:", {
      walletsLength: wallets?.length,
      connectorsLength: connectors?.length,
      timestamp: new Date().toISOString(),
    });

    if (!!wallets?.length) {
      wallets.forEach(async (wallet) => {
        try {
          console.log("[DEBUG] Processing wallet for disconnect:", {
            walletId: wallet.meta.id,
            connectorTypes: wallet.connectorType,
            timestamp: new Date().toISOString(),
          });

          const connector = connectors?.find(
            (con) =>
              con.id === wallet.meta.id ||
              con?.rdns?.includes(wallet.meta.id) ||
              (con.id === "walletConnect" &&
                wallet.connectorType.includes("wallet_connect")),
          );

          if (connector) {
            console.log("[DEBUG] Found matching connector, disconnecting:", {
              connectorId: connector.id,
              walletId: wallet.meta.id,
              timestamp: new Date().toISOString(),
            });
            await disconnectAsync({ connector });
            await connector.disconnect();
            wallet.disconnect();
          }
        } catch (e) {
          console.log("[DEBUG] Error disconnecting wallet:", {
            walletId: wallet.meta.id,
            error: e,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }
  }, [connectors, wallets]);

  const evmDisconnect = useCallback(async () => {
    console.log("[DEBUG] EVM disconnect initiated", {
      timestamp: new Date().toISOString(),
    });
    setIsWalletSwitching(true);

    try {
      // setWalletAddress(null);
      setWalletAddressWithLog(null, "evm-disconnect");
      setSelectedChain(null);
      setActiveChain(null);

      const { logout: authLogout } = useAuthStore.getState();
      authLogout();

      await disconnectConnectors();

      await logout();
    } catch (error) {
      console.error("[DEBUG] Error in EVM disconnect:", error);
    } finally {
      setTimeout(() => {
        console.log("[DEBUG] EVM disconnect completed", {
          timestamp: new Date().toISOString(),
        });
        setIsWalletSwitching(false);
      }, 800);
    }
  }, [logout, disconnectConnectors]);

  const completeInitializationProcess = useCallback(() => {
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    initializationTimeoutRef.current = setTimeout(() => {
      completeInitialization();
      debugLog("Initialization completed via store");
    }, 200);
  }, [completeInitialization]);

  useEffect(() => {
    setIsHydrated(true);
  }, [setIsHydrated]);

  // Connect Solana Wallet
  const connectSolana = async () => {
    console.log("[DEBUG] Connect Solana called:", {
      privyWalletExists: !!privyWallet?.address,
      privyWalletType: privyWallet?.walletClientType,
      step,
      timestamp: new Date().toISOString(),
    });

    try {
      if (
        privyWallet?.address &&
        privyWallet.walletClientType !== "privy" &&
        !step
      ) {
        debugLog("Disconnecting EVM wallet before Solana connection");
        await evmDisconnect();
        setSelectedChain("solana");
      }
    } catch (error) {
      console.error("[DEBUG] Solana connection error:", {
        error,
        timestamp: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    console.log("[DEBUG] Solana connection effect:", {
      connected,
      publicKeyExists: !!publicKey,
      isConnectedRefCurrent: isConnectedRef.current,
      step,
      timestamp: new Date().toISOString(),
    });

    if (connected && publicKey && !isConnectedRef.current) {
      console.log("[DEBUG] Processing Solana connection...");
      isConnectedRef.current = true;

      if (step === "connectWallet") {
        console.log("[DEBUG] Fund wallet step - setting address");
        setFundWalletAddress(publicKey.toBase58());
        return setStep("selectChain");
      }

      console.log("[DEBUG] Regular connection - setting wallet state");
      // setWalletAddress(publicKey.toBase58());
      setWalletAddressWithLog(publicKey.toBase58(), "solana-connect");
      setSelectedChain("solana");
      setActiveChain(chainConfigs[CHAIN_ID.solana]);

      return successAuth(null, undefined, true);
    } else if (!connected) {
      console.log("[DEBUG] Solana disconnected");
      isConnectedRef.current = false;
    }
  }, [
    connected,
    step,
    publicKey,
    setFundWalletAddress,
    setStep,
    setWalletAddress,
    setSelectedChain,
    setActiveChain,
    successAuth,
  ]);

  useEffect(() => {
    console.log("[DEBUG] Privy wallet effect:", {
      privyWalletAddress: privyWallet?.address,
      connected,
      latestChainRef: latestChainRef.current,
      step,
      walletsLength: wallets.length,
      userWallet: !!user?.wallet,
      persistedWalletAddress, // NEW
      timestamp: new Date().toISOString(),
    });

    if (privyWallet?.address && connected && !latestChainRef.current && !step) {
      console.log(
        "[DEBUG] Disconnecting Solana due to privy wallet connection",
      );
      disconnect();
      disconnectConnectors();
    }

    if (privyWallet?.address) {
      if (!step) {
        if (wallets.length > 1 && user?.wallet) {
          console.log(
            "[DEBUG] Multiple wallets detected, disconnecting connectors",
          );
          disconnectConnectors();
        }

        console.log("[DEBUG] Setting EVM wallet state");
        // setWalletAddress(privyWallet?.address);
        setWalletAddressWithLog(privyWallet?.address, "privy-connect");
        setSelectedChain("evm");

        if (
          privyWallet?.walletClientType === "privy" &&
          privyWallet?.chainId?.split(":")[1] !== zetachain.id.toString()
        ) {
          console.log("[DEBUG] Switching privy wallet to zetachain");
          privyWallet?.switchChain(zetachain.id);
        }

        if (
          privyWallet?.walletClientType === "privy" &&
          activeChain?.id !== zetachain.id
        ) {
          console.log("[DEBUG] Setting active chain to zetachain");
          setActiveChain(zetachain);
        }

        if (
          !activeChain &&
          privyWallet?.address &&
          privyWallet?.chainId &&
          !!chainConfigs[Number(privyWallet?.chainId?.split(":")[1])]
        ) {
          console.log("[DEBUG] Setting active chain from privy wallet chainId");
          setActiveChain(
            chainConfigs[Number(privyWallet?.chainId?.split(":")[1] ?? 1)],
          );
        }

        if (connected) {
          console.log("[DEBUG] Disconnecting Solana due to privy wallet");
          disconnect().catch((err) => {
            console.error("[DEBUG] Error disconnecting Solana:", err);
          });
          disconnectConnectors();
        }
      }
    } else if (
      !privyWallet?.address &&
      !connected &&
      !wagmiConnected &&
      !persistedWalletAddress
    ) {
      // MODIFIED: Only clear if no persisted address
      setWalletAddressWithLog(null, "privy-clear");
    }
  }, [
    privyWallet,
    connected,
    disconnect,
    user,
    step,
    disconnectConnectors,
    filteredWallets,
    activeChain,
    persistedWalletAddress, // NEW
  ]);

  useEffect(() => {
    console.log("[DEBUG] Chain ID sync effect:", {
      isHydrated,
      privyChainId: privyWallet?.chainId?.split(":")[1],
      activeChainId: activeChain?.id.toString(),
      privyWalletType: privyWallet?.walletClientType,
      chainConfigExists:
        !!chainConfigs[Number(privyWallet?.chainId?.split(":")[1])],
      timestamp: new Date().toISOString(),
    });

    if (
      isHydrated &&
      privyWallet?.chainId?.split(":")[1] !== activeChain?.id.toString() &&
      privyWallet?.walletClientType !== "privy" &&
      !!chainConfigs[Number(privyWallet?.chainId?.split(":")[1])]
    ) {
      console.log("[DEBUG] Syncing active chain with privy wallet");
      setActiveChain(chainConfigs[Number(privyWallet?.chainId?.split(":")[1])]);
    }
  }, [
    privyWallet?.chainId,
    activeChain?.id,
    privyWallet?.walletClientType,
    isHydrated,
  ]);

  useEffect(() => {
    if (!isHydrated) return;
    if (step) return;

    console.log("[DEBUG] Initialization check:", {
      publicKeyExists: !!publicKey,
      connected,
      privyWalletAddress: privyWallet?.address,
      persistedWalletAddress, // NEW
      timestamp: new Date().toISOString(),
    });

    const checkInitialization = () => {
      const hasStableConnection =
        (publicKey && connected) ||
        (privyWallet?.address && !connected) ||
        (wagmiConnected && wagmiAddress) ||
        persistedWalletAddress || // NEW: Include persisted address
        (!publicKey && !privyWallet?.address && !wagmiConnected);

      if (hasStableConnection) {
        completeInitializationProcess();
      }
    };

    const stabilizationTimer = setTimeout(checkInitialization, 300);

    return () => {
      clearTimeout(stabilizationTimer);
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [
    isHydrated,
    publicKey,
    connected,
    privyWallet?.address,
    wagmiConnected,
    wagmiAddress,
    step,
    completeInitializationProcess,
    persistedWalletAddress, // NEW
  ]);

  // Fallback timeout:
  useEffect(() => {
    if (!isHydrated) return;

    const maxWaitTimer = setTimeout(() => {
      if (!isInitializationComplete) {
        debugLog("Forcing initialization completion after max wait time");
        completeInitialization();
      }
    }, 3000);

    return () => clearTimeout(maxWaitTimer);
  }, [isHydrated, isInitializationComplete, completeInitialization]);

  //  Disconnect Wallet
  const disconnectWallet = useCallback(async () => {
    console.log("[DEBUG] DISCONNECT START");
    startInitialization();

    const hasTxInfo = localStorage.getItem(VAULTS_INFO_KEY);
    if (hasTxInfo) {
      localStorage.removeItem(VAULTS_INFO_KEY);
    }

    // NEW: Clear persisted data
    localStorage.removeItem(PERSISTED_WALLET_KEY);
    localStorage.removeItem(PERSISTED_CHAIN_KEY);
    setPersistedWalletAddress(null);

    try {
      const { logout: authLogout } = useAuthStore.getState();
      authLogout();

      if (privyWallet?.address) {
        await disconnectConnectors();
        await logout(); // Privy logout
      }

      if (connected) {
        disconnect(); // Solana disconnect
      }

      if (wagmiConnected) {
        await disconnectAsync(); // Wagmi disconnect
      }
    } catch (error) {
      console.log("[DEBUG] Error during disconnect:", error);
    }

    setSelectedChain(null);
    setActiveChain(null);
    // setWalletAddress(null);
    setWalletAddressWithLog(null, "full-disconnect");
    setIsModalOpen(false);

    setTimeout(() => {
      completeInitialization();
    }, 500);

    const isVaultAddressPath = /^\/vaults\/0x[0-9a-fA-F]{40}$/;
    if (
      path !== "/" &&
      path !== "/leaderboard" &&
      path !== "/about" &&
      !isVaultAddressPath.test(path)
    ) {
      router.push("/");
    }
  }, [
    disconnect,
    logout,
    disconnectConnectors,
    disconnectAsync,
    router,
    path,
    startInitialization,
    completeInitialization,
    privyWallet?.address,
    connected,
    wagmiConnected,
  ]);

  const getEvmBalance = useCallback(
    async (walletAddress: string) => {
      if (!privyWallet?.chainId || !walletAddress || !activeChain) return;

      const publicClient = getPublicClient(activeChain?.id);
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
        console.error("[DEBUG] Error getting balance:", {
          error,
          walletAddress,
          activeChainId: activeChain?.id,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [privyWallet, setBalance, step, activeChain],
  );
  // // IMPROVED: Better connection detection logic with initialization delay
  // useEffect(() => {
  //   // Wait for hydration before starting initialization
  //   if (!isHydrated) return;

  //   if (publicKey) {
  //     if (!step) {
  //       setWalletAddress(publicKey.toBase58());
  //       setSelectedChain("solana");
  //     } else {
  //       setFundWalletAddress(publicKey.toBase58());
  //     }
  //   } else if (
  //     privyWallet?.address &&
  //     privyWallet?.meta?.id !== "app.phantom"
  //   ) {
  //     if (!step) {
  //       debugLog("EVM wallet connected:", privyWallet?.address);
  //       setWalletAddress(privyWallet?.address);
  //       setSelectedChain("evm");
  //       setIsModalOpen(false);
  //     }
  //   }
  // }, [
  //   privyWallet,
  //   publicKey,
  //   isHydrated,
  //   step,
  //   setFundWalletAddress,
  // ]);

  const switchToChain = useCallback(
    async (chain: Chain) => {
      console.log("[DEBUG] Switch to chain called:", {
        chainId: chain.id,
        chainName: chain.name,
        currentActiveChainId: activeChain?.id,
        privyWalletType: privyWallet?.walletClientType,
        timestamp: new Date().toISOString(),
      });

      try {
        if (chain.id === CHAIN_ID.solana) {
          console.log("[DEBUG] Switching to Solana");
          setSelectedChain("solana");
          setActiveChain(chainConfigs[CHAIN_ID.solana]);
          latestChainRef.current = CHAIN_ID.solana.toString();
          return Promise.resolve();
        } else {
          console.log("[DEBUG] Switching to EVM chain:", chain.id);
          try {
            latestChainRef.current = chain.id.toString();

            if (privyWallet && privyWallet?.walletClientType !== "privy") {
              console.log("[DEBUG] Requesting wallet chain switch");
              privyWallet?.switchChain(chain.id);
            }

            setSelectedChain("evm");
            setActiveChain(chain);

            return new Promise<void>((resolve, reject) => {
              let checkAttempts = 0;
              const maxAttempts = 100;

              const checkChain = setInterval(() => {
                checkAttempts++;
                if (latestChainRef.current === chain.id.toString()) {
                  console.log("[DEBUG] Chain switch successful:", {
                    chainId: chain.id,
                    attempts: checkAttempts,
                    timestamp: new Date().toISOString(),
                  });
                  clearInterval(checkChain);
                  resolve();
                } else if (checkAttempts >= maxAttempts) {
                  console.error("[DEBUG] Chain switch timeout:", {
                    targetChainId: chain.id,
                    currentRef: latestChainRef.current,
                    attempts: checkAttempts,
                    timestamp: new Date().toISOString(),
                  });
                  clearInterval(checkChain);
                  reject(new Error("Chain switch timeout"));
                }
              }, 100);
            });
          } catch (error) {
            console.error("[DEBUG] Failed to switch chain in wallet:", {
              error,
              chainId: chain.id,
              timestamp: new Date().toISOString(),
            });
            throw error;
          }
        }
      } catch (error) {
        console.log("[DEBUG] Error in switchToChain:", {
          error,
          chainId: chain.id,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [privyWallet],
  );

  useEffect(() => {
    if (lastPathProcessedRef.current === path) {
      return;
    }

    // if (
    //   !isVaultAddressPath.test(path) &&
    //   privyWallet?.address &&
    //   privyWallet?.walletClientType !== "privy" &&
    //   activeChain?.id === CHAIN_ID["solana"]
    // ) {
    //   switchToChain(zetachain);
    //   latestChainRef.current = zetachain.id.toString();
    // }
    // if (
    //   !isVaultAddressPath.test(path) &&
    //   publicKey &&
    //   activeChain?.id !== CHAIN_ID["solana"]
    // ) {
    //   switchToChain(chainConfigs[CHAIN_ID.solana]);
    //   latestChainRef.current = CHAIN_ID["solana"].toString();
    // }

    console.log("[DEBUG] Path change effect:", {
      path,
      lastProcessed: lastPathProcessedRef.current,
      timestamp: new Date().toISOString(),
    });

    const timeoutId = setTimeout(() => {
      lastPathProcessedRef.current = path;

      const isVaultAddressPath = /^\/vaults\/0x[0-9a-fA-F]{40}$/;

      console.log("[DEBUG] Processing path logic:", {
        path,
        isVaultPath: isVaultAddressPath.test(path),
        selectedChainFromModal,
        privyWalletType: privyWallet?.walletClientType,
        activeChainId: activeChain?.id,
        publicKeyExists: !!publicKey,
        timestamp: new Date().toISOString(),
      });

      if (!isVaultAddressPath.test(path) && selectedChainFromModal) {
        console.log("[DEBUG] Clearing modal selections");
        setSelectedChainFromModal(null);
        setSelectedTokenFromModal(null);
      }

      // if (
      //   !isVaultAddressPath.test(path) &&
      //   privyWallet?.walletClientType === "privy" &&
      //   activeChain?.id !== zetachain.id
      // ) {
      //   console.log("[DEBUG] Setting zetachain for privy wallet");
      //   setActiveChain(zetachain);
      //   latestChainRef.current = zetachain.id.toString();
      // }

      // if (
      //   !isVaultAddressPath.test(path) &&
      //   privyWallet?.address &&
      //   privyWallet?.walletClientType !== "privy" &&
      //   activeChain?.id === CHAIN_ID["solana"] &&
      //   privyWallet?.meta?.id !== "app.phantom"
      // ) {
      //   console.log("[DEBUG] Switching non-privy wallet to zetachain");
      //   switchToChain(zetachain);
      //   latestChainRef.current = zetachain.id.toString();
      // }

      // if (
      //   !isVaultAddressPath.test(path) &&
      //   publicKey &&
      //   activeChain?.id !== CHAIN_ID["solana"]
      // ) {
      //   console.log("[DEBUG] Switching to Solana for public key");
      //   switchToChain(chainConfigs[CHAIN_ID.solana]);
      //   latestChainRef.current = CHAIN_ID["solana"].toString();
      // }

      if (privyWallet?.meta?.id === "app.phantom") {
        console.log("[DEBUG] Handling phantom wallet chain switch");
        switchToChain(
          chainConfigs[Number(privyWallet?.chainId?.split(":")[1] ?? 1)],
        );
      }

      setTimeout(() => {
        lastPathProcessedRef.current = null;
      }, 1000);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [
    path,
    selectedChainFromModal,
    // switchToChain,
    setSelectedChainFromModal,
    setSelectedTokenFromModal,
    // privyWallet?.walletClientType,
    // privyWallet?.address,
    privyWallet?.meta?.id,
    privyWallet?.chainId,
    // activeChain?.id,
    // publicKey?.toBase58(),
  ]);

  useEffect(() => {
    console.log("[DEBUG] EVM balance effect:", {
      privyChainId: privyWallet?.chainId,
      privyAddress: privyWallet?.address,
      privyMetaId: privyWallet?.meta?.id,
      timestamp: new Date().toISOString(),
    });

    if (
      privyWallet?.chainId &&
      privyWallet?.address &&
      activeChain?.id === Number(privyWallet?.chainId?.split(":")[1])
    ) {
      getEvmBalance(privyWallet?.address);
    }
  }, [
    privyWallet?.chainId,
    privyWallet?.address,
    activeChain?.id,
    getEvmBalance,
    privyWallet?.meta?.id,
  ]);

  useEffect(() => {
    console.log("[DEBUG] Wallet connecting state effect:", {
      connected,
      privyWalletAddress: privyWallet?.address,
      timestamp: new Date().toISOString(),
    });

    if (connected || privyWallet?.address) {
      setIsWalletConnecting(false);
    }
  }, [connected, privyWallet?.address, setIsWalletConnecting]);

  useEffect(() => {
    if (
      authUserAddress &&
      !walletAddress &&
      !publicKey &&
      !privyWallet?.address
    ) {
      console.log(
        "[SYNC] Syncing wallet address from authStore:",
        authUserAddress,
      );
      // setWalletAddress(authUserAddress);
      setWalletAddressWithLog(authUserAddress, "auth-sync");
      setSelectedChain("evm");

      if (!activeChain) {
        setActiveChain(zetachain);
      }
    }
  }, [
    authUserAddress,
    walletAddress,
    publicKey,
    privyWallet?.address,
    activeChain,
  ]);

  useEffect(() => {
    if (
      wagmiConnected &&
      wagmiAddress &&
      !walletAddress &&
      !publicKey &&
      !privyWallet?.address
    ) {
      // setWalletAddress(wagmiAddress);
      setWalletAddressWithLog(wagmiAddress, "wagmi-connect");
      setSelectedChain("evm");
    }
  }, [
    wagmiConnected,
    wagmiAddress,
    walletAddress,
    publicKey,
    privyWallet?.address,
  ]);

  const universalActiveEvmWallet = useMemo(() => {
    if (privyWallet?.address) {
      return privyWallet;
    }

    if (wagmiConnected && wagmiAddress) {
      return {
        address: wagmiAddress,
        walletClientType: "wagmi",
        chainId: `eip155:${activeChain?.id || 7000}`,
      } as ConnectedWallet;
    }

    return privyWallet;
  }, [privyWallet, wagmiConnected, wagmiAddress, activeChain?.id]);

  const debugWalletState = {
    walletAddress,
    selectedChain,
    solana: { connected, publicKey: publicKey?.toBase58() },
    privy: {
      address: privyWallet?.address,
      type: privyWallet?.walletClientType,
    },
    wagmi: { connected: wagmiConnected, address: wagmiAddress },
    path: path,
    persistedWalletAddress, // NEW
  };

  useEffect(() => {
    console.log("WALLET STATE:", debugWalletState);
  }, [walletAddress, selectedChain, path, persistedWalletAddress]); // NEW

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
        isWalletSwitching,
        refetchBalance: getEvmBalance,
        evmDisconnect: evmDisconnect,
        activeEvmWallet: universalActiveEvmWallet,
      }}
    >
      {children}
    </MultiChainContext.Provider>
  );
};
