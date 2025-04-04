import getWalletAssets from "@/service/alchemy";
import { Token } from "@/types/types";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";

const staticTokenList: Array<Token> = [
    {
        name: "Amana",
        address: "0x0000000000000000000000000000000000000001",
        symbol: "Amana",
        decimals: 18,
        imgURL: "/logo/amanadefi/logo-light.svg",
        price: 0,
        balance: {
            value: 0n,
            formatted: "0",
            formattedUSD: "0",
        },
        isNative: false,
        ZRC20equivalent: "0x0000000000000000000000000000000000000001"
    }
]
export const useAbstractAccount = () => {
    const [walletPriceUSD, setWalletPriceUSD] = useState<number>(0);
    const wallet = useActiveAccount();
    const {data: tokens, error, isLoading} = useQuery({
        queryKey: ["tokens", wallet?.address],
        queryFn: async () => {
            if (wallet?.address) {
                return await getWalletAssets(wallet?.address!);
            } else return []
        }
    }
    )

    return {
        walletPriceUSD,
        tokens
    }
}