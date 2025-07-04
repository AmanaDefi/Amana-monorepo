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
import { Chain, formatEther, WalletClient } from "viem";
import { getPublicClient, getWalletClient } from "@/utils/getPublicClient";
import { usePathname, useRouter } from "next/navigation";
import { PREVIOUS_ADDRESS } from "@/hooks/hooks";
import { useConnect } from "wagmi";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { zetachain } from "viem/chains";
import { useFundWalletStore } from "@/store/fundWalletStore";
import { useTemporaryBitcoinWallet } from "@/hooks/useBitcoinWallet";
import { getBitcoinBalance } from "@/actions/bitcoinActions";
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

  const [selectedChain, setSelectedChain] = useState<ChainType | null>("evm");
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
    if (!!wallets?.length) {
      wallets.forEach(async (wallet) => {
        await connectors
          ?.find(
            (con) =>
              con.id === wallet.meta.id ||
              (con.id === "walletConnect" &&
                wallet.connectorType.includes("wallet_connect")),
          )
          ?.disconnect();
      });
    }
  }, [connectors, wallets]);

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
      activeChain?.id === CHAIN_ID["solana"]
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
  }, [path, activeChain, privyWallet, publicKey, selectedChainFromModal]);

  const evmDisconnect = useCallback(async () => {
    try {
      await disconnectConnectors();
    } finally {
      await logout();
    }
  }, [logout, disconnectConnectors]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (selectedChain == "solana") {
      setActiveChain(chainConfigs[CHAIN_ID.solana]);
      latestChainRef.current = CHAIN_ID.solana.toString();
      return;
    } else if (selectedChain === "bitcoin") {
      setActiveChain(chainConfigs[CHAIN_ID.bitcoin]);
      latestChainRef.current = CHAIN_ID.bitcoin.toString();
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
      setSelectedChain("bitcoin");
      
      debugLog("Bitcoin wallet connected successfully");
    } catch (error) {
      console.error("Bitcoin connection error:", error);
      throw error;
    }
  };

  // Get Bitcoin balance
  const getBitcoinBalanceFormatted = useCallback(async (address: string) => {
    if (!bitcoinWallet) return { value: 0n, formatted: "0" };
    
    try {
      const balanceInSatoshis = await getBitcoinBalance(bitcoinWallet);
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
    if (privyWallet?.address && connected && !latestChainRef.current && !step) {
      disconnect();
    }
    if (
      privyWallet?.address &&
      activeChain?.id.toString() !== privyWallet?.chainId?.split(":")[1]
    ) {
      if (!step) {
        setWalletAddress(privyWallet?.address);
        setSelectedChain("evm");

        if (wallets.length > 1 && user?.wallet) {
          disconnectConnectors();
        }

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
          privyWallet?.chainId &&
          activeChain?.id &&
          privyWallet?.walletClientType !== "privy" &&
          activeChain?.id.toString() !== privyWallet?.chainId?.split(":")[1] &&
          activeChain?.id !== CHAIN_ID["solana"]
        ) {
          privyWallet?.switchChain(activeChain.id);
        }
      }

      if (connected) {
        disconnect().catch((err) => {
          console.error("error disconnect Solana:", err);
        });
      }
    } else if (!privyWallet?.address && !connected && !isBitcoinConnected) {
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
    isBitcoinConnected,
  ]);

  // Handle Bitcoin wallet state changes
  useEffect(() => {
    if (isBitcoinConnected && bitcoinWallet?.address) {
      if (!step) {
        debugLog("Bitcoin wallet connected:", bitcoinWallet.address);
        setWalletAddress(bitcoinWallet.address);
        setSelectedChain("bitcoin");
        setIsModalOpen(false);
        
        // Fetch Bitcoin balance
        getBitcoinBalanceFormatted(bitcoinWallet.address);
      }
      
      // Disconnect other wallets when Bitcoin connects
      if (connected) {
        disconnect().catch((err) => {
          console.error("error disconnect Solana:", err);
        });
      }
      if (privyWallet?.address) {
        evmDisconnect().catch((err) => {
          console.error("error disconnect EVM:", err);
        });
      }
    } else if (!isBitcoinConnected && selectedChain === "bitcoin") {
      debugLog("Bitcoin wallet disconnected");
      setBitcoinBalance({ value: 0n, formatted: "0" });
    }
  }, [
    isBitcoinConnected,
    bitcoinWallet,
    step,
    connected,
    disconnect,
    privyWallet,
    evmDisconnect,
    selectedChain,
    getBitcoinBalanceFormatted,
  ]);

  //  Disconnect Wallet
  const disconnectWallet = useCallback(async () => {
    const hasViewedOnboarding = localStorage.getItem("hasViewedOnboarding");
    localStorage.clear();
    if (hasViewedOnboarding) {
      localStorage.setItem('hasViewedOnboarding', hasViewedOnboarding)
    }
    debugLog("Disconnecting all wallets...");
    setWalletAddress(null);
    setSelectedChain("evm");
    disconnect();
    await evmDisconnect();
    disconnectBitcoinWallet(); // Disconnect Bitcoin wallet
    setBitcoinBalance({ value: 0n, formatted: "0" }); // Reset Bitcoin balance
    setIsModalOpen(false);
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
  }, [disconnect, evmDisconnect, disconnectBitcoinWallet, router, path]);

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
    setIsInitialized(true);

    if (publicKey) {
      setWalletAddress(publicKey.toBase58());
      setSelectedChain("solana");
      if (step) {
        setFundWalletAddress(publicKey.toBase58());
      }
    } else if (privyWallet?.address) {
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
    isBitcoinConnected,
    bitcoinWallet,
  ]);

  const switchToChain = useCallback(
    async (chain: Chain) => {
      try {
        if (chain.id === CHAIN_ID.solana) {
          setSelectedChain("solana");
          setActiveChain(chainConfigs[CHAIN_ID.solana]);
          latestChainRef.current = CHAIN_ID.solana.toString();
          return Promise.resolve(); // Resolve immediately for Solana
        } else if (chain.id === CHAIN_ID.bitcoin) {
          setSelectedChain("bitcoin");
          setActiveChain(chainConfigs[CHAIN_ID.bitcoin]);
          latestChainRef.current = CHAIN_ID.bitcoin.toString();
          return Promise.resolve(); // Resolve immediately for Bitcoin
        } else {
          // For EVM chains, we need to request the wallet to switch chains
          try {
            // This will prompt the user's wallet to switch chains
            if (privyWallet && privyWallet?.walletClientType !== "privy") {
              privyWallet?.switchChain(chain.id);
            }

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
        bitcoinWallet,
        bitcoinBalance,
      }}
    >
      {children}
    </MultiChainContext.Provider>
  );
};
