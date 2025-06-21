import { useEffect, useMemo, useState } from "react";
import {
  calculateAaveAPY,
  calculateCompoundAPY,
  calculateMoonwellAPY,
  calculateVenusAPY,
  calculateVenusRewardsAPY,
  calculateEddyAPY,
  calculateBeefyAPY,
  calculateConvexEthereumRewardsAPY,
  calculateCompoundRewardsAPY,
  calculateConvexArbitrumRewardsAPY,
  calculateCombinedBalancerAPY,
  fetchReceiptTokens,
} from "@/actions/actions";

import {
  DEFAULT_SETTINGS,
  UserSettings,
  VaultData,
  Token,
} from "@/types/types";
import {
  SUPPORTED_CHAINS,
} from "@/constants/chainConfig";
import {
  getOnlyTokenSymbol
} from "@/utils/utils";
import { useTokenPrices } from "@/providers/TokenPriceProvider";
import { ONE_MINUTE, USER_SETTINGS_LOCAL_STORAGE_KEY } from "@/constants";
import { Address } from "viem";
import { useUserSettingsStore } from "@/store/userSettingsStore";
import { useUserTransactionsFromGraph, useUserPositionsFromGraph } from "@/hooks/useVaultsGraph";


export const UPDATE_VAULT_TIMESTAMP = "updateCashTimestamp";
export const HAS_CHANGE_DEPOSIT = "has_deposited";
const CASHED_VAULT_APIS = "cashedVaultApis";
const CASH_VAULT_INTERVAL_IN_MIN = 0.5;

export const useUpdateAPYs = (
  vaults: VaultData[] | null,
  setVaultAPYs: (vaultAPYs: { vaultId: string; APY7d: number }[]) => void,
  setLoading: (loading: boolean) => void,
  crvTokenPrice: number,
  cvxTokenPrice: number,
  ethTokenPrice: number,
  compTokenPrice: number,
  opTokenPrice: number,
  isFromVaultGrid?: boolean,
) => {
  useEffect(() => {
    const updateAPYs = async () => {
      if (!vaults) return;

      const now = Date.now();
      try {
        const receiptTokenAddresses = await fetchReceiptTokens(vaults);
        const updatedVaultAPYs = await Promise.all(
          vaults.map(async (vault) => {
            try {
              const strategyChain = SUPPORTED_CHAINS.find((c) => c.chain.id === vault.protocol.chainId)?.chain;
              if (!strategyChain) {
                return { vaultId: vault.id, APY7d: 0 };
              }
              const receiptTokenAddress = receiptTokenAddresses[vault.id];
              let APY7d = 0;
              let RewardsAPY = 0;
              if (vault.protocol.name === "Aave") {
                APY7d = await calculateAaveAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "ZeroLend") {
                APY7d = await calculateAaveAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "Compound") {
                APY7d = await calculateCompoundAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
                RewardsAPY = await calculateCompoundRewardsAPY(
                  vault.protocol.rewardsContractAddress as Address,
                  receiptTokenAddress as Address,
                  strategyChain,
                  51,
                );
                APY7d = APY7d + RewardsAPY;
              } else if (
                vault.protocol.name === "Moonwell" ||
                vault.protocol.name === "Euler" ||
                vault.protocol.name === "Fluid"
              ) {
                // TO DO This only works for Base right now - it's hardcoded

                APY7d = await calculateMoonwellAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "Venus") {
                APY7d = await calculateVenusAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
                RewardsAPY = await calculateVenusRewardsAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
                APY7d = APY7d + RewardsAPY;
              } else if (vault.protocol.name === "Eddy") {
                APY7d = await calculateEddyAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
                APY7d = await calculateEddyAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "Balancer") {
                const { totalAPY } = await calculateCombinedBalancerAPY({
                  receiptTokenAddress: receiptTokenAddress as Address,
                  liquidityGaugeAddress: vault.protocol
                    .rewardsContractAddress as Address,
                  rewardTokenAddress:
                    "0x994ac01750047B9d35431a7Ae4Ed312ee955E030",
                  inputTokenAddress:
                    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                  opTokenPrice,
                  strategyChain,
                });
                APY7d = totalAPY;
              } else if (vault.protocol.name === "Beefy") {
                APY7d = await calculateBeefyAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "Curve-Convex") {
                if (crvTokenPrice > 0 && ethTokenPrice > 0) {
                  if (strategyChain.id === 1) {
                    RewardsAPY = await calculateConvexEthereumRewardsAPY(
                      receiptTokenAddress as Address,
                      vault.inputToken as Token,
                      vault.protocol.rewardsContractAddress as Address,
                      strategyChain,
                      crvTokenPrice,
                      cvxTokenPrice,
                      ethTokenPrice,
                    );
                  } else if (strategyChain.id === 42161) {
                    RewardsAPY = await calculateConvexArbitrumRewardsAPY(
                      receiptTokenAddress as Address,
                      vault.inputToken as Token,
                      vault.protocol.rewardsContractAddress as Address,
                      strategyChain,
                      crvTokenPrice,
                      ethTokenPrice,
                    );
                  }
                } else {
                  console.warn(
                    "Skipping Curve rewards APY due to missing token prices",
                    { crvTokenPrice, ethTokenPrice },
                  );
                }
                APY7d = RewardsAPY;
              }

              return {
                vaultId: vault.id,
                APY7d,
                apy30d: [-2.5, 0.25, 0.5, 0.75, 2.1][
                  Math.floor(Math.random() * 5)
                ], //mocked
              };
            } catch (error) {
              console.error(`Error fetching APY for vault ${vault.id}:`, error);
              return { vaultId: vault.id, APY7d: 0 };
            }
          }),
        );
        setVaultAPYs(updatedVaultAPYs);
        if (isFromVaultGrid) {
          localStorage.setItem(
            CASHED_VAULT_APIS,
            JSON.stringify(updatedVaultAPYs),
          );
          localStorage.setItem(UPDATE_VAULT_TIMESTAMP, now.toString());
          localStorage.setItem(HAS_CHANGE_DEPOSIT, "false");
        }
      } finally {
        setLoading(false); // Stop the loading state after updating APYs
      }
    };

    // Trigger the function if vaults and prices are available
    if (
      vaults &&
      vaults.length > 0 &&
      crvTokenPrice > 0 &&
      cvxTokenPrice > 0 &&
      ethTokenPrice > 0 &&
      compTokenPrice > 0
    ) {
      const now = Date.now();
      const timestamp = localStorage.getItem(UPDATE_VAULT_TIMESTAMP);
      const hasDeposited = localStorage.getItem(HAS_CHANGE_DEPOSIT);

      if (
        timestamp &&
        now - Number(timestamp) < CASH_VAULT_INTERVAL_IN_MIN * ONE_MINUTE &&
        hasDeposited !== "true" &&
        isFromVaultGrid
      ) {
        const cashedVaultApis = localStorage.getItem(CASHED_VAULT_APIS);
        if (cashedVaultApis) {
          setVaultAPYs(JSON.parse(cashedVaultApis));
        }
        setLoading(false);
        return; //Update only if interval > 5 min or if user has deposited in Pool
      } else {
        setLoading(true);
        updateAPYs();
      }
    }
  }, [vaults, crvTokenPrice, ethTokenPrice, compTokenPrice, isFromVaultGrid, cvxTokenPrice, opTokenPrice, setLoading, setVaultAPYs]);
};

