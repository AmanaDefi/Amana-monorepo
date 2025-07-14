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
import { useTemporaryBitcoinWallet } from "@/hooks/useBitcoinWallet";
import dynamic from 'next/dynamic';
const getBitcoinBalanceDynamic = async (bitcoinWallet: any) => {
  const mod = await import('@/actions/bitcoinActions');
  return mod.getBitcoinBalance(bitcoinWallet);
};
import { convertStringToBalance } from "@/utils/graphUtils";
import { useAuthStore } from "@/store/authStore";
import { useChainTokenModalStore } from "@/store/chainTokenModalStore";

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

export type ChainType = "solana" | "evm" | "bitcoin" | null;

interface MultiChainContextType {
  selectedChain: ChainType | null;
  activeChain: Chain | null;
  walletAddress: string | null;
  balance: Balance;
  connectSolana: () => Promise<void>;
  connectBitcoin: (walletType?: 'unisat' | 'xverse' | 'leather') => Promise<void>;
  disconnectWallet: () => Promise<void>;
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
  switchToChain: (chain: Chain) => Promise<void>;
  refetchBalance: (address: string) => Promise<Balance | undefined>;
  isHydrated: boolean;
  evmDisconnect: () => Promise<void>;
  // Bitcoin-specific properties
  bitcoinWallet: any | null;
  bitcoinBalance: Balance;
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

  const {
    step,
    setWalletAddress: setFundWalletAddress,
    setStep,
  } = useFundWalletStore();
  const { successAuth } = useAuthStore();
  const isConnectedRef = useRef(connected);

  const router = useRouter();
  const path = usePathname();
  const { setSelectedChainFromModal, selectedChainFromModal } =
    useChainTokenModalStore();

  const { wallets } = useWallets();
  const filteredWallets = wallets.filter(
    (wallet) => wallet.meta.id !== "app.phantom",
  );
  const { user } = usePrivy();
  const privyWallet = filteredWallets[0];
  const [activeChain, setActiveChain] = useState<Chain | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  debugLog("Provider initialized with hydration-safe state:", {
    selectedChain,
    walletAddress,
    isHydrated,
  });

  const { balance: solanaBalance, refetch: refetchSolBalance } =
    useSolanaBalance();

  const latestChainRef = useRef<string | null>(null);
  
  // Bitcoin wallet integration
  const { 
    wallet: bitcoinWallet, 
    isConnected: isBitcoinConnected, 
    connectWallet: connectBitcoinWallet,
    disconnect: disconnectBitcoinWallet 
  } = useTemporaryBitcoinWallet();
  
  const [bitcoinBalance, setBitcoinBalance] = useState<Balance>({ 
    value: 0n, 
    formatted: "0" 
  });

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

  useEffect(() => {
    setIsHydrated(true);
    console.log('[MultiChainProvider][DEBUG] Hydrated');
  }, []);

  useEffect(() => {
    if (selectedChain == "solana") {
      setActiveChain(chainConfigs[CHAIN_ID.solana]);
      latestChainRef.current = CHAIN_ID.solana.toString();
      console.log('[MultiChainProvider][DEBUG] Switched to Solana', { selectedChain });
      return;
    } else if (selectedChain === "bitcoin") {
      setActiveChain(chainConfigs[CHAIN_ID.bitcoin]);
      latestChainRef.current = CHAIN_ID.bitcoin.toString();
      console.log('[MultiChainProvider][DEBUG] Switched to Bitcoin', { selectedChain });
      return;
    } else if (privyWallet?.chainId) {
      setActiveChain(
        chainConfigs[Number(privyWallet?.chainId?.split(":")[1] ?? 7000)],
      );
      latestChainRef.current = privyWallet?.chainId?.split(":")[1];
      console.log('[MultiChainProvider][DEBUG] Switched to EVM', { selectedChain, privyWallet });
    } else {
      setActiveChain(zetachain);
      latestChainRef.current = null;
      console.log('[MultiChainProvider][DEBUG] Defaulted to Zetachain', { selectedChain });
    }
  }, [selectedChain, privyWallet?.chainId]);

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

