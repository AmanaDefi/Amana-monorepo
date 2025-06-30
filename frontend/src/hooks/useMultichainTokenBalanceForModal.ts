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

const DEFAULT_BALANCE: Balance = { value: 0n, formatted: "0" };

export const useMultichainTokenBalanceForModal = (
  token: Token | undefined,
  targetChain: Chain | undefined,
) => {
  const currentToken = useMemo(() => token, [token]);
  const currentChain = useMemo(() => targetChain, [targetChain]);

  const { walletAddress, refetchBalance: refetchNativeBalance } =
    useMultiChain();

  const [balance, setBalance] = useState<Balance>(DEFAULT_BALANCE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const prevChainIdRef = useRef<number | string | undefined>(undefined);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  const internalFetchBalance = useCallback(async () => {
    console.log("💰 [MODAL-TOKEN-BALANCE] fetchBalance called", {
      walletAddress,
      token: token?.symbol,
      tokenAddress: token?.address,
      isNative: token?.isNative,
      targetChain: currentChain?.id,
      timestamp: new Date().toISOString(),
    });

    if (!currentToken || !walletAddress || !currentChain?.id) {
      console.log(
        "⚠️ [MODAL-TOKEN-BALANCE] Missing wallet address, token, or chain",
        {
          walletAddress: !!walletAddress,
          token: !!token,
          chain: !!currentChain,
          timestamp: new Date().toISOString(),
        },
      );
      setBalance(DEFAULT_BALANCE);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (currentToken.isNative) {
        console.log(
          "🪙 [MODAL-TOKEN-BALANCE] Fetching native balance for specific chain",
          {
            chainId: currentChain.id,
            chainName: currentChain.name,
            timestamp: new Date().toISOString(),
          },
        );

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
            console.warn(
              "No public client available for chain:",
              currentChain.id,
            );
            setBalance(DEFAULT_BALANCE);
          }
        } catch (error) {
          console.error(
            "Error fetching native balance for chain:",
            currentChain.id,
            error,
          );
          setBalance(DEFAULT_BALANCE);
        }

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
          console.error("Error fetching Solana token balance:", error);
          setBalance({ value: 0n, formatted: "0" });
          setIsLoading(false);
        }
      } else if (
        isEthereumAddress(currentToken.address) &&
        isEthereumAddress(walletAddress)
      ) {
        // Verify the token is supported on this chain before fetching balance
        if (!currentChain?.id) {
          console.warn("No target chain detected when fetching balance");
          setBalance({ value: 0n, formatted: "0" });
          return;
        }

        // Check if the token is in the APPROVED_TOKENS list for this chain
        const isTokenApproved = APPROVED_TOKENS[currentChain.id]?.some(
          (t: Token) =>
            t.address.toLowerCase() === currentToken.address.toLowerCase(),
        );

        if (!isTokenApproved) {
          console.warn(
            `Token ${currentToken.symbol} (${currentToken.address}) is not approved for chain ${currentChain.id}`,
          );
          newBalance = DEFAULT_BALANCE;
        } else {
          try {
            const { balance: ercBalance, decimals } =
              await getERC20TokenBalance(
                walletAddress,
                currentToken.address,
                currentChain,
              );
            newBalance = {
              value: ercBalance,
              formatted: format(ercBalance, decimals),
            };

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

      if (newBalance && newBalance !== balance) {
        setBalance(newBalance);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching token balance:", error);
      setBalance({ value: 0n, formatted: "0" });
      setIsLoading(false);
    }
  }, [currentToken, walletAddress, currentChain, error, refetchNativeBalance]);

  useEffect(() => {
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
    if (currentToken && walletAddress && currentChain?.id) {
      retryCountRef.current = 0;
      internalFetchBalance();
    }
  }, [currentToken, walletAddress, currentChain, internalFetchBalance]);

  return { balance, isLoading, fetchBalance: manualRefetchBalance };
};
