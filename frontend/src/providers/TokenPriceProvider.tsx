import React, {createContext, PropsWithChildren, useContext, useEffect, useState} from "react";
import {fetchTokenPrices} from "@/utils/utils";
import {PRICE_IDS} from "@/constants/chainConfig";

type TokenPriceData = {
    [key: string]: number;
};

type TokenPriceByIdResult = {
    [priceId: string]: number;
};

type TokenPriceContextType = {
    prices: TokenPriceData;
    loading: boolean;
    error: string | null;
    updatePrices: () => Promise<void>;
};

const TokenPriceContext = createContext<TokenPriceContextType | undefined>(undefined);

export default function TokenPriceProvider({children}: PropsWithChildren) {
    const [prices, setPrices] = useState<TokenPriceData>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const updatePrices = async () => {
        setLoading(true);
        setError(null);

        try {
            const priceIds = Object.values(PRICE_IDS);
            const pricesByIdResult: TokenPriceByIdResult = await fetchTokenPrices(priceIds);

            const newPrices: TokenPriceData = {};
            Object.entries(PRICE_IDS).forEach(([symbol, priceId]) => {
                newPrices[symbol] = pricesByIdResult[priceId] || 0;
            });
            console.log("PRICESS ALLL", newPrices)
            setPrices(newPrices);
        } catch (error) {
            setError("Failed to fetch prices");
            console.error("Error updating prices:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        updatePrices();
        const interval = setInterval(updatePrices, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <TokenPriceContext.Provider value={{ prices, loading, error, updatePrices }}>
            {children}
        </TokenPriceContext.Provider>
    );
}

export const useTokenPrices = () => {
    const context = useContext(TokenPriceContext);
    if (context === undefined) {
        console.error("useTokenPrices must be used within a PriceProvider")
    }
    return context;
};
