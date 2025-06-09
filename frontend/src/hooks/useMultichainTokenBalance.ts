import { zeroSolAddress } from "@/constants/chainConfig";
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
import { useEffect, useState, useRef, useCallback } from "react";

export const useMultichainTokenBalance = (token: Token | undefined) => {
  const {
    walletAddress,
    activeChain,
    balance: nativeBalance,
    refetchBalance: refetchNativeBalance,
  } = useMultiChain();
  const [balance, setBalance] = useState<Balance>({
    value: 0n,
    formatted: "0",
  });

  // Keep track of previous chain to detect chain switches
  const prevChainRef = useRef<any>(null);
  // Keep track of retry attempts
  const retryCountRef = useRef(0);
  // Max number of retries
  const MAX_RETRIES = 3;

  const fetchBalance = useCallback(async () => {
    console.log('💰 [TOKEN-BALANCE] fetchBalance called', {
      walletAddress,
      token: token?.symbol,
      tokenAddress: token?.address,
      isNative: token?.isNative,
      activeChain: activeChain?.id,
      timestamp: new Date().toISOString()
    });
    
    refetchNativeBalance();
    try {
      if (!walletAddress || !token) {
        console.log('⚠️ [TOKEN-BALANCE] Missing wallet address or token', {
          walletAddress: !!walletAddress,
          token: !!token,
          timestamp: new Date().toISOString()
        });
        setBalance({
          value: 0n,
          formatted: "0",
        });
        return;
      }

      if (token.isNative) {
        console.log('🪙 [TOKEN-BALANCE] Using native balance', {
          nativeBalance: nativeBalance.formatted,
          timestamp: new Date().toISOString()
        });
        setBalance(nativeBalance);
        return;
      }

      if (isSolanaAddress(token.address) && isSolanaAddress(walletAddress)) {
        console.log('🌟 [TOKEN-BALANCE] Fetching Solana token balance...', {
          tokenAddress: token.address,
          timestamp: new Date().toISOString()
        });
        try {
          const { balance, decimals } = await getSplTokenBalance(
            walletAddress,
            token.address
          );
          const formattedBalance = {
            value: balance,
            formatted: format(balance, decimals),
          };
          console.log('✅ [TOKEN-BALANCE] Solana balance fetched', {
            balance: formattedBalance.formatted,
            timestamp: new Date().toISOString()
          });
          setBalance(formattedBalance);
        } catch (error) {
          console.error("Error fetching Solana token balance:", error);
          setBalance({ value: 0n, formatted: "0" });
        }
      } else if (
        isEthereumAddress(token.address) &&
        isEthereumAddress(walletAddress)
      ) {
        console.log('⚡ [TOKEN-BALANCE] Fetching EVM token balance...', {
          tokenAddress: token.address,
          chainId: activeChain?.id,
          timestamp: new Date().toISOString()
        });
        try {
          // Verify the token is supported on this chain before fetching balance
          if (!activeChain?.id) {
            console.warn("No active chain detected when fetching balance");
            setBalance({ value: 0n, formatted: "0" });
            return;
          }

          // Check if the token is in the APPROVED_TOKENS list for this chain
          const isTokenApproved = APPROVED_TOKENS[activeChain.id]?.some(
            (t: Token) =>
              t.address.toLowerCase() === token.address.toLowerCase()
          );

          if (!isTokenApproved) {
            console.warn(
              `Token ${token.symbol} (${token.address}) is not approved for chain ${activeChain.id}`
            );
            setBalance({ value: 0n, formatted: "0" });
            return;
          }

          const { balance, decimals } = await getERC20TokenBalance(
            walletAddress,
            token.address,
            activeChain
          );
          const formattedBalance = {
            value: balance,
            formatted: format(balance, decimals),
          };
          console.log('✅ [TOKEN-BALANCE] EVM balance fetched', {
            balance: formattedBalance.formatted,
            decimals,
            timestamp: new Date().toISOString()
          });
          setBalance(formattedBalance);

          // If we got a valid balance, reset retry count
          if (balance > 0n) {
            retryCountRef.current = 0;
          }
        } catch (error) {
          console.error("Error fetching EVM token balance:", error);
          setBalance({ value: 0n, formatted: "0" });
        }
      }
    } catch (error) {
      console.error("Error in fetchBalance:", error);
      setBalance({ value: 0n, formatted: "0" });
    }
  }, [token?.address, token?.symbol, token?.isNative, walletAddress, activeChain?.id, nativeBalance.formatted]);

  useEffect(() => {
    // Detect if chain has changed
    const hasChainSwitched =
      prevChainRef.current &&
      activeChain &&
      prevChainRef.current.id !== activeChain.id;

    // Update the previous chain reference
    prevChainRef.current = activeChain;

    if (hasChainSwitched) {
      console.log(
        `Chain switched from ${prevChainRef.current?.id} to ${activeChain?.id}. Resetting retry count.`
      );
      retryCountRef.current = 0;
    }

    // Execute initial fetch only when dependencies change (not when balance changes)
    fetchBalance();
  }, [token?.address, walletAddress, activeChain?.id, fetchBalance]);

  return { balance, fetchBalance };
};
