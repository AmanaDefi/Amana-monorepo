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
const DEBUG_WALLET = false; // Set to false in production

// Mobile detection
const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.innerWidth < 768
  );
};

// Helper function for debug logging
const debugLog = (message: string, data?: any) => {
  const isMobile = isMobileDevice();
  if (DEBUG_WALLET || isMobile) {
    console.log(`[${isMobile ? "MOBILE" : "DESKTOP"}] ${message}`, data || "");
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

  const { isConnected: wagmiIsConnected, address: wagmiAddress } = useAccount();

  const stableConnectionRef = useRef({
    isConnected: false,
    lastUpdate: Date.now(),
  });

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
    debugLog("Filtering wallets", { walletsCount: wallets.length });

    return wallets.filter((wallet) => {
      try {
        const isDisconnected = localStorage.getItem(
          `wagmi.${wallet.meta.id}.disconnected`,
        );

        debugLog("Wallet filter check", {
          walletId: wallet.meta.id,
          walletClientType: wallet.walletClientType,
          isDisconnected,
        });

        if (isDisconnected === "true" && wallet.walletClientType !== "privy") {
          return false;
        }
        return true;
      } catch (error) {
        debugLog("Error filtering wallet", { error, walletId: wallet.meta.id });
        return true; 
      }
    });
  }, [wallets]);

  const { user } = usePrivy();
  const privyWallet = filteredWallets[0];
  const [activeChain, setActiveChain] = useState<Chain | null>(null);

  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPathProcessedRef = useRef<string | null>(null);

  const isStablyConnected = useMemo(() => {
    const hasConnection = !!(
      (publicKey && connected) ||
      (privyWallet?.address && privyWallet?.walletClientType) ||
      (wagmiAddress && wagmiIsConnected)
    );

    if (hasConnection !== stableConnectionRef.current.isConnected) {
      stableConnectionRef.current = {
        isConnected: hasConnection,
        lastUpdate: Date.now(),
      };
      debugLog("Connection state changed", {
        hasConnection,
        source: publicKey ? "solana" : privyWallet?.address ? "privy" : "wagmi",
      });
    }

    return hasConnection;
  }, [
    publicKey,
    connected,
    privyWallet?.address,
    privyWallet?.walletClientType,
    wagmiAddress,
    wagmiIsConnected,
  ]);

  const setWalletAddressWithLog = useCallback(
    (address: string | null, source?: string) => {
      debugLog(`WALLET CHANGE [${source || "unknown"}]:`, {
        from: walletAddress,
        to: address,
        path: path,
      });
      setWalletAddress(address);
    },
    [walletAddress, path],
  );

  useEffect(() => {
    debugLog("MultiChain state change:", {
      selectedChain,
      walletAddress,
      activeChainId: activeChain?.id,
      privyWalletAddress: privyWallet?.address,
      privyWalletType: privyWallet?.walletClientType,
      connectedSolana: connected,
      publicKeyExists: !!publicKey,
      step,
      isHydrated,
      isStablyConnected,
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
    isStablyConnected,
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
    debugLog("Disconnecting connectors:", {
      walletsLength: wallets?.length,
      connectorsLength: connectors?.length,
    });

    if (!!wallets?.length) {
      wallets.forEach(async (wallet) => {
        try {
          debugLog("Processing wallet for disconnect:", {
            walletId: wallet.meta.id,
            connectorTypes: wallet.connectorType,
          });

          const connector = connectors?.find(
            (con) =>
              con.id === wallet.meta.id ||
              con?.rdns?.includes(wallet.meta.id) ||
              (con.id === "walletConnect" &&
                wallet.connectorType.includes("wallet_connect")),
          );

          if (connector) {
            debugLog("Found matching connector, disconnecting:", {
              connectorId: connector.id,
              walletId: wallet.meta.id,
            });
            await disconnectAsync({ connector });
            await connector.disconnect();
            wallet.disconnect();
          }
        } catch (e) {
          debugLog("Error disconnecting wallet:", {
            walletId: wallet.meta.id,
            error: e,
          });
        }
      });
    }
  }, [connectors, wallets, disconnectAsync]);

  const evmDisconnect = useCallback(async () => {
    debugLog("EVM disconnect initiated");
    setIsWalletSwitching(true);

    try {
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
        debugLog("EVM disconnect completed");
        setIsWalletSwitching(false);
      }, 800);
    }
  }, [logout, disconnectConnectors, setWalletAddressWithLog]);

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
    debugLog("Connect Solana called:", {
      privyWalletExists: !!privyWallet?.address,
      privyWalletType: privyWallet?.walletClientType,
      step,
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
      console.error("[DEBUG] Solana connection error:", error);
    }
  };

  useEffect(() => {
    debugLog("Solana connection effect:", {
      connected,
      publicKeyExists: !!publicKey,
      isConnectedRefCurrent: isConnectedRef.current,
      step,
    });

    if (connected && publicKey && !isConnectedRef.current) {
      debugLog("Processing Solana connection...");
      isConnectedRef.current = true;

      if (step === "connectWallet") {
        debugLog("Fund wallet step - setting address");
        setFundWalletAddress(publicKey.toBase58());
        return setStep("selectChain");
      }

      debugLog("Regular connection - setting wallet state");
      setWalletAddressWithLog(publicKey.toBase58(), "solana-connect");
      setSelectedChain("solana");
      setActiveChain(chainConfigs[CHAIN_ID.solana]);

      return successAuth(null, undefined, true);
    } else if (!connected) {
      debugLog("Solana disconnected");
      isConnectedRef.current = false;
    }
  }, [
    connected,
    step,
    publicKey,
    setFundWalletAddress,
    setStep,
    setWalletAddressWithLog,
    setSelectedChain,
    setActiveChain,
    successAuth,
  ]);

  useEffect(() => {
    debugLog("Privy wallet effect:", {
      privyWalletAddress: privyWallet?.address,
      connected,
      latestChainRef: latestChainRef.current,
      step,
      walletsLength: wallets.length,
      userWallet: !!user?.wallet,
    });

    if (privyWallet?.address && !step) {
      if (connected && privyWallet?.meta?.id !== "app.phantom") {
        debugLog("Disconnecting Solana due to privy wallet connection");
        disconnect();
      }

      debugLog("Setting EVM wallet state");
      setWalletAddressWithLog(privyWallet?.address, "privy-connect");
      setSelectedChain("evm");

      if (privyWallet?.walletClientType === "privy") {
        if (privyWallet?.chainId?.split(":")[1] !== zetachain.id.toString()) {
          debugLog("Switching privy wallet to zetachain");
          privyWallet?.switchChain(zetachain.id);
        }
        if (activeChain?.id !== zetachain.id) {
          debugLog("Setting active chain to zetachain");
          setActiveChain(zetachain);
        }
      }

      if (
        !activeChain &&
        privyWallet?.chainId &&
        chainConfigs[Number(privyWallet?.chainId?.split(":")[1])]
      ) {
        debugLog("Setting active chain from privy wallet chainId");
        setActiveChain(
          chainConfigs[Number(privyWallet?.chainId?.split(":")[1] ?? 1)],
        );
      }
    } else if (!privyWallet?.address && !connected && !wagmiIsConnected) {
      setWalletAddressWithLog(null, "privy-clear");
    }
  }, [
    privyWallet?.address,
    privyWallet?.walletClientType,
    privyWallet?.chainId,
    privyWallet?.meta?.id,
    connected,
    disconnect,
    step,
    activeChain,
    wagmiIsConnected,
    setWalletAddressWithLog,
  ]);

  useEffect(() => {
    if (!isHydrated) return;
    if (step) return;

    debugLog("Initialization check:", {
      publicKeyExists: !!publicKey,
      connected,
      privyWalletAddress: privyWallet?.address,
      isStablyConnected,
    });

    const checkInitialization = () => {
      if (
        isStablyConnected ||
        (!publicKey && !privyWallet?.address && !wagmiIsConnected)
      ) {
        completeInitializationProcess();
      }
    };

    const stabilizationDelay = isMobileDevice() ? 500 : 300;
    const stabilizationTimer = setTimeout(
      checkInitialization,
      stabilizationDelay,
    );

    return () => {
      clearTimeout(stabilizationTimer);
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [
    isHydrated,
    isStablyConnected,
    step,
    completeInitializationProcess,
    publicKey,
    privyWallet?.address,
    wagmiIsConnected,
  ]);

  useEffect(() => {
    debugLog("Chain ID sync effect:", {
      isHydrated,
      privyChainId: privyWallet?.chainId?.split(":")[1],
      activeChainId: activeChain?.id.toString(),
      privyWalletType: privyWallet?.walletClientType,
      chainConfigExists:
        !!chainConfigs[Number(privyWallet?.chainId?.split(":")[1])],
    });

    if (
      isHydrated &&
      privyWallet?.chainId?.split(":")[1] !== activeChain?.id.toString() &&
      privyWallet?.walletClientType !== "privy" &&
      !!chainConfigs[Number(privyWallet?.chainId?.split(":")[1])]
    ) {
      debugLog("Syncing active chain with privy wallet");
      setActiveChain(chainConfigs[Number(privyWallet?.chainId?.split(":")[1])]);
    }
  }, [
    privyWallet?.chainId,
    activeChain?.id,
    privyWallet?.walletClientType,
    isHydrated,
  ]);

  // Fallback timeout:
  useEffect(() => {
    if (!isHydrated) return;

    const maxWaitTime = isMobileDevice() ? 5000 : 3000; 
    const maxWaitTimer = setTimeout(() => {
      if (!isInitializationComplete) {
        debugLog("Forcing initialization completion after max wait time");
        completeInitialization();
      }
    }, maxWaitTime);

    return () => clearTimeout(maxWaitTimer);
  }, [isHydrated, isInitializationComplete, completeInitialization]);

  //  Disconnect Wallet
  const disconnectWallet = useCallback(async () => {
    debugLog("DISCONNECT START");
    startInitialization();

    const hasTxInfo = localStorage.getItem(VAULTS_INFO_KEY);
    if (hasTxInfo) {
      localStorage.removeItem(VAULTS_INFO_KEY);
    }

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

      if (wagmiIsConnected) {
        await disconnectAsync(); // Wagmi disconnect
      }
    } catch (error) {
      debugLog("Error during disconnect:", error);
    }

    setSelectedChain(null);
    setActiveChain(null);
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
    wagmiIsConnected,
    setWalletAddressWithLog,
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
        });
      }
    },
    [privyWallet, setBalance, step, activeChain],
  );

  const switchToChain = useCallback(
    async (chain: Chain) => {
      debugLog("Switch to chain called:", {
        chainId: chain.id,
        chainName: chain.name,
        currentActiveChainId: activeChain?.id,
        privyWalletType: privyWallet?.walletClientType,
      });

      try {
        if (chain.id === CHAIN_ID.solana) {
          debugLog("Switching to Solana");
          setSelectedChain("solana");
          setActiveChain(chainConfigs[CHAIN_ID.solana]);
          latestChainRef.current = CHAIN_ID.solana.toString();
          return Promise.resolve();
        } else {
          debugLog("Switching to EVM chain:", chain.id);
          try {
            latestChainRef.current = chain.id.toString();

            if (privyWallet && privyWallet?.walletClientType !== "privy") {
              debugLog("Requesting wallet chain switch");
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
                  debugLog("Chain switch successful:", {
                    chainId: chain.id,
                    attempts: checkAttempts,
                  });
                  clearInterval(checkChain);
                  resolve();
                } else if (checkAttempts >= maxAttempts) {
                  console.error("[DEBUG] Chain switch timeout:", {
                    targetChainId: chain.id,
                    currentRef: latestChainRef.current,
                    attempts: checkAttempts,
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
            });
            throw error;
          }
        }
      } catch (error) {
        debugLog("Error in switchToChain:", {
          error,
          chainId: chain.id,
        });
        throw error;
      }
    },
    [privyWallet, activeChain?.id],
  );

  useEffect(() => {
    if (lastPathProcessedRef.current === path) {
      return;
    }

    debugLog("Path change effect:", {
      path,
      lastProcessed: lastPathProcessedRef.current,
    });

    const timeoutId = setTimeout(() => {
      lastPathProcessedRef.current = path;

      const isVaultAddressPath = /^\/vaults\/0x[0-9a-fA-F]{40}$/;

      debugLog("Processing path logic:", {
        path,
        isVaultPath: isVaultAddressPath.test(path),
        selectedChainFromModal,
        privyWalletType: privyWallet?.walletClientType,
        activeChainId: activeChain?.id,
        publicKeyExists: !!publicKey,
      });

      if (!isVaultAddressPath.test(path) && selectedChainFromModal) {
        debugLog("Clearing modal selections");
        setSelectedChainFromModal(null);
        setSelectedTokenFromModal(null);
      }

      if (privyWallet?.meta?.id === "app.phantom") {
        debugLog("Handling phantom wallet chain switch");
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
    setSelectedChainFromModal,
    setSelectedTokenFromModal,
    privyWallet?.meta?.id,
    privyWallet?.chainId,
    switchToChain,
    privyWallet?.walletClientType,
    activeChain?.id,
    publicKey,
  ]);

  useEffect(() => {
    debugLog("EVM balance effect:", {
      privyChainId: privyWallet?.chainId,
      privyAddress: privyWallet?.address,
      privyMetaId: privyWallet?.meta?.id,
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
    debugLog("Wallet connecting state effect:", {
      connected,
      privyWalletAddress: privyWallet?.address,
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
      debugLog("Syncing wallet address from authStore:", authUserAddress);
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
    setWalletAddressWithLog,
  ]);

  useEffect(() => {
    if (
      wagmiIsConnected &&
      wagmiAddress &&
      !walletAddress &&
      !publicKey &&
      !privyWallet?.address
    ) {
      setWalletAddressWithLog(wagmiAddress, "wagmi-connect");
      setSelectedChain("evm");
    }
  }, [
    wagmiIsConnected,
    wagmiAddress,
    walletAddress,
    publicKey,
    privyWallet?.address,
    setWalletAddressWithLog,
  ]);

  const universalActiveEvmWallet = useMemo(() => {
    if (privyWallet?.address) {
      return privyWallet;
    }

    if (wagmiIsConnected && wagmiAddress) {
      return {
        address: wagmiAddress,
        walletClientType: "wagmi",
        chainId: `eip155:${activeChain?.id || 7000}`,
      } as ConnectedWallet;
    }

    return privyWallet;
  }, [privyWallet, wagmiIsConnected, wagmiAddress, activeChain?.id]);

  const debugWalletState = {
    walletAddress,
    selectedChain,
    solana: { connected, publicKey: publicKey?.toBase58() },
    privy: {
      address: privyWallet?.address,
      type: privyWallet?.walletClientType,
    },
    wagmi: { connected: wagmiIsConnected, address: wagmiAddress },
    path: path,
    isStablyConnected,
  };

  useEffect(() => {
    debugLog("WALLET STATE:", debugWalletState);
  }, [walletAddress, selectedChain, path, isStablyConnected]);

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
