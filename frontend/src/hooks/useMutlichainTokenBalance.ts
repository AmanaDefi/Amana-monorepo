import { zeroSolAddress } from "@/constants/chainConfig";
import { APPROVED_TOKENS } from "@/constants/chainConfig";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { Balance, Token } from "@/types/types"
import { getERC20TokenBalance, getSplTokenBalance, isEthereumAddress, isSolanaAddress, solanaConnection } from "@/utils/utils";
import { useEffect, useState, useRef } from "react"

export const useMutlichainTokenBalance = (token: Token | undefined) => {
    const { walletAddress, activeChain, balance: nativeBalance } = useMultiChain();
    const [balance, setBalance] = useState<Balance>({
        value: 0n,
        formatted: "0"
    });
    
    // Keep track of previous chain to detect chain switches
    const prevChainRef = useRef<any>(null);
    // Keep track of retry attempts
    const retryCountRef = useRef(0);
    // Max number of retries
    const MAX_RETRIES = 3;

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                if (!walletAddress || !token) {
                    setBalance({
                        value: 0n,
                        formatted: "0"
                    })
                    return;
                }

                if (token.isNative) {
                    setBalance(nativeBalance);
                    return;
                }

                if (isSolanaAddress(token.address) && isSolanaAddress(walletAddress)) {
                    try {
                        const { balance, decimals } = await getSplTokenBalance(walletAddress, token.address);
                        setBalance({
                            value: balance,
                            formatted: (balance / 10 ** decimals).toFixed(4)
                        });
                    } catch (error) {
                        console.error("Error fetching Solana token balance:", error);
                        setBalance({ value: 0n, formatted: "0" });
                    }
                } else if (isEthereumAddress(token.address) && isEthereumAddress(walletAddress)) {
                    try {
                        // Verify the token is supported on this chain before fetching balance
                        if (!activeChain?.id) {
                            console.warn("No active chain detected when fetching balance");
                            setBalance({ value: 0n, formatted: "0" });
                            return;
                        }
                        
                        // Check if the token is in the APPROVED_TOKENS list for this chain
                        const isTokenApproved = APPROVED_TOKENS[activeChain.id]?.some(
                            (t: Token) => t.address.toLowerCase() === token.address.toLowerCase()
                        );
                        
                        if (!isTokenApproved) {
                            console.warn(`Token ${token.symbol} (${token.address}) is not approved for chain ${activeChain.id}`);
                            setBalance({ value: 0n, formatted: "0" });
                            return;
                        }
                        
                        const { balance, decimals } = await getERC20TokenBalance(walletAddress, token.address, activeChain);
                        setBalance({
                            value: balance,
                            formatted: (Number(balance) / 10 ** decimals).toFixed(4)
                        });
                        
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
        }

        // Detect if chain has changed
        const hasChainSwitched = prevChainRef.current && activeChain && prevChainRef.current.id !== activeChain.id;
        
        // Update the previous chain reference
        prevChainRef.current = activeChain;
        
        if (hasChainSwitched) {
            console.log(`Chain switched from ${prevChainRef.current?.id} to ${activeChain?.id}. Resetting retry count.`);
            retryCountRef.current = 0;
        }

        // Execute initial fetch
        fetchBalance();
        
        // If we have zero balance after a chain switch, retry with increasing delays
        if ((hasChainSwitched || retryCountRef.current > 0) && 
            balance.value === 0n && 
            retryCountRef.current < MAX_RETRIES) {
            
            const retryDelay = 1000 * (retryCountRef.current + 1); // Increasing delay: 1s, 2s, 3s...
            retryCountRef.current += 1;
            
            console.log(`Scheduling retry #${retryCountRef.current} for token balance fetch in ${retryDelay}ms`);
            
            const timeoutId = setTimeout(() => {
                console.log(`Executing retry #${retryCountRef.current} for token balance fetch`);
                fetchBalance();
            }, retryDelay);
            
            return () => clearTimeout(timeoutId);
        }
    }, [token, walletAddress, activeChain, nativeBalance, balance.value]);

    return balance
}