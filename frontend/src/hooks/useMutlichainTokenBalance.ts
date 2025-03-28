import { zeroSolAddress } from "@/constants/chainConfig";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { Balance, Token } from "@/types/types"
import { getERC20TokenBalance, getSplTokenBalance, isEthereumAddress, isSolanaAddress, solanaConnection } from "@/utils/utils";
import { useEffect, useState } from "react"

export const useMutlichainTokenBalance = (token: Token | undefined) => {
    const { walletAddress, activeChain, balance: nativeBalance } = useMultiChain();
    const [balance, setBalance] = useState<Balance>({
        value: 0n,
        formatted: "0"
    });

    useEffect(() => {
        const fetchBalance = async () => {
            if (!walletAddress || !token) {
                setBalance({
                    value: 0n,
                    formatted: "0"
                })
                return;
            }

            if (token.isNative) {
                const decimals = token.address == zeroSolAddress ? 9 : 18;
                setBalance(nativeBalance);
                return;
            }

            if (isSolanaAddress(token.address) && isSolanaAddress(walletAddress)) {
                const { balance, decimals } = await getSplTokenBalance(walletAddress, token.address);
                setBalance({
                    value: balance,
                    formatted: (balance / 10 ** decimals).toFixed(4)
                })
            } else if (isEthereumAddress(token.address) && isEthereumAddress(walletAddress)) {
                const { balance, decimals } = await getERC20TokenBalance(walletAddress, token.address, activeChain);
                setBalance({
                    value: balance,
                    formatted: (Number(balance) / 10 ** decimals).toFixed(4)
                })
            }
        }
        fetchBalance();
    }, [token, walletAddress]);

    return balance
}