  // Connect Bitcoin Wallet
  const connectBitcoin = async (walletType: 'unisat' | 'xverse' | 'leather' = 'unisat') => {
    setIsModalOpen(false);
    try {
      // Disconnect other wallets first
      if (selectedChain === "evm") {
        debugLog("Disconnecting EVM wallet before Bitcoin connection");
        await evmDisconnect();
      }
      if (selectedChain === "solana" && connected) {
        debugLog("Disconnecting Solana wallet before Bitcoin connection");
        await disconnect();
      }
      
      // Connect Bitcoin wallet
      await connectBitcoinWallet(walletType);
      
      // The useEffect above will handle setting the wallet address and chain
      // No need to manually set selectedChain here as it will be set by the useEffect
      
      debugLog("Bitcoin wallet connection initiated");
    } catch (error) {
      console.error("Bitcoin connection error:", error);
      throw error;
    }
  };

  // Get Bitcoin balance
  const getBitcoinBalanceFormatted = useCallback(async (address: string) => {
    if (!bitcoinWallet) return { value: 0n, formatted: "0" };
    
    try {
      const balanceInSatoshis = await getBitcoinBalanceDynamic(bitcoinWallet);
      const balanceInBTC = Number(balanceInSatoshis) / 100000000; // Convert satoshis to BTC
      
      const balance = {
        value: balanceInSatoshis,
        formatted: balanceInBTC.toFixed(8)
      };
      
      setBitcoinBalance(balance);
      return balance;
    } catch (error) {
      console.error("Error fetching Bitcoin balance:", error);
      return { value: 0n, formatted: "0" };
    }
  }, [bitcoinWallet]);

  useEffect(() => {
    if (connected && publicKey && !isConnectedRef.current) {
      // connectSolana();
      isConnectedRef.current = true;
      console.log('[MultiChainProvider][DEBUG] Solana wallet connected', { publicKey });
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
      console.log('[MultiChainProvider][DEBUG] Solana wallet disconnected');
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
      console.log('[MultiChainProvider][DEBUG] Disconnected EVM wallet due to Solana connection', { privyWallet });
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
        console.log('[MultiChainProvider][DEBUG] EVM wallet connected', { privyWallet });
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
    } else if (!privyWallet?.address && !connected && !isBitcoinConnected) {
      setWalletAddress(null);
      console.log('[MultiChainProvider][DEBUG] All wallets disconnected');
    }
  }, [privyWallet, connected, disconnect, user, step, disconnectConnectors, filteredWallets, activeChain?.id]);

  useEffect(() => {
    if (isHydrated && privyWallet?.chainId?.split(":")[1] !== activeChain?.id.toString() && privyWallet?.walletClientType !== "privy" && !!chainConfigs[Number(privyWallet?.chainId?.split(":")[1])]) {
      setActiveChain(chainConfigs[Number(privyWallet?.chainId?.split(":")[1])]);
      console.log('[MultiChainProvider][DEBUG] Active chain updated after hydration', { privyWallet, activeChain });
    }
  }, [privyWallet?.chainId, activeChain?.id, privyWallet?.walletClientType, isHydrated]);

  //  Disconnect Wallet
  const disconnectWallet = useCallback(async () => {
    const hasViewedOnboarding = localStorage.getItem("hasViewedOnboarding");
    localStorage.clear();
    if (hasViewedOnboarding) {
      localStorage.setItem("hasViewedOnboarding", hasViewedOnboarding);
    }
    debugLog("Disconnecting all wallets...");
    setSelectedChain("evm");
    disconnect();
    await evmDisconnect();
    disconnectBitcoinWallet(); // Disconnect Bitcoin wallet
    setBitcoinBalance({ value: 0n, formatted: "0" }); // Reset Bitcoin balance
    setIsModalOpen(false);
    debugLog("All wallets disconnected");
    setWalletAddress(null);
    const isVaultAddressPath = /^\/vaults\/0x[0-9a-fA-F]{40}$/;

    if (
      path !== "/" &&
      path !== "/leaderboard" &&
      path !== "/about" &&
      !isVaultAddressPath.test(path)
    ) {
      router.push("/");
    }
  }, [disconnect, evmDisconnect, disconnectBitcoinWallet, router, path]);

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
    setIsInitialized(true);

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

