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
import { CHAIN_ID, chainConfigs, solanaChain } from "@/constants/chainConfig";

import useSolanaBalance from "@/hooks/useSolanaBalance";
import { Balance } from "@/types/types";
import { Chain, formatEther } from "viem";
import { getPublicClient } from "@/utils/getPublicClient";
import { usePathname, useRouter } from "next/navigation";
import { useConnect } from "wagmi";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { zetachain } from "viem/chains";
import { useFundWalletStore } from "@/store/fundWalletStore";
import { useAuthStore } from "@/store/authStore";
import { useChainTokenModalStore } from "@/store/chainTokenModalStore";
import { useInitializationStore } from "@/store/initializationStore";

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

  const {
    step,
    setWalletAddress: setFundWalletAddress,
    setStep,
  } = useFundWalletStore();
  const { successAuth } = useAuthStore();
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
  const filteredWallets = wallets.filter(
    (wallet) => wallet.meta.id !== "app.phantom",
  );
  const { user } = usePrivy();
  const privyWallet = filteredWallets[0];
  const [activeChain, setActiveChain] = useState<Chain | null>(null);

  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  debugLog("Provider initialized with hydration-safe state:", {
    selectedChain,
    walletAddress,
    isHydrated,
  });

  const { balance: solanaBalance, refetch: refetchSolBalance } =
    useSolanaBalance();

  const latestChainRef = useRef<string | null>(null);

  const disconnectConnectors = useCallback(async () => {
    if (!!filteredWallets?.length) {
      filteredWallets.forEach(async (wallet) => {
        try {
          console.log(wallet.meta.id, connectors);
          await connectors
            ?.find(
              (con) =>
                con.id === wallet.meta.id ||
                con?.rdns?.includes(wallet.meta.id) ||
                (con.id === "walletConnect" &&
                  wallet.connectorType.includes("wallet_connect")),
            )
            ?.disconnect();
        } catch (e) {
          console.log(e);
        }
      });

      window.sessionStorage.removeItem("provider");
    }
  }, [connectors, filteredWallets]);

  const evmDisconnect = useCallback(async () => {
    try {
      await disconnectConnectors();
    } finally {
      await logout();
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
    try {
      if (privyWallet?.address && !step) {
        debugLog("Disconnecting EVM wallet before Solana connection");
        await evmDisconnect();
      }
      setSelectedChain("solana");
    } catch (error) {
      console.error("Solana connection error:", error);
    }
  };

  useEffect(() => {
    if (connected && publicKey && !isConnectedRef.current) {
      // connectSolana();
      isConnectedRef.current = true;

      if (step === "connectWallet") {
        localStorage.removeItem("connectorId");
        setFundWalletAddress(publicKey.toBase58());
        return setStep("confirm");
      }

      setWalletAddress(publicKey.toBase58());
      setSelectedChain("solana");
      setActiveChain(chainConfigs[CHAIN_ID.solana]);

      return successAuth(null, undefined, true);
    } else if (!connected) {
      isConnectedRef.current = false;
    }
  }, [connected, step, publicKey]);

  useEffect(() => {
    if (
      privyWallet?.address &&
      connected &&
      !latestChainRef.current &&
      !step &&
      privyWallet?.meta?.id !== "app.phantom"
    ) {
      disconnect();
      disconnectConnectors();
    }
    if (privyWallet?.address) {
      if (!step) {
        if (
          (filteredWallets.length > 1 && user?.wallet) ||
          privyWallet?.meta?.id === "app.phantom"
        ) {
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
      }

      if (connected) {
        disconnect().catch((err) => {
          console.error("error disconnect Solana:", err);
        });
        disconnectConnectors();
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
    filteredWallets,
    activeChain?.id,
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
        (!publicKey && !privyWallet?.address);

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
    startInitialization();
    const hasViewedOnboarding = localStorage.getItem("hasViewedOnboarding");
    localStorage.clear();
    if (hasViewedOnboarding) {
      localStorage.setItem("hasViewedOnboarding", hasViewedOnboarding);
    }
    debugLog("Disconnecting all wallets...");
    setSelectedChain("evm");
    disconnect();
    await evmDisconnect();
    setIsModalOpen(false);
    debugLog("All wallets disconnected");
    setWalletAddress(null);

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
        console.error("Error get balance:", error);
      }
    },
    [privyWallet, setBalance, step, activeChain],
  );

  // IMPROVED: Better connection detection logic with initialization delay
  useEffect(() => {
    // Wait for hydration before starting initialization
    if (!isHydrated) return;

    if (publicKey) {
      setWalletAddress(publicKey.toBase58());
      setSelectedChain("solana");
      if (step) {
        setFundWalletAddress(publicKey.toBase58());
      }
    } else if (
      privyWallet?.address &&
      privyWallet?.meta?.id !== "app.phantom"
    ) {
      if (!step) {
        debugLog("EVM wallet connected:", privyWallet?.address);
        setWalletAddress(privyWallet?.address);
        setSelectedChain("evm");
        setIsModalOpen(false);
      }
    }
  }, [
    privyWallet,
    publicKey,
    getEvmBalance,
    isHydrated,
    selectedChain,
    user,
    step,
    setFundWalletAddress,
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
          try {
            // Update our ref immediately (won't be affected by closures)
            latestChainRef.current = chain.id.toString();
            // This will prompt the user's wallet to switch chains
            if (
              privyWallet &&
              privyWallet?.walletClientType !== "privy" &&
              privyWallet?.meta?.id !== "app.phantom"
            ) {
              privyWallet?.switchChain(chain.id);
            }

            // Set the chain type first
            setSelectedChain("evm");

            // Then update the active chain
            setActiveChain(chain);

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
        }
      } catch (error) {
        console.log("Error in switchToChain:", error);
        throw error;
      }
    },
    [privyWallet],
  );

  useEffect(() => {
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
  }, [
    path,
    activeChain,
    privyWallet,
    publicKey,
    selectedChainFromModal,
    switchToChain,
    setSelectedChainFromModal,
    setSelectedTokenFromModal,
  ]);

  useEffect(() => {
    if (
      privyWallet?.chainId &&
      privyWallet?.address &&
      privyWallet?.meta?.id !== "app.phantom"
    ) {
      getEvmBalance(privyWallet?.address);
    }
  }, [
    privyWallet?.chainId,
    privyWallet?.address,
    getEvmBalance,
    privyWallet?.meta?.id,
  ]);

  useEffect(() => {
    if (connected || privyWallet?.address) {
      setIsWalletConnecting(false);
    }
  }, [connected, privyWallet?.address, setIsWalletConnecting]);

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
        evmDisconnect: evmDisconnect,
      }}
    >
      {children}
    </MultiChainContext.Provider>
  );
};
