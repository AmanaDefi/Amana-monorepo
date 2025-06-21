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
import { useVaultsFromGraph, useVaultsPaginatedFromGraph, useVaultsCountFromGraph, useUserVaultBalancesFromGraph, useSearchVaultsPaginatedFromGraph, useSearchVaultsCountFromGraph, useSearchVaultsPaginatedWithNetworkFromGraph, useSearchVaultsWithNetworkCountFromGraph, useVaultsByNetworkFromGraph, useVaultsByNetworkCountFromGraph, useVaultsByProtocolFromGraph, useVaultsByProtocolCountFromGraph, useSearchVaultsPaginatedWithProtocolFromGraph, useSearchVaultsWithProtocolCountFromGraph, useVaultsByNetworkAndProtocolFromGraph, useVaultsByNetworkAndProtocolCountFromGraph, useSearchVaultsPaginatedWithNetworkAndProtocolFromGraph, useSearchVaultsWithNetworkAndProtocolCountFromGraph } from "@/hooks/useVaultsGraph";
import {
  convertGraphVaultToVaultData,
  convertGraphVaultToAPY,
  convertGraphVaultToTotalAssets
} from "@/utils/graphUtils";
import { EXCLUDED_VAULTS } from "@/constants";

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

  const stableSetVaultAPYs = useCallback((vaultAPYs: VaultAPY[]) => {
    setVaultAPYs(vaultAPYs);
  }, []);

  const stableSetLoading = useCallback((loading: boolean) => {
    setLoading(loading);
  }, []);

  const {
    loading: userBalancesLoading,
    userVaultBalances: graphUserVaultBalances
  } = useUserVaultBalancesFromGraph(walletAddress || undefined);

  const stableUserVaultBalances = useMemo(() => {
    return graphUserVaultBalances;
  }, [JSON.stringify(graphUserVaultBalances)]);

  useEffect(() => {
    if (walletAddress && stableUserVaultBalances.length >= 0) {
      setUserVaultBalances(stableUserVaultBalances);
    } else if (!walletAddress) {
      setUserVaultBalances([]);
    }
  }, [walletAddress, stableUserVaultBalances]);

  const { data: subgraphData, isLoading: subgraphLoading, error: subgraphError } = useVaultsFromGraph();

  const useGraphData = !subgraphError && subgraphData !== undefined;

  // Vaults only from subgraph (memoized)
  const vaults: VaultData[] = useMemo(() => {
    if (!useGraphData || !subgraphData?.vaults) return [];

    return subgraphData.vaults
      .filter(vault => !EXCLUDED_VAULTS.includes(vault.id))
      .map(convertGraphVaultToVaultData);
  }, [useGraphData, subgraphData]);

  // APY: from subgraph or calculated
  const shouldUseGraphAPY = useMemo(() => {
    if (!useGraphData) return false;

    return subgraphData.vaults.some(v => {
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

    return subgraphData.vaults.some(v => {
      try {
        return BigInt(v.tvl || '0') > BigInt(0);
      } catch (error) {
        return false;
      }
    });
  }, [useGraphData, subgraphData]);

  // Token prices for APY calculations (memoized)
  const rawCrvTokenPrice = useTokenPriceBySymbol("CRV");
  const rawCvxTokenPrice = useTokenPriceBySymbol("CVX");
  const rawEthTokenPrice = useTokenPriceBySymbol("ETH");
  const rawCompTokenPrice = useTokenPriceBySymbol("COMP");
  const rawOpTokenPrice = useTokenPriceBySymbol("OP");

  // Memoize token prices to avoid constant changes
  const tokenPrices = useMemo(() => ({
    crvTokenPrice: rawCrvTokenPrice,
    cvxTokenPrice: rawCvxTokenPrice,
    ethTokenPrice: rawEthTokenPrice,
    compTokenPrice: rawCompTokenPrice,
    opTokenPrice: rawOpTokenPrice,
  }), [rawCrvTokenPrice, rawCvxTokenPrice, rawEthTokenPrice, rawCompTokenPrice, rawOpTokenPrice]);

  const isDataReady = useMemo(() => {
    if (useGraphData) {
      const hasVaults = vaults.length > 0;
      const hasAPY = shouldUseGraphAPY ? vaultAPYs.length > 0 : true;
      const hasTVL = shouldUseGraphTVL ? vaultTotalAssets.length > 0 : true;

      return !subgraphLoading && hasVaults && hasAPY && hasTVL;
    }

    return false;
  }, [useGraphData, subgraphLoading, vaults.length, shouldUseGraphAPY, vaultAPYs.length, shouldUseGraphTVL, vaultTotalAssets.length]);

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
    false,
  );

  useEffect(() => {
    if (!subgraphData?.vaults) {
      return;
    }

    // Set all data at once to avoid flickering
    const filteredVaults = subgraphData.vaults.filter(vault => !EXCLUDED_VAULTS.includes(vault.id));

    // Set APY from subgraph
    if (shouldUseGraphAPY) {
      const graphAPYs = filteredVaults.map(convertGraphVaultToAPY);
      setVaultAPYs(graphAPYs);
    }

    // Set TVL from subgraph
    if (shouldUseGraphTVL) {
      const graphTotalAssets = filteredVaults.map(convertGraphVaultToTotalAssets);
      setVaultTotalAssets(graphTotalAssets);
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
        vaults: useGraphData ? 'subgraph' : 'static',
        apy: shouldUseGraphAPY ? 'subgraph' : 'blockchain',
        tvl: shouldUseGraphTVL ? 'subgraph' : 'blockchain'
      }
    }
  };
};

