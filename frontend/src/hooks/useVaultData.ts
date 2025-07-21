// export default function useVaultData() {
//   const { data, isLoading, error } = useQuery({
//     queryKey: ["VaultDat"],
//     queryFn: () => apiService.api.getVaultData(),
//   });

//   return { data, isLoading, error };
// }

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  VaultData,
  VaultAPY,
  UserVaultBalance,
  VaultTotalAssets,
  VaultTotalAssetsinToken,
} from "@/types/types";
import { useUpdateAPYs } from "@/hooks/hooks";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useWallets } from "@privy-io/react-auth";
import {
  useVaultsFromGraph,
  useVaultsPaginatedFromGraph,
  useVaultsCountFromGraph,
  useUserVaultBalancesFromGraph,
  useSearchVaultsPaginatedFromGraph,
  useSearchVaultsCountFromGraph,
  useSearchVaultsPaginatedWithNetworkFromGraph,
  useSearchVaultsWithNetworkCountFromGraph,
  useVaultsByNetworkFromGraph,
  useVaultsByNetworkCountFromGraph,
  useVaultsByProtocolFromGraph,
  useVaultsByProtocolCountFromGraph,
  useSearchVaultsPaginatedWithProtocolFromGraph,
  useSearchVaultsWithProtocolCountFromGraph,
  useVaultsByNetworkAndProtocolFromGraph,
  useVaultsByNetworkAndProtocolCountFromGraph,
  useSearchVaultsPaginatedWithNetworkAndProtocolFromGraph,
  useSearchVaultsWithNetworkAndProtocolCountFromGraph,
} from "@/hooks/useVaultsGraph";
import {
  convertGraphVaultToVaultData,
  convertGraphVaultToTotalAssets,
} from "@/utils/graphUtils";
import { EXCLUDED_VAULTS } from "@/constants";
import { getRawBlockTransactions } from "viem/zksync";
import {
  useStableVaultsSortedFromGraph,
  useNonStableVaultsSortedFromGraph,
} from "@/hooks/useVaultsGraph";
import { formatUnits } from "viem";
import { isStablecoin } from "@/utils/utils";
import { useTokenPrices } from "@/providers/TokenPriceProvider";
import { getOnlyTokenSymbol } from "@/utils/utils";

// Universal token price lookup helper
export const getTokenPrice = (symbol: string, priceContext: any): number => {
  if (!priceContext || !symbol) return 0;

  // For stablecoins, return 1 USD
  if (isStablecoin(symbol)) return 1;

  const normalizedSymbol = symbol.includes('(') ?
    symbol.replace(/\s*\((.*?)\)\s*/, '.$1') : symbol;

  // Try full symbol first (e.g., "ETH (BASE)" -> "ETH.BASE")
  const fullSymbolPrice = priceContext.prices?.[normalizedSymbol.toUpperCase()];
  if (fullSymbolPrice !== undefined && fullSymbolPrice > 0) {
    return fullSymbolPrice;
  }

  // Try base symbol (e.g., "ETH (BASE)" -> "ETH")
  const baseSymbol = symbol.includes('(') ?
    symbol.split(' (')[0].toUpperCase() :
    getOnlyTokenSymbol(symbol).toUpperCase();

  const basePrice = priceContext.prices?.[baseSymbol];
  if (basePrice !== undefined && basePrice > 0) {
    return basePrice;
  }

  return 0;
};


