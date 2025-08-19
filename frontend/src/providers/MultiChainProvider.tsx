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
const PERSISTED_WALLET_KEY = "amana-persisted-wallet";
const PERSISTED_CHAIN_KEY = "amana-persisted-chain";
const WAGMI_WALLET_KEY = "amana-wagmi-wallet";
const MANUAL_DISCONNECT_KEY = "amana-manual-disconnect";
const DEBUG_WALLET = false; // Set to false in production

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
  >(null);
  const [isWagmiConnected, setIsWagmiConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [disconnectInProgress, setDisconnectInProgress] = useState(false);

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

  const { address: wagmiAddress } = useAccount();
  const wagmiConnected = isWagmiConnected;

  const setWalletAddressWithLog = useCallback(
    (address: string | null, source?: string) => {
      const flag = localStorage.getItem(MANUAL_DISCONNECT_KEY);

      console.log(
        "WALLET SET:",
        address?.slice(0, 8) || "null",
        "from:",
        source,
        "disconnectInProgress:",
        disconnectInProgress,
        "flag:",
        flag || "none",
      );

      setWalletAddress(address);
    },
    [walletAddress, disconnectInProgress],
  );

  useEffect(() => {
    const manualDisconnect = localStorage.getItem(MANUAL_DISCONNECT_KEY);
    if (manualDisconnect === "true") {
      return;
    }

    if (wagmiAddress) {
      console.log(
        "WAGMI RECONNECT:",
        wagmiAddress.slice(0, 8),
        "disconnectInProgress:",
        disconnectInProgress,
      );
      setIsWagmiConnected(true);
      localStorage.setItem(WAGMI_WALLET_KEY, wagmiAddress);
      console.log("[WAGMI STATE] Connected and saved:", wagmiAddress);
    } else {
      const savedAddress = localStorage.getItem(WAGMI_WALLET_KEY);
      if (savedAddress && !manualDisconnect) {
        setIsWagmiConnected(true);
      } else {
        setIsWagmiConnected(false);
      }
    }
  }, [wagmiAddress, isWagmiConnected, disconnectInProgress]);

  // Persist wallet address when connected
  useEffect(() => {
    if (disconnectInProgress) return;

    const manualDisconnect = localStorage.getItem(MANUAL_DISCONNECT_KEY);
    if (manualDisconnect === "true") {
      return;
    }
    if (walletAddress && walletAddress !== persistedWalletAddress) {
      localStorage.setItem(PERSISTED_WALLET_KEY, walletAddress);
      setPersistedWalletAddress(walletAddress);
    }
  }, [walletAddress, persistedWalletAddress, disconnectInProgress]);

  useEffect(() => {
    if (disconnectInProgress) return;

    const manualDisconnect = localStorage.getItem(MANUAL_DISCONNECT_KEY);
    if (manualDisconnect === "true") {
      return;
    }

    if (isHydrated && !walletAddress && !step) {
      const saved = localStorage.getItem(PERSISTED_WALLET_KEY);
      if (saved) {
        console.log(
          "LOCALSTORAGE RESTORE:",
          saved.slice(0, 8),
          "disconnectInProgress:",
          disconnectInProgress,
        );
        setWalletAddressWithLog(saved, "localStorage-restore");
        setSelectedChain("evm");

        const savedChain = localStorage.getItem(PERSISTED_CHAIN_KEY);
        if (savedChain && chainConfigs[Number(savedChain)]) {
          setActiveChain(chainConfigs[Number(savedChain)]);
        } else {
          setActiveChain(zetachain);
        }
      }
    }
  }, [
    isHydrated,
    walletAddress,
    step,
    setWalletAddressWithLog,
    disconnectInProgress,
  ]);

  useEffect(() => {
    if (activeChain?.id) {
      localStorage.setItem(PERSISTED_CHAIN_KEY, activeChain.id.toString());
    }
  }, [activeChain?.id]);

  const { balance: solanaBalance, refetch: refetchSolBalance } =
    useSolanaBalance();

  const latestChainRef = useRef<string | null>(null);

  const disconnectConnectors = useCallback(async () => {
    if (!!wallets?.length) {
      wallets.forEach(async (wallet) => {
        try {
          const connector = connectors?.find(
            (con) =>
              con.id === wallet.meta.id ||
              con?.rdns?.includes(wallet.meta.id) ||
              (con.id === "walletConnect" &&
                wallet.connectorType.includes("wallet_connect")),
          );

          if (connector) {
            await disconnectAsync({ connector });
            await connector.disconnect();
            wallet.disconnect();
          }
        } catch (e) {
          console.log("Error disconnecting wallet:", {
            walletId: wallet.meta.id,
            error: e,
          });
        }
      });
    }
  }, [connectors, wallets, disconnectAsync]);

  const evmDisconnect = useCallback(async () => {
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
      console.error("Error in EVM disconnect:", error);
    } finally {
      setTimeout(() => {
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
    }, 200);
  }, [completeInitialization]);

  useEffect(() => {
    setIsHydrated(true);
  }, [setIsHydrated]);

  // Connect Solana Wallet
  const connectSolana = async () => {
    try {
      if (
        privyWallet?.address &&
        privyWallet.walletClientType !== "privy" &&
        !step
      ) {
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

  // Solana connection effect
  useEffect(() => {
    if (disconnectInProgress) return;

    if (connected && publicKey && !isConnectedRef.current) {
      console.log("[DEBUG] Processing Solana connection...");
      isConnectedRef.current = true;

      if (step === "connectWallet") {
        console.log("[DEBUG] Fund wallet step - setting address");
        setFundWalletAddress(publicKey.toBase58());
        return setStep("selectChain");
      }
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
    setWalletAddressWithLog,
    setSelectedChain,
    setActiveChain,
    successAuth,
    disconnectInProgress,
  ]);

  useEffect(() => {
    if (disconnectInProgress) return;
    const manualDisconnect = localStorage.getItem(MANUAL_DISCONNECT_KEY);
    if (manualDisconnect === "true") {
      return;
    }

    if (privyWallet?.address && connected && !latestChainRef.current && !step) {
      console.log(
        "[DEBUG] Disconnecting Solana due to privy wallet connection",
      );
      disconnect();
      disconnectConnectors();
    }

    if (privyWallet?.address && !disconnectInProgress) {
      console.log(
        "PRIVY RECONNECT:",
        privyWallet.address.slice(0, 8),
        "disconnectInProgress:",
        disconnectInProgress,
        "step:",
        step,
      );

      if (!step) {
        if (wallets.length > 1 && user?.wallet) {
          disconnectConnectors();
        }
        setWalletAddressWithLog(privyWallet?.address, "privy-connect");
        setSelectedChain("evm");

        if (
          privyWallet?.walletClientType === "privy" &&
          privyWallet?.chainId?.split(":")[1] !== zetachain.id.toString()
        ) {
          privyWallet?.switchChain(zetachain.id);
        }

        if (
          privyWallet?.walletClientType === "privy" &&
          activeChain?.id !== zetachain.id
        ) {
          setActiveChain(zetachain);
        }

        if (
          !activeChain &&
          privyWallet?.address &&
          privyWallet?.chainId &&
          !!chainConfigs[Number(privyWallet?.chainId?.split(":")[1])]
        ) {
          setActiveChain(
            chainConfigs[Number(privyWallet?.chainId?.split(":")[1] ?? 1)],
          );
        }

        if (connected) {
          disconnect().catch((err) => {});
          disconnectConnectors();
        }
      }
    } else if (
      !privyWallet?.address &&
      !connected &&
      !wagmiConnected &&
      !persistedWalletAddress &&
      !manualDisconnect
    ) {
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
    persistedWalletAddress,
    wagmiConnected,
    setWalletAddressWithLog,
    setSelectedChain,
    setActiveChain,
    disconnectInProgress,
  ]);

  useEffect(() => {
    const flag = localStorage.getItem(MANUAL_DISCONNECT_KEY);

    console.log(" PRIVY MONITOR:", {
      address: privyWallet?.address?.slice(0, 8) || "none",
      walletClientType: privyWallet?.walletClientType || "none",
      flag: flag || "none",
      user_id: user?.id || "none",
      wallets_count: wallets.length,
      disconnectInProgress,
      timestamp: new Date().toISOString(),
    });
  }, [
    privyWallet?.address,
    privyWallet?.walletClientType,
    user?.id,
    wallets.length,
    disconnectInProgress,
  ]);

  useEffect(() => {
    if (
      isHydrated &&
      privyWallet?.chainId?.split(":")[1] !== activeChain?.id.toString() &&
      privyWallet?.walletClientType !== "privy" &&
      !!chainConfigs[Number(privyWallet?.chainId?.split(":")[1])]
    ) {
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

    const checkInitialization = () => {
      const hasStableConnection =
        (publicKey && connected) ||
        (privyWallet?.address && !connected) ||
        (wagmiConnected && wagmiAddress) ||
        persistedWalletAddress ||
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
    persistedWalletAddress,
  ]);

  // Fallback timeout:
  useEffect(() => {
    if (!isHydrated) return;

    const maxWaitTimer = setTimeout(() => {
      if (!isInitializationComplete) {
        completeInitialization();
      }
    }, 3000);

    return () => clearTimeout(maxWaitTimer);
  }, [isHydrated, isInitializationComplete, completeInitialization]);

  const disconnectWallet = useCallback(async () => {
    console.log("DISCONNECT START", {
      timestamp: new Date().toISOString(),
      walletAddress_before: walletAddress?.slice(0, 8),
      privyWallet_before: privyWallet?.address?.slice(0, 8),
    });

    localStorage.setItem(MANUAL_DISCONNECT_KEY, "true");

    setDisconnectInProgress(true);
    startInitialization();

    setSelectedChain(null);
    setActiveChain(null);
    setWalletAddressWithLog(null, "full-disconnect");
    setIsModalOpen(false);

    const hasTxInfo = localStorage.getItem(VAULTS_INFO_KEY);
    if (hasTxInfo) {
      localStorage.removeItem(VAULTS_INFO_KEY);
    }

    localStorage.removeItem(PERSISTED_WALLET_KEY);
    localStorage.removeItem(PERSISTED_CHAIN_KEY);
    localStorage.removeItem(WAGMI_WALLET_KEY);

    if (typeof window !== "undefined") {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("privy:")) {
          localStorage.removeItem(key);
        }
      });
    }

    setPersistedWalletAddress(null);
    setIsWagmiConnected(false);

    try {
      const { logout: authLogout } = useAuthStore.getState();
      authLogout();

      const disconnectPromises = [];

      if (privyWallet?.address) {
        console.log("Attempting Privy logout...");
        disconnectPromises.push(
          logout().catch((error) => {
            console.log(
              "Privy logout failed (expected):",
              error?.message || error,
            );
            return null;
          }),
        );
        disconnectPromises.push(disconnectConnectors());
      }

      if (connected) {
        disconnectPromises.push(disconnect());
      }

      if (wagmiConnected) {
        disconnectPromises.push(disconnectAsync());
      }

      await Promise.allSettled(disconnectPromises);
    } catch (error) {
      console.error("Error during disconnect process:", error);
    } finally {
      setTimeout(() => {
        setDisconnectInProgress(false);
        localStorage.removeItem(MANUAL_DISCONNECT_KEY);
        completeInitialization();
        console.log("DISCONNECT CLEANUP COMPLETE - flags cleared");
      }, 1000);

      console.log("DISCONNECT END", {
        timestamp: new Date().toISOString(),
        walletAddress_after: walletAddress,
        privyWallet_after: privyWallet?.address?.slice(0, 8),
        flag_remains: localStorage.getItem(MANUAL_DISCONNECT_KEY),
      });

      const isVaultAddressPath = /^\/vaults\/0x[0-9a-fA-F]{40}$/;
      if (
        path !== "/" &&
        path !== "/leaderboard" &&
        path !== "/about" &&
        !isVaultAddressPath.test(path)
      ) {
        router.push("/");
      }
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
        console.error("Error getting balance:", {
          error,
          walletAddress,
          activeChainId: activeChain?.id,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [privyWallet, setBalance, step, activeChain],
  );

  const switchToChain = useCallback(
    async (chain: Chain) => {
      try {
        if (chain.id === CHAIN_ID.solana) {
          setSelectedChain("solana");
          setActiveChain(chainConfigs[CHAIN_ID.solana]);
          latestChainRef.current = CHAIN_ID.solana.toString();
          return Promise.resolve();
        } else {
          try {
            latestChainRef.current = chain.id.toString();

            if (privyWallet && privyWallet?.walletClientType !== "privy") {
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
                  clearInterval(checkChain);
                  resolve();
                } else if (checkAttempts >= maxAttempts) {
                  clearInterval(checkChain);
                  reject(new Error("Chain switch timeout"));
                }
              }, 100);
            });
          } catch (error) {
            console.error("Failed to switch chain in wallet:", {
              error,
            });
            throw error;
          }
        }
      } catch (error) {
        console.log("Error in switchToChain:", {
          error,
        });
        throw error;
      }
    },
    [privyWallet, setSelectedChain, setActiveChain],
  );

  useEffect(() => {
    if (lastPathProcessedRef.current === path) {
      return;
    }

    const timeoutId = setTimeout(() => {
      lastPathProcessedRef.current = path;

      const isVaultAddressPath = /^\/vaults\/0x[0-9a-fA-F]{40}$/;

      if (!isVaultAddressPath.test(path) && selectedChainFromModal) {
        setSelectedChainFromModal(null);
        setSelectedTokenFromModal(null);
      }

      if (privyWallet?.meta?.id === "app.phantom") {
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
  ]);

  useEffect(() => {
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
    if (connected || privyWallet?.address) {
      setIsWalletConnecting(false);
    }
  }, [connected, privyWallet?.address, setIsWalletConnecting]);

  useEffect(() => {
    if (disconnectInProgress) return;

    const manualDisconnect = localStorage.getItem(MANUAL_DISCONNECT_KEY);
    if (manualDisconnect === "true") {
      return;
    }

    if (
      authUserAddress &&
      !walletAddress &&
      !publicKey &&
      !privyWallet?.address
    ) {
      console.log(
        "AUTH RESTORE:",
        authUserAddress.slice(0, 8),
        "disconnectInProgress:",
        disconnectInProgress,
      );
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
    setActiveChain,
    disconnectInProgress,
  ]);

  useEffect(() => {
    if (disconnectInProgress) return;

    const manualDisconnect = localStorage.getItem(MANUAL_DISCONNECT_KEY);
    if (manualDisconnect === "true") {
      return;
    }

    if (
      wagmiConnected &&
      wagmiAddress &&
      !walletAddress &&
      !publicKey &&
      !privyWallet?.address
    ) {
      console.log(
        "WAGMI RESTORE:",
        wagmiAddress.slice(0, 8),
        "disconnectInProgress:",
        disconnectInProgress,
      );
      setWalletAddressWithLog(wagmiAddress, "wagmi-connect");
      setSelectedChain("evm");
    }
  }, [
    wagmiConnected,
    wagmiAddress,
    walletAddress,
    publicKey,
    privyWallet?.address,
    setWalletAddressWithLog,
    setSelectedChain,
    disconnectInProgress,
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

    if (wagmiConnected && !wagmiAddress) {
      const savedAddress = localStorage.getItem(WAGMI_WALLET_KEY);
      if (savedAddress) {
        return {
          address: savedAddress,
          walletClientType: "wagmi",
          chainId: `eip155:${activeChain?.id || 7000}`,
        } as ConnectedWallet;
      }
    }

    return privyWallet;
  }, [privyWallet, wagmiConnected, wagmiAddress, activeChain?.id]);

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