// New hook with pagination
export const useVaultDataPaginated = (
  page: number = 1,
  pageSize: number = 10,
  sortBy: string = 'tvl',
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
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
    userVaultBalances: graphUserVaultBalances
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

  const skip = (page - 1) * pageSize;

  const graphSortBy = useMemo(() => {
    switch (sortBy.toLowerCase()) {
      case 'apy':
        return 'apy7d';
      case 'tvl':
        return 'tvl';
      case 'risk':
        return 'riskLevel';
      default:
        return 'tvl';
    }
  }, [sortBy]);

  const { data: subgraphData, isLoading: subgraphLoading, error: subgraphError } = useVaultsPaginatedFromGraph(
    pageSize,
    skip,
    graphSortBy,
    sortOrder
  );

  const { data: countData, isLoading: countLoading } = useVaultsCountFromGraph();
  const totalCount = useMemo(() => {
    if (!countData?.vaults) return 0;
    const allVaults = countData.vaults.length;
    const filteredVaults = countData.vaults.filter(vault => !EXCLUDED_VAULTS.includes(vault.id)).length;
    return filteredVaults;
  }, [countData]);
  const totalPages = Math.ceil(totalCount / pageSize);

  const useGraphData = !subgraphError && subgraphData !== undefined;
  const vaults: VaultData[] = useMemo(() => {
    if (!useGraphData || !subgraphData?.vaults) return [];

    return subgraphData.vaults
      .filter(vault => !EXCLUDED_VAULTS.includes(vault.id))
      .map(convertGraphVaultToVaultData);
  }, [useGraphData, subgraphData]);

  const shouldUseGraphAPY = useMemo(() => {
    if (!useGraphData) return false;

    return subgraphData.vaults.some(v => {
      try {
        return parseFloat(v.apy7d) > 0;
      } catch (error) {
        return false;
      }
    });
  }, [useGraphData, subgraphData]);

  const shouldUseGraphTVL = useMemo(() => {
    if (!useGraphData) return false;

    return subgraphData.vaults.some(v => {
      try {
        return BigInt(v.tvl || '0') > BigInt(0);
      } catch (error) {
        return false;
      }
    });
  }, [useGraphData, subgraphData]);

  const rawCrvTokenPrice = useTokenPriceBySymbol("CRV");
  const rawCvxTokenPrice = useTokenPriceBySymbol("CVX");
  const rawEthTokenPrice = useTokenPriceBySymbol("ETH");
  const rawCompTokenPrice = useTokenPriceBySymbol("COMP");
  const rawOpTokenPrice = useTokenPriceBySymbol("OP");

  const tokenPrices = useMemo(() => ({
    crvTokenPrice: rawCrvTokenPrice,
    cvxTokenPrice: rawCvxTokenPrice,
    ethTokenPrice: rawEthTokenPrice,
    compTokenPrice: rawCompTokenPrice,
    opTokenPrice: rawOpTokenPrice,
  }), [rawCrvTokenPrice, rawCvxTokenPrice, rawEthTokenPrice, rawCompTokenPrice, rawOpTokenPrice]);

  const isDataReady = useMemo(() => {
    if (useGraphData || (!subgraphError && !subgraphLoading)) {
      const dataLoaded = !subgraphLoading && !countLoading;
      const hasAPY = shouldUseGraphAPY ? vaultAPYs.length >= 0 : true;
      const hasTVL = shouldUseGraphTVL ? vaultTotalAssets.length >= 0 : true;

      return dataLoaded && hasAPY && hasTVL;
    }

    return false;
  }, [useGraphData, subgraphLoading, countLoading, subgraphError, shouldUseGraphAPY, vaultAPYs.length, shouldUseGraphTVL, vaultTotalAssets.length]);

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
    false,
  );

  // Set data from subgraph if available
  useEffect(() => {
    if (!subgraphData?.vaults) {
      return;
    }

    // Set all data at once to avoid flickering
    const filteredVaults = subgraphData.vaults.filter(vault => !EXCLUDED_VAULTS.includes(vault.id));

    // Set APY from subgraph
    if (shouldUseGraphAPY) {
      const graphAPYs = filteredVaults.map(convertGraphVaultToAPY);
      setVaultAPYs(graphAPYs);
    }

    // Set TVL from subgraph
    if (shouldUseGraphTVL) {
      const graphTotalAssets = filteredVaults.map(convertGraphVaultToTotalAssets);
      setVaultTotalAssets(graphTotalAssets);
    }
  }, [subgraphData, shouldUseGraphAPY, shouldUseGraphTVL]);

  // Separate effect to manage loading state
  useEffect(() => {
    if (subgraphLoading || countLoading) {
      setLoading(true);
    } else if (isDataReady) {
      setLoading(false);
    }
  }, [subgraphLoading, countLoading, isDataReady]);

  // Overall loading state
  const finalLoading = useMemo(() => {
    if (useGraphData) {
      return subgraphLoading || countLoading || !isDataReady;
    }

    return loading;
  }, [useGraphData, subgraphLoading, countLoading, isDataReady, loading]);

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

    // Additional debug information (optional)
    _debug: {
      useSubgraph: useGraphData,
      subgraphError: subgraphError?.message,
      subgraphLoading,
      countLoading,
      isDataReady,
      finalLoading,
      hasError,
      totalCount,
      totalPages,
      skip,
      dataSource: {
        vaults: useGraphData ? 'subgraph' : 'static',
        apy: shouldUseGraphAPY ? 'subgraph' : 'blockchain',
        tvl: shouldUseGraphTVL ? 'subgraph' : 'blockchain'
      }
    }
  };
};