export const useVaultData = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
  const [userVaultBalances, setUserVaultBalances] = useState<
    UserVaultBalance[]
  >([]);
  const [vaultTotalAssets, setVaultTotalAssets] = useState<VaultTotalAssets[]>(
    [],
  );
  const [vaultTotalAssetsinToken, setVaultTotalAssetsinToken] = useState<
    VaultTotalAssetsinToken[]
  >([]);

  const { walletAddress } = useMultiChain();
  const { wallets } = useWallets();
  const filteredWallets = wallets.filter(
    (wallet) => wallet.meta.id !== "app.phantom",
  );
  const wallet = filteredWallets[0];

  const stableSetVaultAPYs = useCallback((vaultAPYs: VaultAPY[]) => {
    setVaultAPYs(vaultAPYs);
  }, []);

  const stableSetLoading = useCallback((loading: boolean) => {
    setLoading(loading);
  }, []);

  const {
    loading: userBalancesLoading,
    userVaultBalances: graphUserVaultBalances,
  } = useUserVaultBalancesFromGraph(walletAddress || undefined);

  const graphUserVaultBalancesString = JSON.stringify(graphUserVaultBalances);
  const stableUserVaultBalances = useMemo(() => {
    return graphUserVaultBalances;
  }, [graphUserVaultBalancesString]);

  useEffect(() => {
    if (walletAddress && stableUserVaultBalances.length >= 0) {
      setUserVaultBalances(stableUserVaultBalances);
    } else if (!walletAddress) {
      setUserVaultBalances([]);
    }
  }, [walletAddress, stableUserVaultBalances]);

  const {
    data: subgraphData,
    isLoading: subgraphLoading,
    error: subgraphError,
  } = useVaultsFromGraph();

  // Debug: Log vaults with missing or zero subgraph APY
  if (subgraphData?.vaults) {
    console.log('[DEBUG] subgraphData.vaults loaded:', subgraphData.vaults.length);
    subgraphData.vaults.forEach(vault => {
      if (!vault.apy7d || parseFloat(vault.apy7d) === 0) {
        console.log('[DEBUG] Subgraph APY missing or zero for vault:', vault.id, vault.name, vault.protocolName);
      }
    });
  }

  const useGraphData = !subgraphError && subgraphData !== undefined;

  // Vaults only from subgraph (memoized)
  const vaults: VaultData[] = useMemo(() => {
    if (!useGraphData || !subgraphData?.vaults) return [];

    return subgraphData.vaults
      .filter((vault: any) => !EXCLUDED_VAULTS.includes(vault.id))
      .map(convertGraphVaultToVaultData);
  }, [useGraphData, subgraphData]);

  // APY: from subgraph or calculated
  const shouldUseGraphAPY = useMemo(() => {
    if (!useGraphData || !subgraphData?.vaults) return false;

    return subgraphData.vaults.some((v: any) => {
      try {
        return parseFloat(v.apy7d) > 0;
      } catch (error) {
        return false;
      }
    });
  }, [useGraphData, subgraphData]);

  // TVL: from subgraph or blockchain
  const shouldUseGraphTVL = useMemo(() => {
    if (!useGraphData || !subgraphData?.vaults) return false;

    return subgraphData.vaults.some((v: any) => {
      try {
        return BigInt(v.tvl || "0") > BigInt(0);
      } catch (error) {
        return false;
      }
    });
  }, [useGraphData, subgraphData]);

  // Token prices from context for universal price lookup
  const priceContextMain = useTokenPrices();

  // Legacy token prices for APY calculations (memoized)
  const rawCrvTokenPrice = useTokenPriceBySymbol("CRV");
  const rawCvxTokenPrice = useTokenPriceBySymbol("CVX");
  const rawEthTokenPrice = useTokenPriceBySymbol("ETH");
  const rawCompTokenPrice = useTokenPriceBySymbol("COMP");
  const rawOpTokenPrice = useTokenPriceBySymbol("OP");
  const rawBtcTokenPrice = useTokenPriceBySymbol("CBBTC");

  // Memoize token prices to avoid constant changes
  const tokenPrices = useMemo(
    () => ({
      ...priceContextMain, // Add price context for universal lookup
      crvTokenPrice: rawCrvTokenPrice,
      cvxTokenPrice: rawCvxTokenPrice,
      ethTokenPrice: rawEthTokenPrice,
      compTokenPrice: rawCompTokenPrice,
      opTokenPrice: rawOpTokenPrice,
      btcTokenPrice: rawBtcTokenPrice
    }),
    [
      priceContextMain,
      rawCrvTokenPrice,
      rawCvxTokenPrice,
      rawEthTokenPrice,
      rawCompTokenPrice,
      rawOpTokenPrice,
      rawBtcTokenPrice,
    ],
  );

  const isDataReady = useMemo(() => {
    if (useGraphData) {
      const hasVaults = vaults.length > 0;
      const hasAPY = shouldUseGraphAPY ? vaultAPYs.length > 0 : true;
      const hasTVL = shouldUseGraphTVL ? vaultTotalAssets.length > 0 : true;

      return !subgraphLoading && hasVaults && hasAPY && hasTVL;
    }

    return false;
  }, [
    useGraphData,
    subgraphLoading,
    vaults.length,
    shouldUseGraphAPY,
    vaultAPYs.length,
    shouldUseGraphTVL,
    vaultTotalAssets.length,
  ]);

  // APY calculations (only if not using subgraph and there are vaults)
  useUpdateAPYs(
    !shouldUseGraphAPY && vaults.length > 0 ? vaults : null, // pass null if not needed
    stableSetVaultAPYs,
    stableSetLoading,
    tokenPrices.crvTokenPrice,
    tokenPrices.cvxTokenPrice,
    tokenPrices.ethTokenPrice,
    tokenPrices.compTokenPrice,
    tokenPrices.opTokenPrice,
    tokenPrices.btcTokenPrice,
    wallet,
    false,
  );

  useEffect(() => {
    if (!subgraphData?.vaults) {
      return;
    }

    // Set all data at once to avoid flickering
    const filteredVaults = subgraphData.vaults.filter(
      (vault: any) => !EXCLUDED_VAULTS.includes(vault.id),
    );

    /*// Set APY from subgraph
    if (shouldUseGraphAPY) {
      const graphAPYs = filteredVaults.map(convertGraphVaultToAPY);
      setVaultAPYs(graphAPYs);
    }*/

    // Set TVL from subgraph
    if (shouldUseGraphTVL) {
      const graphTotalAssets = filteredVaults.map(convertGraphVaultToTotalAssets);
      setVaultTotalAssets(prev => mergeVaultTotalAssets(prev, graphTotalAssets));
    }
  }, [subgraphData, shouldUseGraphAPY, shouldUseGraphTVL]);

  // Separate effect to manage loading state
  useEffect(() => {
    if (subgraphLoading) {
      setLoading(true);
    } else if (isDataReady) {
      setLoading(false);
    }
  }, [subgraphLoading, isDataReady]);

  // Overall loading state
  const finalLoading = useMemo(() => {
    if (useGraphData) {
      // For subgraph: show loading until data is loaded
      return subgraphLoading || !isDataReady;
    }

    return loading;
  }, [useGraphData, subgraphLoading, isDataReady, loading]);

  const hasError = useMemo(() => {
    return subgraphError && !subgraphLoading;
  }, [subgraphError, subgraphLoading]);

  return {
    loading: finalLoading,
    vaults,
    vaultAPYs,
    userVaultBalances,
    vaultTotalAssets,
    vaultTotalAssetsinToken,
    hasError,
    error: subgraphError,

    // Additional debug information (optional)
    _debug: {
      useSubgraph: useGraphData,
      subgraphError: subgraphError?.message,
      subgraphLoading,
      isDataReady,
      finalLoading,
      hasError,
      dataSource: {
        vaults: useGraphData ? "subgraph" : "static",
        apy: shouldUseGraphAPY ? "subgraph" : "blockchain",
        tvl: shouldUseGraphTVL ? "subgraph" : "blockchain",
      },
    },
  };
};