  // NEW: Bitcoin wallet state synchronization
  useEffect(() => {
    if (isBitcoinConnected && bitcoinWallet?.address) {
      console.log('[MultiChainProvider][DEBUG] Bitcoin wallet connected', { bitcoinWallet });
      // Set wallet address and chain
      setWalletAddress(bitcoinWallet.address);
      setSelectedChain("bitcoin");
      setActiveChain(chainConfigs[CHAIN_ID.bitcoin]);
      latestChainRef.current = CHAIN_ID.bitcoin.toString();
      // Fetch Bitcoin balance
      getBitcoinBalanceFormatted(bitcoinWallet.address);
      console.log('[MultiChainProvider][DEBUG] Bitcoin wallet state synchronized successfully');
    } else if (!isBitcoinConnected && selectedChain === "bitcoin") {
      console.log('[MultiChainProvider][DEBUG] Bitcoin wallet disconnected', { bitcoinWallet });
      // Clear Bitcoin-specific state
      setWalletAddress(null);
      setBitcoinBalance({ value: 0n, formatted: "0" });
      // Don't change selectedChain here to avoid conflicts with other wallets
    }
  }, [isBitcoinConnected, bitcoinWallet?.address, selectedChain, getBitcoinBalanceFormatted]);

  // Ensure bitcoinWallet is a valid object, not a boolean or null
  let safeBitcoinWallet = bitcoinWallet;
  if (typeof bitcoinWallet === 'boolean') {
    console.warn('[MultiChainProvider] bitcoinWallet should never be boolean! Forcing to null.');
    safeBitcoinWallet = null;
  } else if (typeof bitcoinWallet !== 'object' || bitcoinWallet === null) {
    if (bitcoinWallet) {
      console.warn('[MultiChainProvider] Invalid bitcoinWallet value detected:', bitcoinWallet);
    }
    safeBitcoinWallet = null;
  }

  // Add switchToChain implementation (move above providerValue)
  const switchToChain = useCallback(
    async (chain: Chain) => {
      try {
        if (chain.id === CHAIN_ID.solana) {
          setSelectedChain("solana");
          setActiveChain(chainConfigs[CHAIN_ID.solana]);
          latestChainRef.current = CHAIN_ID.solana.toString();
          return Promise.resolve();
        } else if (chain.id === CHAIN_ID.bitcoin) {
          if (!isBitcoinConnected || !bitcoinWallet?.address) {
            debugLog("Bitcoin chain selected but wallet not connected, triggering connection...");
            try {
              await connectBitcoinWallet('unisat');
              return Promise.resolve();
            } catch (error) {
              debugLog("Failed to connect Bitcoin wallet:", error);
              throw new Error("Failed to connect Bitcoin wallet");
            }
          } else {
            // Already connected, just switch to Bitcoin chain
            setSelectedChain("bitcoin");
            setActiveChain(chainConfigs[CHAIN_ID.bitcoin]);
            latestChainRef.current = CHAIN_ID.bitcoin.toString();
            return Promise.resolve();
          }
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
    [privyWallet, isBitcoinConnected, bitcoinWallet?.address, connectBitcoinWallet],
  );

  useEffect(() => {
    const isVaultAddressPath = /^\/vaults\/0x[0-9a-fA-F]{40}$/;

    if (!isVaultAddressPath.test(path) && selectedChainFromModal) {
      setSelectedChainFromModal(null);
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

  // NEW: Periodic Bitcoin balance refresh
  useEffect(() => {
    if (selectedChain === "bitcoin" && bitcoinWallet?.address) {
      // Initial balance fetch
      getBitcoinBalanceFormatted(bitcoinWallet.address);
      
      // Set up periodic refresh every 30 seconds
      const interval = setInterval(() => {
        getBitcoinBalanceFormatted(bitcoinWallet.address);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [selectedChain, bitcoinWallet?.address, getBitcoinBalanceFormatted]);

  // Debug log the provider value
  const providerValue = {
    selectedChain,
    activeChain: activeChain,
    walletAddress,
    balance: selectedChain === "solana" ? solanaBalance : selectedChain === "bitcoin" ? bitcoinBalance : balance,
    connectSolana,
    connectBitcoin,
    disconnectWallet,
    isModalOpen,
    setIsModalOpen,
    switchToChain,
    refetchBalance: selectedChain === "bitcoin" ? getBitcoinBalanceFormatted : getEvmBalance,
    isHydrated,
    evmDisconnect: evmDisconnect,
    // Bitcoin-specific properties
    bitcoinWallet: safeBitcoinWallet,
    bitcoinBalance,
  };
  
  // Log provider state changes
  console.log("🔄 MultiChain Provider State:", {
    selectedChain,
    activeChainId: activeChain?.id,
    walletAddress,
    bitcoinWallet: !!bitcoinWallet,
    bitcoinWalletAddress: bitcoinWallet?.address,
    isBitcoinConnected,
  });

  return (
    <MultiChainContext.Provider value={providerValue}>
      {children}
    </MultiChainContext.Provider>
  );
};