export const useVaultDataWithSearch = (
  searchTerm: string = '',
  page: number = 1,
  pageSize: number = 10,
  sortBy: string = 'tvl',
  sortOrder: 'asc' | 'desc' = 'desc',
  networkFilter: string = '',
  protocolFilter: string = ''
) => {
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
    userVaultBalances: graphUserVaultBalances
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

  // Calculate skip for pagination
  const skip = (page - 1) * pageSize;

  // Mapping sortBy for subgraph
  const graphSortBy = useMemo(() => {
    switch (sortBy.toLowerCase()) {
      case 'apy':
        return 'apy7d';
      case 'tvl':
        return 'normalizedTVL';
      case 'risk':
        return 'riskLevel';
      default:
        return 'tvl';
    }
  }, [sortBy]);

  // Determine if search should be used
  const trimmedSearchTerm = searchTerm.trim();
  const hasNetworkFilter = networkFilter && networkFilter.length > 0;
  const hasProtocolFilter = protocolFilter && protocolFilter.length > 0;
  const hasSearchTerm = trimmedSearchTerm.length > 0 &&
    trimmedSearchTerm.length <= 100 && // Maximum 100 characters
    (
      // Minimum 6 characters for addresses (0x + 4 characters)
      !trimmedSearchTerm.startsWith('0x') || trimmedSearchTerm.length >= 6
    );

  // Data from subgraph (different variants depending on filters)
  const { data: subgraphData, isLoading: subgraphLoading, error: subgraphError } = (() => {
    if (hasSearchTerm && hasNetworkFilter && hasProtocolFilter) {
      // Search + network filter + protocol filter
      return useSearchVaultsPaginatedWithNetworkAndProtocolFromGraph(trimmedSearchTerm, networkFilter, protocolFilter, pageSize, skip, graphSortBy, sortOrder);
    } else if (hasSearchTerm && hasNetworkFilter) {
      // Search + network filter
      return useSearchVaultsPaginatedWithNetworkFromGraph(trimmedSearchTerm, networkFilter, pageSize, skip, graphSortBy, sortOrder);
    } else if (hasSearchTerm && hasProtocolFilter) {
      // Search + protocol filter
      return useSearchVaultsPaginatedWithProtocolFromGraph(trimmedSearchTerm, protocolFilter, pageSize, skip, graphSortBy, sortOrder);
    } else if (hasNetworkFilter && hasProtocolFilter) {
      // Network filter + protocol filter
      return useVaultsByNetworkAndProtocolFromGraph(networkFilter, protocolFilter, pageSize, skip, graphSortBy, sortOrder);
    } else if (hasSearchTerm) {
      // Only search
      return useSearchVaultsPaginatedFromGraph(trimmedSearchTerm, pageSize, skip, graphSortBy, sortOrder);
    } else if (hasNetworkFilter) {
      // Only network filter
      return useVaultsByNetworkFromGraph(networkFilter, pageSize, skip, graphSortBy, sortOrder);
    } else if (hasProtocolFilter) {
      // Only protocol filter
      return useVaultsByProtocolFromGraph(protocolFilter, pageSize, skip, graphSortBy, sortOrder);
    } else {
      // Default pagination
      return useVaultsPaginatedFromGraph(pageSize, skip, graphSortBy, sortOrder);
    }
  })();

  // Total number of vaults (different variants depending on filters)
  const { data: countData, isLoading: countLoading } = (() => {
    if (hasSearchTerm && hasNetworkFilter && hasProtocolFilter) {
      // Search + network filter + protocol filter
      return useSearchVaultsWithNetworkAndProtocolCountFromGraph(trimmedSearchTerm, networkFilter, protocolFilter);
    } else if (hasSearchTerm && hasNetworkFilter) {
      // Search + network filter
      return useSearchVaultsWithNetworkCountFromGraph(trimmedSearchTerm, networkFilter);
    } else if (hasSearchTerm && hasProtocolFilter) {
      // Search + protocol filter
      return useSearchVaultsWithProtocolCountFromGraph(trimmedSearchTerm, protocolFilter);
    } else if (hasNetworkFilter && hasProtocolFilter) {
      // Network filter + protocol filter
      return useVaultsByNetworkAndProtocolCountFromGraph(networkFilter, protocolFilter);
    } else if (hasSearchTerm) {
      // Only search
      return useSearchVaultsCountFromGraph(trimmedSearchTerm);
    } else if (hasNetworkFilter) {
      // Only network filter
      return useVaultsByNetworkCountFromGraph(networkFilter);
    } else if (hasProtocolFilter) {
      // Only protocol filter
      return useVaultsByProtocolCountFromGraph(protocolFilter);
    } else {
      // Default count
      return useVaultsCountFromGraph();
    }
  })();

  // Apply EXCLUDED_VAULTS filter to total count
  const totalCount = useMemo(() => {
    if (!countData?.vaults) return 0;
    const allVaults = countData.vaults.length;
    const filteredVaults = countData.vaults.filter(vault => !EXCLUDED_VAULTS.includes(vault.id)).length;
    return filteredVaults;
  }, [countData]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Use subgraph if there are no errors and data
  const useGraphData = !subgraphError && subgraphData !== undefined;

  // Vaults only from subgraph (memoized)
  const vaults: VaultData[] = useMemo(() => {
    if (!useGraphData || !subgraphData?.vaults) return [];

    return subgraphData.vaults
      .filter(vault => !EXCLUDED_VAULTS.includes(vault.id))
      .map(convertGraphVaultToVaultData);
  }, [useGraphData, subgraphData]);

  // APY: from subgraph or calculated  
  const shouldUseGraphAPY = useMemo(() => {
    if (!useGraphData) return false;

    return subgraphData.vaults.some(v => {
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

    return subgraphData.vaults.some(v => {
      try {
        return BigInt(v.tvl || '0') > BigInt(0);
      } catch (error) {
        return false;
      }
    });
  }, [useGraphData, subgraphData]);

  // Token prices for APY calculations (memoized)
  const rawCrvTokenPrice = useTokenPriceBySymbol("CRV");
  const rawCvxTokenPrice = useTokenPriceBySymbol("CVX");
  const rawEthTokenPrice = useTokenPriceBySymbol("ETH");
  const rawCompTokenPrice = useTokenPriceBySymbol("COMP");
  const rawOpTokenPrice = useTokenPriceBySymbol("OP");

  // Memoize token prices to avoid constant changes
  const tokenPrices = useMemo(() => ({
    crvTokenPrice: rawCrvTokenPrice,
    cvxTokenPrice: rawCvxTokenPrice,
    ethTokenPrice: rawEthTokenPrice,
    compTokenPrice: rawCompTokenPrice,
    opTokenPrice: rawOpTokenPrice,
  }), [rawCrvTokenPrice, rawCvxTokenPrice, rawEthTokenPrice, rawCompTokenPrice, rawOpTokenPrice]);

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
  }, [useGraphData, subgraphLoading, countLoading, subgraphError, shouldUseGraphAPY, vaultAPYs.length, shouldUseGraphTVL, vaultTotalAssets.length]);

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
    false,
  );

  // Set data from subgraph if available
  useEffect(() => {
    if (!subgraphData?.vaults) {
      return;
    }

    // Set all data at once to avoid flickering
    const filteredVaults = subgraphData.vaults.filter(vault => !EXCLUDED_VAULTS.includes(vault.id));

    // Set APY from subgraph
    if (shouldUseGraphAPY) {
      const graphAPYs = filteredVaults.map(convertGraphVaultToAPY);
      setVaultAPYs(graphAPYs);
    }

    // Set TVL from subgraph
    if (shouldUseGraphTVL) {
      const graphTotalAssets = filteredVaults.map(convertGraphVaultToTotalAssets);
      setVaultTotalAssets(graphTotalAssets);
    }
  }, [subgraphData, shouldUseGraphAPY, shouldUseGraphTVL]);

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
  }, [hasSearchTerm, hasNetworkFilter, hasProtocolFilter, trimmedSearchTerm, networkFilter, protocolFilter]);

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
  }, [timedOut, useGraphData, subgraphLoading, countLoading, isDataReady, subgraphError, loading]);

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
        vaults: useGraphData ? 'subgraph' : 'static',
        apy: shouldUseGraphAPY ? 'subgraph' : 'blockchain',
        tvl: shouldUseGraphTVL ? 'subgraph' : 'blockchain',
        search: hasSearchTerm ? 'subgraph' : 'none',
        networkFilter: hasNetworkFilter ? 'subgraph' : 'none',
        protocolFilter: hasProtocolFilter ? 'subgraph' : 'none'
      }
    },
    timedOut,
  };
};