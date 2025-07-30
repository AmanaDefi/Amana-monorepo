import { APPROVED_TOKENS } from "@/constants/chainConfig";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { Balance, Token } from "@/types/types";
import {
  format,
  getERC20TokenBalance,
  getSplTokenBalance,
  isEthereumAddress,
  isSolanaAddress,
} from "@/utils/utils";
import { Chain } from "viem";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useWallets } from "@privy-io/react-auth";
import useSolanaBalance from "./useSolanaBalance";

const DEFAULT_BALANCE: Balance = { value: 0n, formatted: "0" };

export const useMultichainTokenBalanceForModal = (
  token: Token | undefined,
  targetChain: Chain | undefined,
  customWalletAddress?: string,
) => {
  const currentToken = useMemo(() => token, [token]);
  const currentChain = useMemo(() => targetChain, [targetChain]);

  const { walletAddress: defaultWalletAddress, selectedChain } =
    useMultiChain();

  const walletAddress = customWalletAddress || defaultWalletAddress;

  const { balance: solanaBalance, refetch: refetchSolBalance } =
    useSolanaBalance();

  const [balance, setBalance] = useState<Balance>(DEFAULT_BALANCE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const prevChainIdRef = useRef<number | string | undefined>(undefined);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Auto-set Solana balance for Solana chains
 useEffect(() => {
   if (currentChain?.name === "Solana" && currentToken?.isNative) {
     setBalance(solanaBalance);
   }
 }, [currentChain?.name, currentToken?.isNative, solanaBalance.formatted]);

  const internalFetchBalance = useCallback(async () => {
    console.log("internalFetchBalance");

    // Early validation
    if (!currentToken || !walletAddress || !currentChain?.id) {
      setBalance(DEFAULT_BALANCE);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Handle native tokens
      if (currentToken.isNative) {
        if (currentChain.name === "Solana") {
          refetchSolBalance();
        } else {
          try {
            const { getPublicClient } = await import("@/utils/getPublicClient");
            const { formatEther } = await import("viem");

            const publicClient = getPublicClient(currentChain.id);

            if (publicClient) {
              const nativeBalance = await publicClient.getBalance({
                address: walletAddress as `0x${string}`,
              });

              const formattedBalance = formatEther(nativeBalance);

              setBalance({
                value: nativeBalance,
                formatted: formattedBalance,
              });
            } else {
              setBalance(DEFAULT_BALANCE);
            }
          } catch (error) {
            console.error("Error fetching EVM native balance:", error);
            setBalance(DEFAULT_BALANCE);
          }
        }

        setIsLoading(false);
        retryCountRef.current = 0;
        return;
      }

      // Handle non-native tokens
      let newBalance: Balance | null = null;

      // Solana SPL tokens
      if (
        isSolanaAddress(currentToken.address) &&
        isSolanaAddress(walletAddress)
      ) {
        try {
          const splResult = await getSplTokenBalance(
            walletAddress,
            currentToken.address,
          );

          newBalance = {
            value: splResult.balance,
            formatted: format(splResult.balance, splResult.decimals),
          };
        } catch (error) {
          console.error("Error fetching Solana SPL balance:", error);
          setBalance({ value: 0n, formatted: "0" });
          setIsLoading(false);
          return;
        }
      }
      // Ethereum ERC-20 tokens
      else if (
        isEthereumAddress(currentToken.address) &&
        isEthereumAddress(walletAddress)
      ) {
        // Check if token is approved for this chain
        const approvedTokens = APPROVED_TOKENS[currentChain.id];
        const isTokenApproved = approvedTokens?.some(
          (t: Token) =>
            t.address.toLowerCase() === currentToken.address.toLowerCase(),
        );

        if (!isTokenApproved) {
          console.warn(
            `Token ${currentToken.symbol} not approved for chain ${currentChain.id}`,
          );
          newBalance = DEFAULT_BALANCE;
        } else {
          try {
            const ercResult = await getERC20TokenBalance(
              walletAddress,
              currentToken.address,
              currentChain,
            );

            newBalance = {
              value: ercResult.balance,
              formatted: format(ercResult.balance, ercResult.decimals),
            };
          } catch (error) {
            console.error("Error fetching ERC-20 balance:", error);
            setBalance({ value: 0n, formatted: "0" });
            setIsLoading(false);
            return;
          }
        }
      }

      if (newBalance) {
        setBalance(newBalance);
        retryCountRef.current = 0;
      } else {
        setBalance(DEFAULT_BALANCE);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error in fetchBalance:", error);
      setBalance({ value: 0n, formatted: "0" });
      setIsLoading(false);
      setError(error instanceof Error ? error.message : "Unknown error");
    }
  }, [currentToken, walletAddress, currentChain, refetchSolBalance]);

  useEffect(() => {
    console.log("set balance use effect");
    const currentChainId = currentChain?.id;
    const hasChainSwitched =
      prevChainIdRef.current !== undefined &&
      prevChainIdRef.current !== currentChainId;

    if (hasChainSwitched) {
      retryCountRef.current = 0;
      setBalance(DEFAULT_BALANCE);
    }
    prevChainIdRef.current = currentChainId;

    if (currentToken && walletAddress && currentChain?.id) {
      internalFetchBalance();
    } else {
      setBalance(DEFAULT_BALANCE);
      setIsLoading(false);
    }
  }, [currentToken, walletAddress, currentChain, internalFetchBalance]);

  const manualRefetchBalance = useCallback(() => {
    console.log("manualRefetchBalance");
    if (currentToken && walletAddress && currentChain?.id) {
      retryCountRef.current = 0;
      internalFetchBalance();
    }
  }, [currentToken, walletAddress, currentChain, internalFetchBalance]);

  return { balance, isLoading, fetchBalance: manualRefetchBalance };
};
