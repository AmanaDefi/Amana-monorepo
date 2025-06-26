import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { graphClient } from '@/service/graphClient';
import { 
  GetVaultsResponse, 
  GetVaultDetailsResponse, 
  GetUserPositionsResponse,
  GetUserTransactionsResponse,
} from '@/types/graphTypes';
import { UserVaultBalance } from '@/types/types';
import { 
  convertGraphUserPositionToBalance
} from '@/utils/graphUtils';
import { EXCLUDED_VAULTS } from '@/constants';


export function useVaultsFromGraph() {
  return useQuery<GetVaultsResponse, Error>({
    queryKey: ["vaults-graph"],
    queryFn: () => graphClient.getVaults(EXCLUDED_VAULTS),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useVaultsPaginatedFromGraph(
  first: number = 10,
  skip: number = 0,
  orderBy: string = 'tvl',
  orderDirection: 'asc' | 'desc' = 'desc'
) {
  return useQuery<GetVaultsResponse, Error>({
    queryKey: ["vaults-paginated-graph", first, skip, orderBy, orderDirection],
    queryFn: () =>
      graphClient.getVaultsPaginated(
        first,
        skip,
        orderBy,
        orderDirection,
        EXCLUDED_VAULTS,
      ),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}

export function useVaultsCountFromGraph() {
  return useQuery<{ vaults: Array<{ id: string }> }, Error>({
    queryKey: ["vaults-count-graph"],
    queryFn: () => graphClient.getVaultsCount(EXCLUDED_VAULTS),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}

export function useSearchVaultsPaginatedFromGraph(
  searchTerm: string,
  first: number = 10,
  skip: number = 0,
  orderBy: string = 'tvl',
  orderDirection: 'asc' | 'desc' = 'desc'
) {
  return useQuery<GetVaultsResponse, Error>({
    queryKey: ['search-vaults-paginated-graph', searchTerm, first, skip, orderBy, orderDirection],
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search request timeout')), 3000)
      );
      
      const searchPromise = graphClient.searchVaultsPaginated(
        searchTerm,
        first,
        skip,
        orderBy,
        orderDirection,
        EXCLUDED_VAULTS,
      );
      
      return Promise.race([searchPromise, timeoutPromise]) as Promise<GetVaultsResponse>;
    },
    enabled: !!searchTerm && searchTerm.length > 0 && searchTerm.length <= 100 && (
      // For addresses, minimum 6 characters (0x + 4 characters)
      !searchTerm.startsWith('0x') || searchTerm.length >= 6
    ), // Execute only if there is a search term, it is long enough and not too long
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1, 
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}

export function useSearchVaultsCountFromGraph(searchTerm: string) {
  return useQuery<{ vaults: Array<{ id: string }> }, Error>({
    queryKey: ['search-vaults-count-graph', searchTerm],
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search count request timeout')), 3000)
      );
      
      const countPromise = graphClient.getSearchVaultsCount(
        searchTerm,
        EXCLUDED_VAULTS,
      );
      
      return Promise.race([countPromise, timeoutPromise]) as Promise<{ vaults: Array<{ id: string }> }>;
    },
    enabled: !!searchTerm && searchTerm.length > 0 && searchTerm.length <= 100 && (
      // For addresses, minimum 6 characters (0x + 4 characters)
      !searchTerm.startsWith('0x') || searchTerm.length >= 6
    ), // Execute only if there is a search term, it is long enough and not too long
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}

export function useVaultDetailsFromGraph(vaultId: string) {
  return useQuery<GetVaultDetailsResponse, Error>({
    queryKey: ['vault-details-graph', vaultId],
    queryFn: () => graphClient.getVaultDetails(vaultId),
    enabled: !!vaultId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useUserPositionsFromGraph(userAddress?: string) {
  return useQuery<GetUserPositionsResponse, Error>({
    queryKey: ['user-positions-graph', userAddress],
    queryFn: async () => {
      const result = await graphClient.getUserPositions(userAddress!);
      return result;
    },
    enabled: !!userAddress,
    staleTime: 15 * 1000,
    gcTime: 2 * 60 * 1000,
    retry: 2,
  });
}

export function useUserTransactionsFromGraph(
  userAddress?: string,
  first: number = 50,
  skip: number = 0
) {
  return useQuery<GetUserTransactionsResponse, Error>({
    queryKey: ['user-transactions-graph', userAddress, first, skip],
    queryFn: () => graphClient.getUserTransactions(userAddress!, first, skip),
    enabled: !!userAddress,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useUserVaultBalancesFromGraph(userAddress?: string) {
  const { data: userPositionsData, isLoading, error } = useUserPositionsFromGraph(userAddress);

  const userVaultBalances: UserVaultBalance[] = userPositionsData?.userPositions.map(
    convertGraphUserPositionToBalance
  ) || [];
  return {
    loading: isLoading,
    userVaultBalances,
    userPositions: userPositionsData?.userPositions || [],
    error
  };
}


export function useVaultsByNetworkFromGraph(
  network: string,
  first: number = 10,
  skip: number = 0,
  orderBy: string = 'tvl',
  orderDirection: 'asc' | 'desc' = 'desc'
) {
  return useQuery<GetVaultsResponse, Error>({
    queryKey: ['vaults-by-network-graph', network, first, skip, orderBy, orderDirection],
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network filter request timeout')), 3000)
      );
      
      const networkPromise = graphClient.getVaultsByNetwork(network, first, skip, orderBy, orderDirection);
      
      return Promise.race([networkPromise, timeoutPromise]) as Promise<GetVaultsResponse>;
    },
    enabled: !!network && network.length > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}

export function useVaultsByNetworkCountFromGraph(network: string) {
  return useQuery<{ vaults: Array<{ id: string }> }, Error>({
    queryKey: ['vaults-by-network-count-graph', network],
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network count request timeout')), 3000)
      );
      
      const countPromise = graphClient.getVaultsByNetworkCount(network);
      
      return Promise.race([countPromise, timeoutPromise]) as Promise<{ vaults: Array<{ id: string }> }>;
    },
    enabled: !!network && network.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}

export function useSearchVaultsPaginatedWithNetworkFromGraph(
  searchTerm: string,
  network: string,
  first: number = 10,
  skip: number = 0,
  orderBy: string = 'tvl',
  orderDirection: 'asc' | 'desc' = 'desc'
) {
  return useQuery<GetVaultsResponse, Error>({
    queryKey: ['search-vaults-with-network-graph', searchTerm, network, first, skip, orderBy, orderDirection],
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search with network request timeout')), 3000)
      );
      
      const searchPromise = graphClient.searchVaultsPaginatedWithNetwork(searchTerm, network, first, skip, orderBy, orderDirection);
      
      return Promise.race([searchPromise, timeoutPromise]) as Promise<GetVaultsResponse>;
    },
    enabled: !!searchTerm && searchTerm.length > 0 && searchTerm.length <= 100 && !!network && network.length > 0 && (
      !searchTerm.startsWith('0x') || searchTerm.length >= 6
    ),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}

export function useSearchVaultsWithNetworkCountFromGraph(searchTerm: string, network: string) {
  return useQuery<{ vaults: Array<{ id: string }> }, Error>({
    queryKey: ['search-vaults-with-network-count-graph', searchTerm, network],
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search with network count request timeout')), 3000)
      );
      
      const countPromise = graphClient.getSearchVaultsWithNetworkCount(searchTerm, network);
      
      return Promise.race([countPromise, timeoutPromise]) as Promise<{ vaults: Array<{ id: string }> }>;
    },
    enabled: !!searchTerm && searchTerm.length > 0 && searchTerm.length <= 100 && !!network && network.length > 0 && (
      !searchTerm.startsWith('0x') || searchTerm.length >= 6
    ),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}

export function useVaultsByProtocolFromGraph(
  protocol: string,
  first: number = 10,
  skip: number = 0,
  orderBy: string = 'tvl',
  orderDirection: 'asc' | 'desc' = 'desc'
) {
  return useQuery<GetVaultsResponse, Error>({
    queryKey: ['vaults-by-protocol-graph', protocol, first, skip, orderBy, orderDirection],
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Vaults by protocol request timeout')), 3000)
      );
      
      const vaultsPromise = graphClient.getVaultsByProtocol(protocol, first, skip, orderBy, orderDirection);
      
      return Promise.race([vaultsPromise, timeoutPromise]) as Promise<GetVaultsResponse>;
    },
    enabled: !!protocol && protocol.length > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}

export function useVaultsByProtocolCountFromGraph(protocol: string) {
  return useQuery<{ vaults: Array<{ id: string }> }, Error>({
    queryKey: ['vaults-by-protocol-count-graph', protocol],
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Vaults by protocol count request timeout')), 3000)
      );
      
      const countPromise = graphClient.getVaultsByProtocolCount(protocol);
      
      return Promise.race([countPromise, timeoutPromise]) as Promise<{ vaults: Array<{ id: string }> }>;
    },
    enabled: !!protocol && protocol.length > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}

export function useSearchVaultsPaginatedWithProtocolFromGraph(
  searchTerm: string,
  protocol: string,
  first: number = 10,
  skip: number = 0,
  orderBy: string = 'tvl',
  orderDirection: 'asc' | 'desc' = 'desc'
) {
  return useQuery<GetVaultsResponse, Error>({
    queryKey: ['search-vaults-with-protocol-graph', searchTerm, protocol, first, skip, orderBy, orderDirection],
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search with protocol request timeout')), 3000)
      );
      
      const searchPromise = graphClient.searchVaultsPaginatedWithProtocol(searchTerm, protocol, first, skip, orderBy, orderDirection);
      
      return Promise.race([searchPromise, timeoutPromise]) as Promise<GetVaultsResponse>;
    },
    enabled: !!searchTerm && searchTerm.length > 0 && searchTerm.length <= 100 && !!protocol && protocol.length > 0 && (
      !searchTerm.startsWith('0x') || searchTerm.length >= 6
    ),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
} 

export function useSearchVaultsWithProtocolCountFromGraph(searchTerm: string, protocol: string) {
  return useQuery<{ vaults: Array<{ id: string }> }, Error>({
    queryKey: ['search-vaults-with-protocol-count-graph', searchTerm, protocol],
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search count with protocol request timeout')), 3000)
      );
      
      const searchPromise = graphClient.getSearchVaultsWithProtocolCount(searchTerm, protocol);
      
      return Promise.race([searchPromise, timeoutPromise]) as Promise<{ vaults: Array<{ id: string }> }>;
    },
    enabled: !!searchTerm && searchTerm.length > 0 && searchTerm.length <= 100 && !!protocol && protocol.length > 0 && (
      !searchTerm.startsWith('0x') || searchTerm.length >= 6
    ),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}

export function useVaultsByNetworkAndProtocolFromGraph(
  network: string,
  protocol: string,
  first: number = 10,
  skip: number = 0,
  orderBy: string = 'tvl',
  orderDirection: 'asc' | 'desc' = 'desc'
) {
  return useQuery<GetVaultsResponse, Error>({
    queryKey: ['vaults-by-network-and-protocol-graph', network, protocol, first, skip, orderBy, orderDirection],
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Vaults by network and protocol request timeout')), 3000)
      );
      
      const vaultsPromise = graphClient.getVaultsByNetworkAndProtocol(network, protocol, first, skip, orderBy, orderDirection);
      
      return Promise.race([vaultsPromise, timeoutPromise]) as Promise<GetVaultsResponse>;
    },
    enabled: !!network && network.length > 0 && !!protocol && protocol.length > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}

export function useVaultsByNetworkAndProtocolCountFromGraph(network: string, protocol: string) {
  return useQuery<{ vaults: Array<{ id: string }> }, Error>({
    queryKey: ['vaults-by-network-and-protocol-count-graph', network, protocol],
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Vaults by network and protocol count request timeout')), 3000)
      );
      
      const countPromise = graphClient.getVaultsByNetworkAndProtocolCount(network, protocol);
      
      return Promise.race([countPromise, timeoutPromise]) as Promise<{ vaults: Array<{ id: string }> }>;
    },
    enabled: !!network && network.length > 0 && !!protocol && protocol.length > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}

export function useSearchVaultsPaginatedWithNetworkAndProtocolFromGraph(
  searchTerm: string,
  network: string,
  protocol: string,
  first: number = 10,
  skip: number = 0,
  orderBy: string = 'tvl',
  orderDirection: 'asc' | 'desc' = 'desc'
) {
  return useQuery<GetVaultsResponse, Error>({
    queryKey: ['search-vaults-with-network-and-protocol-graph', searchTerm, network, protocol, first, skip, orderBy, orderDirection],
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search with network and protocol request timeout')), 3000)
      );
      
      const searchPromise = graphClient.searchVaultsPaginatedWithNetworkAndProtocol(searchTerm, network, protocol, first, skip, orderBy, orderDirection);
      
      return Promise.race([searchPromise, timeoutPromise]) as Promise<GetVaultsResponse>;
    },
    enabled: !!searchTerm && searchTerm.length > 0 && searchTerm.length <= 100 && !!network && network.length > 0 && !!protocol && protocol.length > 0 && (
      !searchTerm.startsWith('0x') || searchTerm.length >= 6
    ),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}

export function useSearchVaultsWithNetworkAndProtocolCountFromGraph(searchTerm: string, network: string, protocol: string) {
  return useQuery<{ vaults: Array<{ id: string }> }, Error>({
    queryKey: ['search-vaults-with-network-and-protocol-count-graph', searchTerm, network, protocol],
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search count with network and protocol request timeout')), 3000)
      );
      
      const searchPromise = graphClient.getSearchVaultsWithNetworkAndProtocolCount(searchTerm, network, protocol);
      
      return Promise.race([searchPromise, timeoutPromise]) as Promise<{ vaults: Array<{ id: string }> }>;
    },
    enabled: !!searchTerm && searchTerm.length > 0 && searchTerm.length <= 100 && !!network && network.length > 0 && !!protocol && protocol.length > 0 && (
      !searchTerm.startsWith('0x') || searchTerm.length >= 6
    ),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
} 