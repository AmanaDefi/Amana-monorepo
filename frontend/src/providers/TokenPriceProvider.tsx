"use client"

import React, {createContext, PropsWithChildren, useContext, useEffect, useState} from "react";
import {fetchTokenPrices} from "@/utils/utils";
import {PRICE_IDS} from "@/constants/chainConfig";
import {ONE_MINUTE} from "@/constants";

type TokenPriceData = {
    [key: string]: number;
};

type TokenPriceByIdResult = {
    [priceId: string]: number;
};

export type TokenPriceContextType = {
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
                // Store price for the exact symbol
                newPrices[symbol] = pricesByIdResult[priceId] || 0;

                // For chain-specific tokens in "(CHAIN)" format, also store as "CHAIN.ETH" format
                if (symbol.includes(' (')) {
                    const baseSymbol = symbol.split(' (')[0];
                    const chain = symbol.match(/\((.*?)\)/)?.[1];

                    // Store base symbol price if not already set or current value is 0
                    if (!newPrices[baseSymbol] || newPrices[baseSymbol] === 0) {
                        newPrices[baseSymbol] = pricesByIdResult[priceId] || 0;
                    }

                    // Also store in "TOKEN.CHAIN" format for compatibility
                    if (chain) {
                        const dotFormat = `${baseSymbol}.${chain}`;
                        newPrices[dotFormat] = pricesByIdResult[priceId] || 0;
                    }
                }

                // For chain-specific tokens in "TOKEN.CHAIN" format, also store as "TOKEN (CHAIN)" format
                if (symbol.includes('.')) {
                    const [baseSymbol, chain] = symbol.split('.');

                    // Store base symbol price if not already set or current value is 0
                    if (!newPrices[baseSymbol] || newPrices[baseSymbol] === 0) {
                        newPrices[baseSymbol] = pricesByIdResult[priceId] || 0;
                    }

                    // Also store in "TOKEN (CHAIN)" format for compatibility
                    if (chain) {
                        const parenthesesFormat = `${baseSymbol} (${chain})`;
                        newPrices[parenthesesFormat] = pricesByIdResult[priceId] || 0;
                    }
                }
            });

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
        const interval = setInterval(updatePrices, 5 * ONE_MINUTE);
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