export function useTokenPriceBySymbol(symbol: string | undefined) {
  const priceContext = useTokenPrices();
  return useMemo(() => {
    if (!priceContext || !symbol) {
      return 0;
    }

    // Normalize the symbol format:
    // Convert "USDC (ETH)" to "USDC.ETH" format for price lookup
    const normalizedSymbol = symbol.includes("(")
      ? symbol.replace(/\s*\((.*?)\)\s*/, ".$1")
      : symbol;

    // Try to find price using normalized symbol first
    const fullSymbolPrice =
      priceContext.prices?.[normalizedSymbol.toUpperCase()];
    if (fullSymbolPrice !== undefined) {
      return fullSymbolPrice;
    }

    // If full symbol price not found, check if it's a stablecoin by checking the base symbol
    // For both formats: "USDC (ETH)" -> "USDC" and "USDC.ETH" -> "USDC"
    const baseSymbol = symbol.includes("(")
      ? symbol.split(" (")[0].toUpperCase()
      : getOnlyTokenSymbol(symbol).toUpperCase();

    if (baseSymbol === "USDC" || baseSymbol === "USDT") {
      return 1;
    }

    // Fallback to base symbol if full symbol price not found
    return priceContext.prices?.[baseSymbol] ?? 0;
  }, [priceContext, symbol]);
}

export function useUserSettings() {
  const [userSettings, setUserSettings] = useState<UserSettings>({
    slippage: DEFAULT_SETTINGS.slippage,
  });

  useEffect(() => {
    const saved = localStorage.getItem(USER_SETTINGS_LOCAL_STORAGE_KEY);
    if (saved) {
      setUserSettings(JSON.parse(saved));
    }
  }, []);

  const updateSettings = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => {
    const newSettings = { ...userSettings, [key]: value };
    localStorage.setItem(
      USER_SETTINGS_LOCAL_STORAGE_KEY,
      JSON.stringify(newSettings),
    );
    setUserSettings(newSettings);
  };

  return { userSettings, updateSettings };
}

export const useSlippage = () => {
  const { slippage, setSlippage, toggleAuto } = useUserSettingsStore();
  return {
    slippageValue: slippage.value,
    isAuto: slippage.isAuto,
    setSlippage,
    toggleAuto,
  };
};

// Hooks for working with subgraph
export const useUserTransactionsHistory = (userAddress?: string) => {
  const { data, isLoading, error } = useUserTransactionsFromGraph(userAddress);

  if (!userAddress) {
    return {
      deposits: [],
      withdrawals: [],
      isLoading: false,
      error: null,
      hasData: false
    };
  }

  return {
    deposits: data?.deposits || [],
    withdrawals: data?.withdrawals || [],
    isLoading,
    error,
    hasData: Boolean(data?.deposits?.length || data?.withdrawals?.length)
  };
};

export const useUserPortfolioFromGraph = (userAddress?: string) => {
  const { data, isLoading, error } = useUserPositionsFromGraph(userAddress);

  if (!userAddress) {
    return {
      positions: [],
      totalValue: 0,
      isLoading: false,
      error: null
    };
  }

  const positions = data?.userPositions || [];
  const totalValue = positions.reduce((sum: number, pos: any) => {
    return sum + parseFloat(pos.balanceUSD || '0');
  }, 0);

  return {
    positions,
    totalValue,
    isLoading,
    error
  };
};