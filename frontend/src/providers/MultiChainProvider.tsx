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
import useSolanaBalance from "@/hooks/useSolanaBalance";
import { Chain } from "thirdweb";
import { Balance } from "@/types/types";
import { format } from "@/utils/utils";
import { EMPTY_BALANCE } from "@/utils/helpers";
import { wallets } from "@/constants/wallets";
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
        if (activeAccount) evmDisconnect(activeAccount);
      }
      setVisible(true);
      setSelectedChain("solana");
    } catch (error) {
      console.error("Solana connection error:", error);
    }
  }, [selectedChain, activeAccount, evmDisconnect, setVisible]);
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
  }, [chain, disconnect, connect]);

  //  Disconnect Wallet
  const disconnectWallet = useCallback(async () => {
    setWalletAddress(null);
    setSelectedChain(null);
    disconnect();
    if (activeAccount) evmDisconnect(activeAccount);
    setIsModalOpen(false);
  }, [disconnect, activeAccount, evmDisconnect]);

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
    if (activeChain?.id === CHAIN_ID.ethereum) {
      refetchEthBalance();
    } else if (activeChain?.id === CHAIN_ID.solana) {
      refetchSolBalance();
    }
  };

  useEffect(() => {
    if (!account && !publicKey) {
      disconnectWallet();
      setIsModalOpen(true);
    } else if (publicKey) {
      setWalletAddress(publicKey.toBase58());
      setIsModalOpen(false);
    } else if (account) {
      setWalletAddress(account.address);
      setIsModalOpen(false);
    }
  }, [account, publicKey, disconnectWallet]);

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
    [activeAccount],
  );

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
      }}
    >
      {children}
    </MultiChainContext.Provider>
  );
};
