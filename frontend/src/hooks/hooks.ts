import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  fetchAegisAPR,
  fetchYieldFiAPY,
  fetchNoonCapitalAPY,

  fetchTotalAssets,
  fetchUserVaultMaxWithdraw,
  fetchUserVaultBalance,
} from "@/actions/actions";

import {
  DEFAULT_SETTINGS,
  UserSettings,
  VaultData,
  Token,
} from "@/types/types";
import {
  CHAIN_ID,
  MULTICALL_ADDRS,
  chainsWithCustomRpcs,
} from "@/constants/chainConfig";
import {
  getOnlyTokenSymbol,
  getSolanaEVMAddress,
  isSolanaAddress
} from "@/utils/utils";
import { useTokenPrices } from "@/providers/TokenPriceProvider";
import { ONE_MINUTE, USER_SETTINGS_LOCAL_STORAGE_KEY } from "@/constants";
import vaultAbi from "../../abis/moonwellVaultABI.json";
import { Address, zeroAddress } from "viem";
import { ConnectedWallet, SUPPORTED_CHAINS } from "@privy-io/react-auth";
import { useUserSettingsStore } from "@/store/userSettingsStore";
import { useUserPositionsFromGraph, useUserTransactionsFromGraph } from "./useVaultsGraph";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { zetaProvider } from "@/utils/providers";
import { ethers, Interface } from "ethers";
import { apiService } from "@/service";
import { getVault30dAvgAPY, getVaultHistoricalAPY } from '@/utils/defillama';
import { VAULT_TO_DEFILLAMA_POOL } from "@/constants/defillamaPoolMapping";
import { parseAbiItem } from "viem";
import { PublicClient } from "viem";
import { getPublicClient } from "@/utils/getPublicClient";

type CashedVaultData = {
  vaultId: string;
  balance: string;
  totalAssets: any;
  totalAssetsinToken: string;
}[];

export const UPDATE_VAULT_TIMESTAMP = "updateCashTimestamp";
export const HAS_CHANGE_DEPOSIT = "has_deposited";
const CASHED_VAULT_ASSETS_DATA = "cashedVaultAssetsData";
const CASHED_VAULT_APIS = "cashedVaultApis";
const CASH_VAULT_INTERVAL_IN_MIN = 0.5;
export const PREVIOUS_ADDRESS = "prevAddress";

export const useUpdateAPYs = (
  vaults: VaultData[] | null,
  setVaultAPYs: (vaultAPYs: { vaultId: string; APY7d: number }[]) => void,
  setLoading: (loading: boolean) => void,
  crvTokenPrice: number,
  cvxTokenPrice: number,
  ethTokenPrice: number,
  compTokenPrice: number,
  opTokenPrice: number,
  btcTokenPrice: number,
  activeAccount: ConnectedWallet,
  isFromVaultGrid?: boolean,
) => {
  useEffect(() => {
    const updateAPYs = async () => {
      if (!vaults) return;

      const now = Date.now();
      try {
        const receiptTokenAddresses = await fetchReceiptTokens(vaults, activeAccount);
        const updatedVaultAPYs = await Promise.all(
          vaults.map(async (vault) => {
            try {
              const strategyChain = chainsWithCustomRpcs().find(
                (c) => c.id === vault.protocol.chainId,
              );
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
                  activeAccount
                );
              } else if (vault.protocol.name === "ZeroLend") {
                APY7d = await calculateAaveAPY(receiptTokenAddress as Address, strategyChain, activeAccount);
              } else if (vault.protocol.name === "Aegis") {
                APY7d = await fetchAegisAPR();
              } else if (vault.protocol.name === "YieldFi") {
                APY7d = await fetchYieldFiAPY();
              } else if (vault.protocol.name === "Noon Capital") {
                APY7d = await fetchNoonCapitalAPY();
              } else if (vault.protocol.name === "Compound") {
                APY7d = await calculateCompoundAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                  activeAccount
                );
                RewardsAPY = await calculateCompoundRewardsAPY(
                  vault.protocol.rewardsContractAddress as Address,
                  receiptTokenAddress as Address,
                  strategyChain,
                  51,
                );
                APY7d = APY7d + RewardsAPY;
              } else if (vault.protocol.name === "Moonwell" || vault.protocol.name === "Euler" || vault.protocol.name === "Fluid") {
                APY7d = await calculateMoonwellAPY(receiptTokenAddress as Address, strategyChain);
              } else if (vault.protocol.name === "Venus") {
                APY7d = await calculateVenusAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                  activeAccount
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
                  activeAccount
                );
                APY7d = await calculateEddyAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                  activeAccount
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
                      btcTokenPrice,
                      activeAccount
                    );
                  } else if (strategyChain.id === 42161) {
                    RewardsAPY = await calculateConvexArbitrumRewardsAPY(
                      receiptTokenAddress as Address,
                      vault.inputToken as Token,
                      vault.protocol.rewardsContractAddress as Address,
                      strategyChain,
                      crvTokenPrice,
                      ethTokenPrice,
                      activeAccount
                    );
                  }
                }
                APY7d = RewardsAPY;
              }

              const realApy30d = await getVault30dAvgAPY(vault.id);

              return {
                vaultId: vault.id,
                APY7d,

                apy30d: realApy30d,

              };
            } catch (error) {
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
        updateAPYs();
      }
    }
  }, [
    vaults,
    crvTokenPrice,
    ethTokenPrice,
    compTokenPrice,
    isFromVaultGrid,
    cvxTokenPrice,
    opTokenPrice,
    setLoading,
    setVaultAPYs,
  ]);
};

export function useTokenPriceBySymbol(symbol: string | undefined) {
  const priceContext = useTokenPrices();
  return useMemo(() => {
    if (!priceContext || !symbol) {
      return 0;
    }

    const normalizedSymbol = symbol.includes('(') ?
      symbol.replace(/\s*\((.*?)\)\s*/, '.$1') : symbol;

    const fullSymbolPrice = priceContext.prices?.[normalizedSymbol.toUpperCase()];
    if (fullSymbolPrice !== undefined) {
      return fullSymbolPrice;
    }

    const baseSymbol = symbol.includes('(') ?
      symbol.split(' (')[0].toUpperCase() :
      getOnlyTokenSymbol(symbol).toUpperCase();

    if (baseSymbol === "USDC" || baseSymbol === "USDT") {
      return 1;
    }

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

export function useSlippage(vaultId: string) {
  const store = useUserSettingsStore();

  useEffect(() => {
    if (vaultId) {
      store.loadSlippageForVault(vaultId);
    }
  }, [vaultId, store.loadSlippageForVault]);

  const slippageSettings = useMemo(() => {
    const settings = store.getSlippageForVault(vaultId);
    return settings;
  }, [vaultId, store.slippage, store.getSlippageForVault]);

  return {
    slippageValue: slippageSettings.value,
    isAuto: slippageSettings.isAuto,
    setSlippage: store.setSlippage,
    toggleAuto: store.toggleAuto,
  };
}

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