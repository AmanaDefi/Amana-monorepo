import { APPROVED_TOKENS, CHAIN_ID } from "@/constants/chainConfig";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { Balance, Token } from "@/types/types";
import {
  format,
  getERC20TokenBalance,
  getSplTokenBalance,
  isEthereumAddress,
  isSolanaAddress,
} from "@/utils/utils";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import useSolanaBalance from "./useSolanaBalance";
import { getPublicClient } from "@/utils/getPublicClient";
import { formatEther } from "viem";

const DEFAULT_BALANCE: Balance = { value: 0n, formatted: "0" };

export const useMultichainTokenBalance = (token: Token | undefined) => {
  const currentToken = useMemo(() => token, [token]);
  const { balance: solanaBalance, refetch } = useSolanaBalance();

  const { walletAddress, activeChain } = useMultiChain();

  const [balance, setBalance] = useState<Balance>(DEFAULT_BALANCE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const prevChainIdRef = useRef<number | string | undefined>(undefined);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  console.log(activeChain?.id);

  const internalFetchBalance = useCallback(async () => {
    console.log(
      "internalFetchBalance",
      activeChain?.id,
      currentToken,
      walletAddress,
    );
    if (!currentToken || !walletAddress || !activeChain?.id) {
      setBalance(DEFAULT_BALANCE);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      if (currentToken.isNative) {
        let updatedBalance = DEFAULT_BALANCE;
        if (activeChain?.id !== CHAIN_ID["solana"]) {
          try {
            const publicClient = getPublicClient(activeChain?.id);
            if (!publicClient) {
              updatedBalance = DEFAULT_BALANCE;
            } else {
              const balanceInEth = await publicClient.getBalance({
                address: walletAddress,
              });

              const formattedBalance = formatEther(balanceInEth);
              updatedBalance = balanceInEth
                ? { formatted: formattedBalance, value: balanceInEth }
                : DEFAULT_BALANCE;
            }
          } catch {
            updatedBalance = DEFAULT_BALANCE;
          }
          console.log("updatedBalance native", updatedBalance, activeChain?.id);
        } else {
          await refetch();
          updatedBalance = solanaBalance;
        }

        console.log("setBalance native", updatedBalance);
        setBalance(updatedBalance ?? { value: 0n, formatted: "0" });
        setIsLoading(false);
        retryCountRef.current = 0;
        return;
      }

      let newBalance: Balance | null = null;
      if (
        isSolanaAddress(currentToken.address) &&
        isSolanaAddress(walletAddress)
      ) {
        try {
          const { balance, decimals } = await getSplTokenBalance(
            walletAddress,
            currentToken.address,
          );
          newBalance = {
            value: balance,
            formatted: format(balance, decimals),
          };
        } catch (error) {
          setBalance({ value: 0n, formatted: "0" });
          setIsLoading(false);
        }
      } else if (
        isEthereumAddress(currentToken.address) &&
        isEthereumAddress(walletAddress)
      ) {
        // Verify the token is supported on this chain before fetching balance
        if (!activeChain?.id) {
          console.warn("No active chain detected when fetching balance");
          setBalance({ value: 0n, formatted: "0" });
          return;
        }

        // Check if the token is in the APPROVED_TOKENS list for this chain
        const isTokenApproved = APPROVED_TOKENS[activeChain?.id]?.some(
          (t: Token) =>
            t.address.toLowerCase() === currentToken.address.toLowerCase(),
        );

        if (!isTokenApproved) {
          console.warn(
            `Token ${currentToken.symbol} (${currentToken.address}) is not approved for chain ${activeChain?.id}`,
          );
          newBalance = DEFAULT_BALANCE;
        } else {
          try {
            const { balance: ercBalance, decimals } =
              await getERC20TokenBalance(
                walletAddress,
                currentToken.address,
                activeChain,
              );
            newBalance = {
              value: ercBalance,
              formatted: format(ercBalance, decimals),
            };

            // If we got a valid balance, reset retry count
            if (newBalance) {
              setBalance(newBalance);
              if (newBalance.value >= 0n && !error) {
                retryCountRef.current = 0;
              }
            } else {
              setBalance(DEFAULT_BALANCE);
            }
          } catch (error) {
            console.error("Error fetching EVM token balance:", error);
            setBalance({ value: 0n, formatted: "0" });
            setIsLoading(false);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching Native token balance:", error);
      setBalance({ value: 0n, formatted: "0" });
      setIsLoading(false);
    }
  }, [currentToken, walletAddress, activeChain, error, refetch]);

  useEffect(() => {
    const currentChainId = activeChain?.id;
    const hasChainSwitched =
      prevChainIdRef.current !== undefined &&
      prevChainIdRef.current !== currentChainId;

    if (hasChainSwitched) {
      retryCountRef.current = 0;
    }
    prevChainIdRef.current = currentChainId;

    if (currentToken && walletAddress && activeChain?.id) {
      internalFetchBalance();
    } else {
      setBalance(DEFAULT_BALANCE);
      setIsLoading(false);
    }
  }, [currentToken, walletAddress, activeChain, internalFetchBalance]);

  useEffect(() => {
    if (
      currentToken &&
      !currentToken.isNative &&
      walletAddress &&
      activeChain?.id &&
      balance.value === 0n &&
      !isLoading &&
      !error &&
      retryCountRef.current > 0 &&
      retryCountRef.current <= MAX_RETRIES
    ) {
      const retryDelay = 1000 * Math.pow(2, retryCountRef.current - 1);
      console.log(
        `Balance is zero. Scheduling retry #${retryCountRef.current} for ${currentToken.symbol} in ${retryDelay}ms on chain ${activeChain?.id}`,
      );

      const timeoutId = setTimeout(() => {
        console.log(
          `Executing retry #${retryCountRef.current} for ${currentToken.symbol} on chain ${activeChain?.id}`,
        );
        internalFetchBalance();
        retryCountRef.current += 1;
      }, retryDelay);

      return () => clearTimeout(timeoutId);
    }

    if (
      retryCountRef.current > 0 &&
      (balance.value > 0n || error || isLoading)
    ) {
      retryCountRef.current = 0;
    }
  }, [
    balance.value,
    currentToken,
    walletAddress,
    activeChain,
    isLoading,
    error,
    internalFetchBalance,
  ]);

  const manualRefetchBalance = useCallback(() => {
    if (currentToken && walletAddress && activeChain?.id) {
      console.log("manual fetch");
      retryCountRef.current = 0;
      internalFetchBalance();
    }
  }, [currentToken, walletAddress, activeChain, internalFetchBalance]);

  return { balance, isLoading, fetchBalance: manualRefetchBalance };
};