//hook with pagination
export const useVaultDataPaginated = (
  page: number = 1,
  pageSize: number = 10,
  sortBy: string = "tvl",
  sortOrder: "asc" | "desc" = "desc",
) => {
  const { wallets } = useWallets();
  const filteredWallets = wallets.filter(
    (wallet) => wallet.meta.id !== "app.phantom",
  );
  const wallet = filteredWallets[0];
  const [loading, setLoading] = useState<boolean>(true);
  const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
  const [userVaultBalances, setUserVaultBalances] = useState<
    UserVaultBalance[]
  >([]);
  const [vaultTotalAssets, setVaultTotalAssets] = useState<VaultTotalAssets[]>(
    [],
  );
  const [vaultTotalAssetsinToken, setVaultTotalAssetsinToken] = useState<
    VaultTotalAssetsinToken[]
  >([]);

  const { walletAddress } = useMultiChain();

  // Stable callback functions
  const stableSetVaultAPYs = useCallback((vaultAPYs: VaultAPY[]) => {
    setVaultAPYs(vaultAPYs);
  }, []);

  const stableSetLoading = useCallback((loading: boolean) => {
    setLoading(loading);
  }, []);

  // User balances from subgraph
  const {
    loading: userBalancesLoading,
    userVaultBalances: graphUserVaultBalances,
  } = useUserVaultBalancesFromGraph(walletAddress || undefined);

  // Memoize user balances to avoid infinite loop
  const stableUserVaultBalances = useMemo(() => {
    return graphUserVaultBalances;
  }, [JSON.stringify(graphUserVaultBalances)]);

  // Use subgraph balances if available
  useEffect(() => {
    if (walletAddress && stableUserVaultBalances.length >= 0) {
      setUserVaultBalances(stableUserVaultBalances);
    } else if (!walletAddress) {
      setUserVaultBalances([]);
    }
  }, [walletAddress, stableUserVaultBalances]);

  // Determine pagination strategy
  const isTVLSort = sortBy.toLowerCase() === "tvl";

  // For local pagination (APY/Risk) fetch a large batch (Graph limit 1000)
  // For TVL keep remote pagination to avoid fetching unnecessary data and retain existing custom logic
  const GRAPH_BATCH_SIZE = 1000;

  const effectiveFirst = isTVLSort ? pageSize : GRAPH_BATCH_SIZE;
  const effectiveSkip = isTVLSort ? (page - 1) * pageSize : 0;

  // Mapping sortBy for subgraph (needed for remote pagination when TVL, unused otherwise)
  const graphSortBy = useMemo(() => {
    switch (sortBy.toLowerCase()) {
      case "apy":
        return "apy7d";
      case "tvl":
        return "tvl";
      case "risk":
        return "riskLevel";
      default:
        return "tvl";
    }
  }, [sortBy]);

  // Fetch two separate arrays when sorting by TVL (stable vs non-stable)
  // We disable React-Query when not needed to avoid redundant requests.
  const {
    data: stableVaultsData,
    isLoading: stableLoading,
    error: stableError,
  } = useStableVaultsSortedFromGraph();
  const {
    data: nonStableVaultsData,
    isLoading: nonStableLoading,
    error: nonStableError,
  } = useNonStableVaultsSortedFromGraph();

  // Commented out: old paginated subgraph fetch, will only be used for APY / Risk sorting
  // const {
  //   data: subgraphData,
  //   isLoading: subgraphLoading,
  //   error: subgraphError,
  // } = useVaultsPaginatedFromGraph(pageSize, skip, graphSortBy, sortOrder);

  // For non-TVL sorting we still use paginated query
  const {
    data: subgraphData,
    isLoading: subgraphLoading,
    error: subgraphError,
  } = useVaultsPaginatedFromGraph(
    isTVLSort ? 0 : effectiveFirst,
    isTVLSort ? 0 : effectiveSkip,
    graphSortBy,
    sortOrder
  );

  // Extra query to get total vault count for pagination (disabled when using TVL custom flow)
  const { data: countData, isLoading: countLoading } = useVaultsCountFromGraph();

  // Token prices from context for universal price lookup
  const priceContext = useTokenPrices();

  // Legacy token prices for APY calculations (memoized)
  const rawCrvTokenPrice = useTokenPriceBySymbol("CRV");
  const rawCvxTokenPrice = useTokenPriceBySymbol("CVX");
  const rawEthTokenPrice = useTokenPriceBySymbol("ETH");
  const rawCompTokenPrice = useTokenPriceBySymbol("COMP");
  const rawOpTokenPrice = useTokenPriceBySymbol("OP");
  const rawBtcTokenPrice = useTokenPriceBySymbol("CBBTC");

  const tokenPrices = useMemo(
    () => ({
      ...priceContext, // Add price context for universal lookup
      crvTokenPrice: rawCrvTokenPrice,
      cvxTokenPrice: rawCvxTokenPrice,
      ethTokenPrice: rawEthTokenPrice,
      compTokenPrice: rawCompTokenPrice,
      opTokenPrice: rawOpTokenPrice,
      btcTokenPrice: rawBtcTokenPrice
    }),
    [
      priceContext,
      rawCrvTokenPrice,
      rawCvxTokenPrice,
      rawEthTokenPrice,
      rawCompTokenPrice,
      rawOpTokenPrice,
      rawBtcTokenPrice,
    ],
  );

  // For TVL sorting we will combine stable & non-stable arrays and apply local pagination
  const combinedVaultsData = useMemo(() => {
    if (!isTVLSort) return undefined;

    const stableList = stableVaultsData?.vaults || [];
    const nonStableList = nonStableVaultsData?.vaults || [];

    return mergeSortedVaultsByTVL(stableList, nonStableList, tokenPrices, sortOrder);
  }, [isTVLSort, stableVaultsData, nonStableVaultsData, tokenPrices, sortOrder]);

  // Replace skip/first pagination with local slicing when TVL sort
  const paginatedVaultsData = useMemo(() => {
    if (!isTVLSort) return subgraphData?.vaults || [];

    if (!combinedVaultsData) return [];

    // front-end pagination
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return combinedVaultsData.slice(start, end);
  }, [isTVLSort, combinedVaultsData, subgraphData, page, pageSize]);

  const totalCount = useMemo(() => {
    if (isTVLSort) {
      return (combinedVaultsData?.length || 0);
    }
    if (!subgraphData?.vaults) return 0;
    return subgraphData.vaults.filter(
      (vault: any) => !EXCLUDED_VAULTS.includes(vault.id),
    ).length;
  }, [isTVLSort, combinedVaultsData, subgraphData]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const useGraphData = isTVLSort
    ? !(stableError || nonStableError) && combinedVaultsData !== undefined
    : !subgraphError && subgraphData !== undefined;

  const vaults: VaultData[] = useMemo(() => {
    if (isTVLSort) {
      if (!combinedVaultsData) return [];
      return combinedVaultsData
        .filter((vault: any) => !EXCLUDED_VAULTS.includes(vault.id))
        .map(convertGraphVaultToVaultData);
    }

    if (!useGraphData || !subgraphData?.vaults) return [];

    return paginatedVaultsData
      .filter((vault: any) => !EXCLUDED_VAULTS.includes(vault.id))
      .map(convertGraphVaultToVaultData);
  }, [isTVLSort, combinedVaultsData, useGraphData, subgraphData, paginatedVaultsData]);

  // APY: from subgraph or calculated
  const shouldUseGraphAPY = useMemo(() => {
    if (!useGraphData || !subgraphData?.vaults) return false;

    return subgraphData.vaults.some((v: any) => {
      try {
        return parseFloat(v.apy7d) > 0;
      } catch (error) {
        return false;
      }
    });
  }, [useGraphData, subgraphData]);

  // TVL: from subgraph or blockchain
  const shouldUseGraphTVL = useMemo(() => {
    if (!useGraphData || !subgraphData?.vaults) return false;

    return subgraphData.vaults.some((v: any) => {
      try {
        return BigInt(v.tvl || "0") > BigInt(0);
      } catch (error) {
        return false;
      }
    });
  }, [useGraphData, subgraphData]);

  // Determine if all data is ready
  const isDataReady = useMemo(() => {
    // If using subgraph
    if (useGraphData || (!subgraphError && !subgraphLoading)) {
      // Data is ready if request is completed (even if result is empty)
      const dataLoaded = !subgraphLoading && !countLoading;
      const hasAPY = shouldUseGraphAPY ? vaultAPYs.length >= 0 : true;
      const hasTVL = shouldUseGraphTVL ? vaultTotalAssets.length >= 0 : true;

      return dataLoaded && hasAPY && hasTVL;
    }

    // If not using subgraph - no vaults
    return false;
  }, [
    useGraphData,
    subgraphLoading,
    countLoading,
    subgraphError,
    shouldUseGraphAPY,
    vaultAPYs.length,
    shouldUseGraphTVL,
    vaultTotalAssets.length,
  ]);

  // APY calculations (only if not using subgraph and there are vaults)
  useUpdateAPYs(
    !shouldUseGraphAPY && vaults.length > 0 ? vaults : null, // pass null if not needed
    stableSetVaultAPYs,
    stableSetLoading,
    tokenPrices.crvTokenPrice,
    tokenPrices.cvxTokenPrice,
    tokenPrices.ethTokenPrice,
    tokenPrices.compTokenPrice,
    tokenPrices.opTokenPrice,
    tokenPrices.btcTokenPrice,
    wallet,
    false,
  );

  // Set data from subgraph if available
  useEffect(() => {
    if (!subgraphData?.vaults) {
      return;
    }

    // Skip TVL override when using custom TVL flow, but still allow APY update
    const skipTVL = isTVLSort;

    // Set all data at once to avoid flickering
    const filteredVaults = subgraphData.vaults.filter(
      (vault: any) => !EXCLUDED_VAULTS.includes(vault.id),
    );

    // Set APY from subgraph
    // if (shouldUseGraphAPY) {
    //   const graphAPYs = filteredVaults.map(convertGraphVaultToAPY);
    //   setVaultAPYs(graphAPYs);
    // }

    // Set TVL from subgraph
    if (shouldUseGraphTVL && !skipTVL) {
      const graphTotalAssets = filteredVaults.map(convertGraphVaultToTotalAssets);
      setVaultTotalAssets(prev => mergeVaultTotalAssets(prev, graphTotalAssets));
    }
  }, [subgraphData, shouldUseGraphAPY, shouldUseGraphTVL]);

  // Overall loading state
  const finalLoading = useMemo(() => {
    if (useGraphData) {
      // For subgraph: show loading until data is loaded
      return subgraphLoading || countLoading || !isDataReady;
    }
    // If there is an error - don't show infinite loader
    if (subgraphError) return false;
    // If not using subgraph, show default loading
    return loading;
  }, [
    useGraphData,
    subgraphLoading,
    countLoading,
    isDataReady,
    subgraphError,
    loading,
  ]);

  // Error state
  const hasError = useMemo(() => {
    return subgraphError && !subgraphLoading;
  }, [subgraphError, subgraphLoading]);

  return {
    loading: finalLoading,
    vaults,
    vaultAPYs,
    userVaultBalances,
    vaultTotalAssets,
    vaultTotalAssetsinToken,
    hasError,
    error: subgraphError,

    // Pagination
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,

    // Additional debug information
    _debug: {
      useSubgraph: useGraphData,
      subgraphError: subgraphError?.message,
      subgraphLoading,
      countLoading,
      isDataReady,
      finalLoading,
      hasError,
      dataSource: {
        vaults: useGraphData ? "subgraph" : "static",
        apy: shouldUseGraphAPY ? "subgraph" : "blockchain",
        tvl: shouldUseGraphTVL ? "subgraph" : "blockchain",
      },
    },
  };
};

export const useVaultDataWithSearch = (
  searchTerm: string = "",
  page: number = 1,
  pageSize: number = 10,
  sortBy: string = "tvl",
  sortOrder: "asc" | "desc" = "desc",
  networkFilter: string = "",
  protocolFilter: string = "",
) => {
  const { wallets } = useWallets();
  const filteredWallets = wallets.filter(
    (wallet) => wallet.meta.id !== "app.phantom",
  );
  const wallet = filteredWallets[0];
  const [loading, setLoading] = useState<boolean>(true);
  const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
  const [userVaultBalances, setUserVaultBalances] = useState<
    UserVaultBalance[]
  >([]);
  const [vaultTotalAssets, setVaultTotalAssets] = useState<VaultTotalAssets[]>(
    [],
  );
  const [vaultTotalAssetsinToken, setVaultTotalAssetsinToken] = useState<
    VaultTotalAssetsinToken[]
  >([]);
  const [timedOut, setTimedOut] = useState(false);

  const { walletAddress } = useMultiChain();

  // Stable callback functions
  const stableSetVaultAPYs = useCallback((vaultAPYs: VaultAPY[]) => {
    setVaultAPYs(vaultAPYs);
  }, []);

  const stableSetLoading = useCallback((loading: boolean) => {
    setLoading(loading);
  }, []);

  // User balances from subgraph
  const {
    loading: userBalancesLoading,
    userVaultBalances: graphUserVaultBalances,
  } = useUserVaultBalancesFromGraph(walletAddress || undefined);

  // Memoize user balances to avoid infinite loop
  const graphUserVaultBalancesString2 = JSON.stringify(graphUserVaultBalances);
  const stableUserVaultBalances = useMemo(() => {
    return graphUserVaultBalances;
  }, [graphUserVaultBalancesString2]);

  // Use subgraph balances if available
  useEffect(() => {
    if (walletAddress && stableUserVaultBalances.length >= 0) {
      setUserVaultBalances(stableUserVaultBalances);
    } else if (!walletAddress) {
      setUserVaultBalances([]);
    }
  }, [walletAddress, stableUserVaultBalances]);

  // Determine pagination strategy
  const isTVLSort = sortBy.toLowerCase() === "tvl";

  // For local pagination (APY/Risk) fetch a large batch (Graph limit 1000)
  // For TVL keep remote pagination to avoid fetching unnecessary data and retain existing custom logic
  const GRAPH_BATCH_SIZE = 1000;

  const effectiveFirst = isTVLSort ? pageSize : GRAPH_BATCH_SIZE;
  const effectiveSkip = isTVLSort ? (page - 1) * pageSize : 0;

  // Mapping sortBy for subgraph
  const graphSortBy = useMemo(() => {
    switch (sortBy.toLowerCase()) {
      case "apy":
        return "apy7d";
      case "tvl":
        return "tvl";
      case "risk":
        return "riskLevel";
      default:
        return "tvl";
    }
  }, [sortBy]);

  // Determine if search should be used - memoized to prevent constant recalculation
  const trimmedSearchTerm = useMemo(() => searchTerm.trim(), [searchTerm]);
  const hasNetworkFilter = useMemo(
    () => networkFilter && networkFilter.length > 0,
    [networkFilter],
  );
  const hasProtocolFilter = useMemo(
    () => protocolFilter && protocolFilter.length > 0,
    [protocolFilter],
  );
  const hasSearchTerm = useMemo(() => {
    return (
      trimmedSearchTerm.length > 0 &&
      trimmedSearchTerm.length <= 100 && // Maximum 100 characters
      // Minimum 6 characters for addresses (0x + 4 characters)
      (!trimmedSearchTerm.startsWith("0x") || trimmedSearchTerm.length >= 6)
    );
  }, [trimmedSearchTerm]);

  // All possible hook calls (always called at top level)
  const searchWithNetworkAndProtocolData =
    useSearchVaultsPaginatedWithNetworkAndProtocolFromGraph(
      hasSearchTerm && hasNetworkFilter && hasProtocolFilter
        ? trimmedSearchTerm
        : "",
      hasSearchTerm && hasNetworkFilter && hasProtocolFilter
        ? networkFilter
        : "",
      hasSearchTerm && hasNetworkFilter && hasProtocolFilter
        ? protocolFilter
        : "",
      hasSearchTerm && hasNetworkFilter && hasProtocolFilter ? effectiveFirst : 0,
      hasSearchTerm && hasNetworkFilter && hasProtocolFilter ? effectiveSkip : 0,
      graphSortBy,
      sortOrder,
    );

  const searchWithNetworkData = useSearchVaultsPaginatedWithNetworkFromGraph(
    hasSearchTerm && hasNetworkFilter && !hasProtocolFilter
      ? trimmedSearchTerm
      : "",
    hasSearchTerm && hasNetworkFilter && !hasProtocolFilter
      ? networkFilter
      : "",
    hasSearchTerm && hasNetworkFilter && !hasProtocolFilter ? effectiveFirst : 0,
    hasSearchTerm && hasNetworkFilter && !hasProtocolFilter ? effectiveSkip : 0,
    graphSortBy,
    sortOrder,
  );

  const searchWithProtocolData = useSearchVaultsPaginatedWithProtocolFromGraph(
    hasSearchTerm && !hasNetworkFilter && hasProtocolFilter
      ? trimmedSearchTerm
      : "",
    hasSearchTerm && !hasNetworkFilter && hasProtocolFilter
      ? protocolFilter
      : "",
    hasSearchTerm && !hasNetworkFilter && hasProtocolFilter ? effectiveFirst : 0,
    hasSearchTerm && !hasNetworkFilter && hasProtocolFilter ? effectiveSkip : 0,
    graphSortBy,
    sortOrder,
  );

  const networkAndProtocolData = useVaultsByNetworkAndProtocolFromGraph(
    !hasSearchTerm && hasNetworkFilter && hasProtocolFilter
      ? networkFilter
      : "",
    !hasSearchTerm && hasNetworkFilter && hasProtocolFilter
      ? protocolFilter
      : "",
    !hasSearchTerm && hasNetworkFilter && hasProtocolFilter ? effectiveFirst : 0,
    !hasSearchTerm && hasNetworkFilter && hasProtocolFilter ? effectiveSkip : 0,
    graphSortBy,
    sortOrder,
  );

  const searchOnlyData = useSearchVaultsPaginatedFromGraph(
    hasSearchTerm && !hasNetworkFilter && !hasProtocolFilter
      ? trimmedSearchTerm
      : "",
    hasSearchTerm && !hasNetworkFilter && !hasProtocolFilter ? effectiveFirst : 0,
    hasSearchTerm && !hasNetworkFilter && !hasProtocolFilter ? effectiveSkip : 0,
    graphSortBy,
    sortOrder,
  );

  const networkOnlyData = useVaultsByNetworkFromGraph(
    !hasSearchTerm && hasNetworkFilter && !hasProtocolFilter
      ? networkFilter
      : "",
    !hasSearchTerm && hasNetworkFilter && !hasProtocolFilter ? effectiveFirst : 0,
    !hasSearchTerm && hasNetworkFilter && !hasProtocolFilter ? effectiveSkip : 0,
    graphSortBy,
    sortOrder,
  );

  const protocolOnlyData = useVaultsByProtocolFromGraph(
    !hasSearchTerm && !hasNetworkFilter && hasProtocolFilter
      ? protocolFilter
      : "",
    !hasSearchTerm && !hasNetworkFilter && hasProtocolFilter ? effectiveFirst : 0,
    !hasSearchTerm && !hasNetworkFilter && hasProtocolFilter ? effectiveSkip : 0,
    graphSortBy,
    sortOrder,
  );

  const defaultData = useVaultsPaginatedFromGraph(
    !hasSearchTerm && !hasNetworkFilter && !hasProtocolFilter ? effectiveFirst : 0,
    !hasSearchTerm && !hasNetworkFilter && !hasProtocolFilter ? effectiveSkip : 0,
    graphSortBy,
    sortOrder,
  );

  // Count hooks (always called at top level)
  const searchWithNetworkAndProtocolCount =
    useSearchVaultsWithNetworkAndProtocolCountFromGraph(
      hasSearchTerm && hasNetworkFilter && hasProtocolFilter
        ? trimmedSearchTerm
        : "",
      hasSearchTerm && hasNetworkFilter && hasProtocolFilter
        ? networkFilter
        : "",
      hasSearchTerm && hasNetworkFilter && hasProtocolFilter
        ? protocolFilter
        : "",
    );

  const searchWithNetworkCount = useSearchVaultsWithNetworkCountFromGraph(
    hasSearchTerm && hasNetworkFilter && !hasProtocolFilter
      ? trimmedSearchTerm
      : "",
    hasSearchTerm && hasNetworkFilter && !hasProtocolFilter
      ? networkFilter
      : "",
  );

  const searchWithProtocolCount = useSearchVaultsWithProtocolCountFromGraph(
    hasSearchTerm && !hasNetworkFilter && hasProtocolFilter
      ? trimmedSearchTerm
      : "",
    hasSearchTerm && !hasNetworkFilter && hasProtocolFilter
      ? protocolFilter
      : "",
  );

  const networkAndProtocolCount = useVaultsByNetworkAndProtocolCountFromGraph(
    !hasSearchTerm && hasNetworkFilter && hasProtocolFilter
      ? networkFilter
      : "",
    !hasSearchTerm && hasNetworkFilter && hasProtocolFilter
      ? protocolFilter
      : "",
  );

  const searchOnlyCount = useSearchVaultsCountFromGraph(
    hasSearchTerm && !hasNetworkFilter && !hasProtocolFilter
      ? trimmedSearchTerm
      : "",
  );

  const networkOnlyCount = useVaultsByNetworkCountFromGraph(
    !hasSearchTerm && hasNetworkFilter && !hasProtocolFilter
      ? networkFilter
      : "",
  );

  const protocolOnlyCount = useVaultsByProtocolCountFromGraph(
    !hasSearchTerm && !hasNetworkFilter && hasProtocolFilter
      ? protocolFilter
      : "",
  );

  const defaultCount = useVaultsCountFromGraph();

  // Select the appropriate data and counts based on filters
  const {
    data: subgraphData,
    isLoading: subgraphLoading,
    error: subgraphError,
  } = useMemo(() => {
    if (hasSearchTerm && hasNetworkFilter && hasProtocolFilter) {
      return searchWithNetworkAndProtocolData;
    } else if (hasSearchTerm && hasNetworkFilter) {
      return searchWithNetworkData;
    } else if (hasSearchTerm && hasProtocolFilter) {
      return searchWithProtocolData;
    } else if (hasNetworkFilter && hasProtocolFilter) {
      return networkAndProtocolData;
    } else if (hasSearchTerm) {
      return searchOnlyData;
    } else if (hasNetworkFilter) {
      return networkOnlyData;
    } else if (hasProtocolFilter) {
      return protocolOnlyData;
    } else {
      return defaultData;
    }
  }, [
    hasSearchTerm,
    hasNetworkFilter,
    hasProtocolFilter,
    searchWithNetworkAndProtocolData,
    searchWithNetworkData,
    searchWithProtocolData,
    networkAndProtocolData,
    searchOnlyData,
    networkOnlyData,
    protocolOnlyData,
    defaultData,
  ]);

  const { data: countData, isLoading: countLoading } = useMemo(() => {
    if (hasSearchTerm && hasNetworkFilter && hasProtocolFilter) {
      return searchWithNetworkAndProtocolCount;
    } else if (hasSearchTerm && hasNetworkFilter) {
      return searchWithNetworkCount;
    } else if (hasSearchTerm && hasProtocolFilter) {
      return searchWithProtocolCount;
    } else if (hasNetworkFilter && hasProtocolFilter) {
      return networkAndProtocolCount;
    } else if (hasSearchTerm) {
      return searchOnlyCount;
    } else if (hasNetworkFilter) {
      return networkOnlyCount;
    } else if (hasProtocolFilter) {
      return protocolOnlyCount;
    } else {
      return defaultCount;
    }
  }, [
    hasSearchTerm,
    hasNetworkFilter,
    hasProtocolFilter,
    searchWithNetworkAndProtocolCount,
    searchWithNetworkCount,
    searchWithProtocolCount,
    networkAndProtocolCount,
    searchOnlyCount,
    networkOnlyCount,
    protocolOnlyCount,
    defaultCount,
  ]);

  // Apply EXCLUDED_VAULTS filter to total count
  const totalCount = useMemo(() => {
    if (!countData?.vaults) return 0;
    const allVaults = countData.vaults.length;
    const filteredVaults = countData.vaults.filter(
      (vault: any) => !EXCLUDED_VAULTS.includes(vault.id),
    ).length;
    return filteredVaults;
  }, [countData]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Use subgraph if there are no errors and data
  const useGraphData = !subgraphError && subgraphData !== undefined;

  // Vaults only from subgraph (memoized)
  const vaults: VaultData[] = useMemo(() => {
    if (!useGraphData || !subgraphData?.vaults) return [];

    return subgraphData.vaults
      .filter((vault: any) => !EXCLUDED_VAULTS.includes(vault.id))
      .map(convertGraphVaultToVaultData);
  }, [useGraphData, subgraphData]);

  // APY: from subgraph or calculated
  const shouldUseGraphAPY = useMemo(() => {
    if (!useGraphData) return false;

    return subgraphData.vaults.some((v: any) => {
      try {
        return parseFloat(v.apy7d) > 0;
      } catch (error) {
        return false;
      }
    });
  }, [useGraphData, subgraphData]);

  // TVL: from subgraph or blockchain
  const shouldUseGraphTVL = useMemo(() => {
    if (!useGraphData) return false;

    return subgraphData.vaults.some((v: any) => {
      try {
        return BigInt(v.tvl || "0") > BigInt(0);
      } catch (error) {
        return false;
      }
    });
  }, [useGraphData, subgraphData]);

  // Token prices from context for universal price lookup
  const priceContextWS = useTokenPrices();

  // Legacy token prices for calculations and USD normalization
  const rawCrvTokenPriceWS = useTokenPriceBySymbol("CRV");
  const rawCvxTokenPriceWS = useTokenPriceBySymbol("CVX");
  const rawEthTokenPriceWS = useTokenPriceBySymbol("ETH");
  const rawCompTokenPriceWS = useTokenPriceBySymbol("COMP");
  const rawOpTokenPriceWS = useTokenPriceBySymbol("OP");
  const rawBtcTokenPrice = useTokenPriceBySymbol("CBBTC");

  const tokenPrices = useMemo(
    () => ({
      ...priceContextWS, // Add price context for universal lookup
      crvTokenPrice: rawCrvTokenPriceWS,
      cvxTokenPrice: rawCvxTokenPriceWS,
      ethTokenPrice: rawEthTokenPriceWS,
      compTokenPrice: rawCompTokenPriceWS,
      opTokenPrice: rawOpTokenPriceWS,
      btcTokenPrice: rawBtcTokenPrice,
    }),
    [
      priceContextWS,
      rawCrvTokenPriceWS,
      rawCvxTokenPriceWS,
      rawEthTokenPriceWS,
      rawCompTokenPriceWS,
      rawOpTokenPriceWS,
      rawBtcTokenPrice,
    ],
  );

  // Determine if all data is ready
  const isDataReady = useMemo(() => {
    // If using subgraph
    if (useGraphData || (!subgraphError && !subgraphLoading)) {
      // Data is ready if request is completed (even if result is empty)
      const dataLoaded = !subgraphLoading && !countLoading;
      const hasAPY = shouldUseGraphAPY ? vaultAPYs.length >= 0 : true;
      const hasTVL = shouldUseGraphTVL ? vaultTotalAssets.length >= 0 : true;

      return dataLoaded && hasAPY && hasTVL;
    }

    // If not using subgraph - no vaults
    return false;
  }, [
    useGraphData,
    subgraphLoading,
    countLoading,
    subgraphError,
    shouldUseGraphAPY,
    vaultAPYs.length,
    shouldUseGraphTVL,
    vaultTotalAssets.length,
  ]);

  // APY calculations (only if not using subgraph and there are vaults)
  useUpdateAPYs(
    !shouldUseGraphAPY && vaults.length > 0 ? vaults : null, // pass null if not needed
    stableSetVaultAPYs,
    stableSetLoading,
    tokenPrices.crvTokenPrice,
    tokenPrices.cvxTokenPrice,
    tokenPrices.ethTokenPrice,
    tokenPrices.compTokenPrice,
    tokenPrices.opTokenPrice,
    tokenPrices.btcTokenPrice,
    wallet,
    false,
  );

  // Set data from subgraph if available
  useEffect(() => {
    if (!subgraphData?.vaults) {
      return;
    }

    // Set all data at once to avoid flickering
    const filteredVaults = subgraphData.vaults.filter(
      (vault: any) => !EXCLUDED_VAULTS.includes(vault.id),
    );

    // Set APY from subgraph
    // if (shouldUseGraphAPY) {
    //   const graphAPYs = filteredVaults.map(convertGraphVaultToAPY);
    //   setVaultAPYs(graphAPYs);
    // }

    // Set TVL from subgraph
    if (shouldUseGraphTVL) {
      const graphTotalAssets = filteredVaults.map(
        convertGraphVaultToTotalAssets,
      );
      setVaultTotalAssets((prev) => {
        const map = new Map(prev.map((a) => [a.vaultId, a]));
        graphTotalAssets.forEach((a) => map.set(a.vaultId, a));
        return Array.from(map.values());
      });
    }
  }, [subgraphData, shouldUseGraphTVL]);

  // Global timeout (3 seconds) for request to avoid infinite loading
  useEffect(() => {
    // Reset timeout when search term changes
    setTimedOut(false);
    setLoading(hasSearchTerm || !!hasNetworkFilter || !!hasProtocolFilter);

    if (!hasSearchTerm && !hasNetworkFilter && !hasProtocolFilter) return;
    const TIMEOUT_MS = 3000;
    const timerId = setTimeout(() => {
      setTimedOut(true);
      setLoading(false);
    }, TIMEOUT_MS);
    return () => clearTimeout(timerId);
  }, [hasSearchTerm, hasNetworkFilter, hasProtocolFilter]);

  // Overall loading state
  const finalLoading = useMemo(() => {
    if (timedOut) return false; // stop loader after timeout

    if (useGraphData) {
      // For subgraph: show loading until data is loaded
      return subgraphLoading || countLoading || !isDataReady;
    }
    // If there is an error - don't show infinite loader
    if (subgraphError) return false;
    // If not using subgraph, show default loading
    return loading;
  }, [
    timedOut,
    useGraphData,
    subgraphLoading,
    countLoading,
    isDataReady,
    subgraphError,
    loading,
  ]);

  // Error state
  const hasError = useMemo(() => {
    return subgraphError && !subgraphLoading;
  }, [subgraphError, subgraphLoading]);

  // fetch stable/nonstable only when plain TVL sort without additional filters/search
  const shouldUseCustomTVLSort =
    isTVLSort && !hasSearchTerm && !hasNetworkFilter && !hasProtocolFilter;

  const {
    data: stableVaultsData2,
    isLoading: stableLoading2,
    error: stableError2,
  } = useStableVaultsSortedFromGraph();
  const {
    data: nonStableVaultsData2,
    isLoading: nonStableLoading2,
    error: nonStableError2,
  } = useNonStableVaultsSortedFromGraph();

  const combinedTVLData = useMemo(() => {
    if (!shouldUseCustomTVLSort) return undefined;

    const stableArr = stableVaultsData2?.vaults || [];
    const nonStableArr = nonStableVaultsData2?.vaults || [];

    return mergeSortedVaultsByTVL(stableArr, nonStableArr, tokenPrices, sortOrder);
  }, [shouldUseCustomTVLSort, stableVaultsData2, nonStableVaultsData2, tokenPrices, sortOrder]);


  // When we build custom TVL list, also derive VaultTotalAssets array once
  useEffect(() => {
    if (!isTVLSort || !combinedTVLData) return;

    const newTotalAssets = createTotalAssetsFromVaults(combinedTVLData);
    setVaultTotalAssets(prev => mergeVaultTotalAssets(prev, newTotalAssets));

    // Also merge APY data
    // const newAPYs: VaultAPY[] = combinedTVLData.map(convertGraphVaultToAPY);
    // const apyIds = new Set(newAPYs.map((a) => a.vaultId));
    // setVaultAPYs((prev) => [
    //   ...prev.filter((a) => !apyIds.has(a.vaultId)),
    //   ...newAPYs,
    // ]);


    // Guarantee every vault has an APY entry (fallback 0)
    setVaultAPYs((prev) => {
      const existing = new Set(prev.map((a) => a.vaultId));
      const missing: VaultAPY[] = combinedTVLData
        .filter((v: any) => !existing.has(v.id))
        .map((v: any) => ({ vaultId: v.id, APY7d: 0 }));
      return [...prev, ...missing];
    });
  }, [isTVLSort, combinedTVLData]);

  // For TVL sort with filters/search we need to re-sort the already filtered subgraph page by USD value.
  const sortedSubgraphTVLData = useMemo(() => {
    if (!isTVLSort || shouldUseCustomTVLSort) return undefined;
    if (!subgraphData?.vaults) return undefined;

    const withUSD = subgraphData.vaults.map((v: any) => ({
      v,
      usd: convertVaultToUSD(v, tokenPrices)
    }));

    withUSD.sort((a, b) =>
      sortOrder === "asc" ? a.usd - b.usd : b.usd - a.usd,
    );

    return withUSD.map((item) => item.v);
  }, [isTVLSort, shouldUseCustomTVLSort, subgraphData, sortOrder, tokenPrices]);

  // skip many hook calls when custom TVL sort
  // adjust later sections: when shouldUseCustomTVLSort use combinedTVLData else existing logic.

  const vaultsResult: VaultData[] = shouldUseCustomTVLSort
    ? (combinedTVLData || [])
      .filter((v: any) => !EXCLUDED_VAULTS.includes(v.id))
      .map(convertGraphVaultToVaultData)
    : isTVLSort
      ? (sortedSubgraphTVLData || [])
        .filter((v: any) => !EXCLUDED_VAULTS.includes(v.id))
        .map(convertGraphVaultToVaultData)
      : vaults;

  // Determine if we still miss APY for some vault (avoid infinite loops)
  const needsAPYUpdate = useMemo(() => {
    if (vaultsResult.length === 0) return false;
    return vaultsResult.some(
      (v) => !vaultAPYs.find((a) => a.vaultId === v.id),
    );
  }, [vaultsResult, vaultAPYs]);

  // APY calculations – only if there are vaults without APY
  useUpdateAPYs(
    needsAPYUpdate ? vaultsResult : null,
    stableSetVaultAPYs,
    stableSetLoading,
    tokenPrices.crvTokenPrice,
    tokenPrices.cvxTokenPrice,
    tokenPrices.ethTokenPrice,
    tokenPrices.compTokenPrice,
    tokenPrices.opTokenPrice,
    tokenPrices.btcTokenPrice,
    wallet,
    false,
  );

  // ------------------------------------------------------------------
  // TVL for TVL-sort WITH filters/search (sortedSubgraphTVLData)
  useEffect(() => {
    if (!isTVLSort || shouldUseCustomTVLSort) return;
    if (!sortedSubgraphTVLData) return;

    const newAssets = sortedSubgraphTVLData.map(convertGraphVaultToTotalAssets);
    setVaultTotalAssets(prev => mergeVaultTotalAssets(prev, newAssets));
  }, [isTVLSort, shouldUseCustomTVLSort, sortedSubgraphTVLData]);

  return {
    loading: finalLoading,
    vaults: vaultsResult,
    vaultAPYs,
    userVaultBalances,
    vaultTotalAssets,
    vaultTotalAssetsinToken,
    hasError,
    error: subgraphError,

    // Pagination
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,

    // Search
    searchTerm,
    hasSearchTerm,
    networkFilter,
    hasNetworkFilter,
    protocolFilter,
    hasProtocolFilter,

    // Additional debug information
    _debug: {
      useSubgraph: useGraphData,
      subgraphError: subgraphError?.message,
      subgraphLoading,
      countLoading,
      isDataReady,
      finalLoading,
      hasError,
      hasSearchTerm,
      hasNetworkFilter,
      hasProtocolFilter,
      timedOut,
      dataSource: {
        vaults: useGraphData ? "subgraph" : "static",
        apy: shouldUseGraphAPY ? "subgraph" : "blockchain",
        tvl: shouldUseGraphTVL ? "subgraph" : "blockchain",
        search: hasSearchTerm ? "subgraph" : "none",
        networkFilter: hasNetworkFilter ? "subgraph" : "none",
        protocolFilter: hasProtocolFilter ? "subgraph" : "none",
      },
    },
    timedOut,
  };
};

// Helper functions to reduce duplication
const convertVaultToUSD = (vault: any, tokenPrices: any): number => {
  try {
    const tvlUnits = BigInt(vault.tvl || "0");
    const decimals = vault.assetDecimals ?? 18;
    const tvlFloat = parseFloat(formatUnits(tvlUnits, decimals));
    const symbol = (vault.assetSymbol || "").toUpperCase();
    const price = getTokenPrice(symbol, tokenPrices);
    return tvlFloat * price;
  } catch {
    return 0;
  }
};

const mergeSortedVaultsByTVL = (
  stableVaults: any[],
  nonStableVaults: any[],
  tokenPrices: any,
  sortOrder: "asc" | "desc" = "desc"
): any[] => {
  // Pre-compute USD values
  const stableWithUSD = stableVaults.map(v => ({ v, usd: convertVaultToUSD(v, tokenPrices) }));
  const nonStableWithUSD = nonStableVaults.map(v => ({ v, usd: convertVaultToUSD(v, tokenPrices) }));

  const result: any[] = [];
  let i = 0, j = 0;
  const compareFunc = sortOrder === "desc"
    ? (a: number, b: number) => a >= b
    : (a: number, b: number) => a <= b;

  while (i < stableWithUSD.length && j < nonStableWithUSD.length) {
    if (compareFunc(nonStableWithUSD[j].usd, stableWithUSD[i].usd)) {
      result.push(nonStableWithUSD[j].v);
      j++;
    } else {
      result.push(stableWithUSD[i].v);
      i++;
    }
  }

  while (i < stableWithUSD.length) result.push(stableWithUSD[i++].v);
  while (j < nonStableWithUSD.length) result.push(nonStableWithUSD[j++].v);

  return result;
};

const createTotalAssetsFromVaults = (vaults: any[]): VaultTotalAssets[] => {
  return vaults.map(v => ({
    vaultId: v.id,
    totalAssets: formatUnits(BigInt(v.tvl || "0"), v.assetDecimals ?? 18),
  }));
};

const mergeVaultTotalAssets = (
  prevAssets: VaultTotalAssets[],
  newAssets: VaultTotalAssets[]
): VaultTotalAssets[] => {
  const existingIds = new Set(newAssets.map(a => a.vaultId));
  return [
    ...prevAssets.filter(a => !existingIds.has(a.vaultId)),
    ...newAssets,
  ];
};

// Custom hook for TVL sorting logic
const useTVLSorting = (
  isTVLSort: boolean,
  sortOrder: "asc" | "desc",
  tokenPrices: any,
  hasFilters: boolean = false
) => {
  // Fetch stable and non-stable vaults for custom TVL sorting
  const {
    data: stableVaultsData,
    isLoading: stableLoading,
    error: stableError,
  } = useStableVaultsSortedFromGraph();

  const {
    data: nonStableVaultsData,
    isLoading: nonStableLoading,
    error: nonStableError,
  } = useNonStableVaultsSortedFromGraph();

  // Combine and sort vaults by USD value
  const combinedVaultsData = useMemo(() => {
    if (!isTVLSort || hasFilters) return undefined;

    const stableList = stableVaultsData?.vaults || [];
    const nonStableList = nonStableVaultsData?.vaults || [];

    return mergeSortedVaultsByTVL(stableList, nonStableList, tokenPrices, sortOrder);
  }, [isTVLSort, hasFilters, stableVaultsData, nonStableVaultsData, tokenPrices, sortOrder]);

  const isLoading = stableLoading || nonStableLoading;
  const hasError = stableError || nonStableError;

  return {
    combinedVaultsData,
    isLoading,
    hasError,
    stableVaultsData,
    nonStableVaultsData,
  };
};
