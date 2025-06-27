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
import { useEffect, useState, useCallback, useMemo } from "react";

const DEFAULT_BALANCE: Balance = { value: 0n, formatted: "0" };

export const useTokenBalanceForModal = (
  token: Token | undefined,
  forceRefresh?: number,
): {
  balance: Balance;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} => {
  const currentToken = useMemo(() => token, [token]);

  const {
    walletAddress,
    activeChain,
    refetchBalance: refetchNativeBalance,
  } = useMultiChain();

  const [balance, setBalance] = useState<Balance>(DEFAULT_BALANCE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchKey, setLastFetchKey] = useState<string>("");

  const internalFetchBalance = useCallback(async () => {
    if (!currentToken || !walletAddress || !activeChain?.id) {
      setBalance(DEFAULT_BALANCE);
      setIsLoading(false);
      return;
    }

    const fetchKey = `${currentToken.address.toLowerCase()}-${walletAddress}-${activeChain.id}-${forceRefresh || 0}`;

    if (fetchKey === lastFetchKey) {
      return;
    }

    console.log(
      "🔄 Fetching balance for",
      currentToken.symbol,
      "on chain",
      activeChain.id,
    );

    setIsLoading(true);
    setError(null);

    try {
      if (currentToken.isNative) {
        const nativeBalance = await refetchNativeBalance(walletAddress);
        setBalance(nativeBalance ?? DEFAULT_BALANCE);
      } else if (
        isSolanaAddress(currentToken.address) &&
        isSolanaAddress(walletAddress)
      ) {
        try {
          const { balance: solBalance, decimals } = await getSplTokenBalance(
            walletAddress,
            currentToken.address,
          );
          setBalance({
            value: solBalance,
            formatted: format(solBalance, decimals),
          });
        } catch (error) {
          console.error("Error fetching Solana token balance:", error);
          setBalance(DEFAULT_BALANCE);
        }
      } else if (
        isEthereumAddress(currentToken.address) &&
        isEthereumAddress(walletAddress)
      ) {
        const isTokenApproved = APPROVED_TOKENS[activeChain.id]?.some(
          (t: Token) =>
            t.address.toLowerCase() === currentToken.address.toLowerCase(),
        );

        if (!isTokenApproved) {
          console.warn(
            `Token ${currentToken.symbol} not approved for chain ${activeChain.id}, setting balance to 0`,
          );
          setBalance(DEFAULT_BALANCE);
        } else {
          try {
            const { balance: ercBalance, decimals } =
              await getERC20TokenBalance(
                walletAddress,
                currentToken.address,
                activeChain,
              );
            setBalance({
              value: ercBalance,
              formatted: format(ercBalance, decimals),
            });
          } catch (error) {
            console.error("Error fetching EVM token balance:", error);
            setBalance(DEFAULT_BALANCE);
          }
        }
      }

      setLastFetchKey(fetchKey);
    } catch (error) {
      console.error("Error fetching token balance:", error);
      setBalance(DEFAULT_BALANCE);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentToken,
    walletAddress,
    activeChain,
    refetchNativeBalance,
    forceRefresh,
    lastFetchKey,
  ]);

  useEffect(() => {
    setBalance(DEFAULT_BALANCE);
    setError(null);
    setLastFetchKey("");
  }, [currentToken?.address, walletAddress, activeChain?.id, forceRefresh]);

  useEffect(() => {
    if (currentToken && walletAddress && activeChain?.id) {
      internalFetchBalance();
    }
  }, [internalFetchBalance]);

  const manualRefetch = useCallback(() => {
    setError(null);
    setBalance(DEFAULT_BALANCE);
    setLastFetchKey("");
    internalFetchBalance();
  }, [internalFetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refetch: manualRefetch,
  };
};
