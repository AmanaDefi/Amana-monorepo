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
  const { successAuth } = useAuthStore();
  const isConnectedRef = useRef(connected);

  const { isConnected: wagmiIsConnected, address: wagmiAddress } = useAccount();

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
      console.log(isDisconnected, wallet.meta.id, wallet.walletClientType);

      if (isDisconnected === "true" && wallet.walletClientType !== "privy") {
        return false;
      }

      return true;
    });
  }, [wallets, wagmiIsConnected]);
  const { user } = usePrivy();
  const privyWallet = filteredWallets[0];
  const [activeChain, setActiveChain] = useState<Chain | null>(null);

  console.log(privyWallet);

  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPathProcessedRef = useRef<string | null>(null);

  debugLog("Provider initialized with hydration-safe state:", {
    selectedChain,
    walletAddress,
    isHydrated,
  });

  const { balance: solanaBalance, refetch: refetchSolBalance } =
    useSolanaBalance();

  const latestChainRef = useRef<string | null>(null);

  const disconnectConnectors = useCallback(async () => {
    if (!!wallets?.length) {
      wallets.forEach(async (wallet) => {
        try {
          console.log(wallet.meta.id, connectors);
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
          console.log(e);
        }
      });
    }
  }, [connectors, wallets, disconnectAsync]);

  const evmDisconnect = useCallback(async () => {
    console.log("evm disconnect");
    setIsWalletSwitching(true);
    try {
      await disconnectConnectors();
    } finally {
      await logout();
      setTimeout(() => {
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

  const connectSolana = async () => {
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
      console.error("Solana connection error:", error);
    }
  };

  useEffect(() => {
    if (connected && publicKey && !isConnectedRef.current) {
      isConnectedRef.current = true;

      if (step === "connectWallet") {
        setFundWalletAddress(publicKey.toBase58());
        return setStep("selectChain");
      }

      setWalletAddress(publicKey.toBase58());
      setSelectedChain("solana");
      setActiveChain(chainConfigs[CHAIN_ID.solana]);

      return successAuth(null, undefined, true);
    } else if (!connected) {
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
    if (wagmiIsConnected && wagmiAddress && !step) {
      console.log("WAGMI wallet connected:", wagmiAddress);
      setWalletAddress(wagmiAddress);
      setSelectedChain("evm");
      if (!activeChain) {
        setActiveChain(zetachain);
      }
      successAuth(wagmiAddress, undefined, true);
    }
  }, [wagmiIsConnected, wagmiAddress, step, activeChain, successAuth]);

  useEffect(() => {
    if (privyWallet?.address && connected && !latestChainRef.current && !step) {
      disconnect();
      disconnectConnectors();
    }
    if (privyWallet?.address) {
      if (!step) {
        if (wallets.length > 1 && user?.wallet) {
          disconnectConnectors();
        }

        setWalletAddress(privyWallet?.address);
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
          disconnect().catch((err) => {
            console.error("error disconnect Solana:", err);
          });
          disconnectConnectors();
        }
      }
    } else if (!privyWallet?.address && !connected && !wagmiIsConnected) {
      setWalletAddress(null);
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
    wagmiIsConnected,
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
        (wagmiIsConnected && wagmiAddress) ||
        (!publicKey && !privyWallet?.address && !wagmiIsConnected);

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
    step,
    completeInitializationProcess,
    wagmiIsConnected,
    wagmiAddress,
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

  const disconnectWallet = useCallback(async () => {
    startInitialization();
    const hasTxInfo = localStorage.getItem(VAULTS_INFO_KEY);
    if (hasTxInfo) {
      localStorage.removeItem(VAULTS_INFO_KEY);
    }
    debugLog("Disconnecting all wallets...");

    if (wagmiIsConnected) {
      console.log("Disconnecting WAGMI...");
      await disconnectAsync();
    }

    setSelectedChain("evm");
    disconnect();
    await evmDisconnect();
    setIsModalOpen(false);
    debugLog("All wallets disconnected");
    setWalletAddress(null);

    const { logout: authLogout } = useAuthStore.getState();
    authLogout();

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
    evmDisconnect,
    router,
    path,
    startInitialization,
    completeInitialization,
    wagmiIsConnected,
    disconnectAsync,
  ]);

  const getEvmBalance = useCallback(
    async (walletAddress: string) => {
      if (!activeChain || !walletAddress) return;

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
        console.error("Error get balance:", error);
      }
    },
    [setBalance, step, activeChain],
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
          // Для EVM chains
          try {
            latestChainRef.current = chain.id.toString();

            if (privyWallet && privyWallet?.walletClientType !== "privy") {
              privyWallet?.switchChain(chain.id);
            }

            setSelectedChain("evm");
            setActiveChain(chain);

            return Promise.resolve();
          } catch (error) {
            console.error("Failed to switch chain in wallet:", error);
            throw error;
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

      if (
        !isVaultAddressPath.test(path) &&
        privyWallet?.walletClientType === "privy" &&
        activeChain?.id !== zetachain.id
      ) {
        setActiveChain(zetachain);
        latestChainRef.current = zetachain.id.toString();
      }

      if (
        !isVaultAddressPath.test(path) &&
        privyWallet?.address &&
        privyWallet?.walletClientType !== "privy" &&
        activeChain?.id === CHAIN_ID["solana"] &&
        privyWallet?.meta?.id !== "app.phantom"
      ) {
        switchToChain(zetachain);
        latestChainRef.current = zetachain.id.toString();
      }

      if (
        !isVaultAddressPath.test(path) &&
        publicKey &&
        activeChain?.id !== CHAIN_ID["solana"]
      ) {
        switchToChain(chainConfigs[CHAIN_ID.solana]);
        latestChainRef.current = CHAIN_ID["solana"].toString();
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
    switchToChain,
    setSelectedChainFromModal,
    setSelectedTokenFromModal,
    privyWallet?.walletClientType,
    privyWallet?.address,
    privyWallet?.meta?.id,
    privyWallet?.chainId,
    activeChain?.id,
    publicKey?.toBase58(),
  ]);

  useEffect(() => {
    if (privyWallet?.chainId && privyWallet?.address) {
      getEvmBalance(privyWallet?.address);
    } else if (wagmiIsConnected && wagmiAddress) {
      getEvmBalance(wagmiAddress);
    }
  }, [
    privyWallet?.chainId,
    privyWallet?.address,
    getEvmBalance,
    privyWallet?.meta?.id,
    wagmiIsConnected,
    wagmiAddress,
  ]);

  useEffect(() => {
    if (connected || privyWallet?.address || wagmiIsConnected) {
      setIsWalletConnecting(false);
    }
  }, [
    connected,
    privyWallet?.address,
    setIsWalletConnecting,
    wagmiIsConnected,
  ]);

  const activeEvmWallet = useMemo(() => {
    if (wagmiIsConnected && wagmiAddress) {
      console.log("Using WAGMI wallet:", wagmiAddress);
      return {
        address: wagmiAddress,
        walletClientType: "external",
        chainId: activeChain?.id ? `eip155:${activeChain.id}` : "eip155:1",
        meta: { id: "wagmi" },
      } as ConnectedWallet;
    }

    console.log("Using Privy wallet:", privyWallet?.address);
    return privyWallet;
  }, [wagmiIsConnected, wagmiAddress, privyWallet, activeChain?.id]);

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
        activeEvmWallet: activeEvmWallet,
      }}
    >
      {children}
    </MultiChainContext.Provider>
  );
};
