import { useState, useEffect, useCallback, useRef } from 'react';
import { VaultTotalAssets } from '@/types/types';
import { mergeExternalTVLData, getBestAvailableTVL, hasExternalTVLData } from '@/utils/tvlData';

interface UseExternalTVLProps {
  vaultIds: string[];
  existingTotalAssets: VaultTotalAssets[];
  enabled?: boolean;
}

interface UseExternalTVLReturn {
  enhancedTotalAssets: VaultTotalAssets[];
  isLoading: boolean;
  error: string | null;
  refreshTVL: () => Promise<void>;
}

interface TVLCacheEntry {
  data: VaultTotalAssets[];
  timestamp: number;
  vaultIdsHash: string;
}

const TVL_CACHE_DURATION = 30 * 60 * 1000; 
let globalTVLCache: TVLCacheEntry | null = null;

function createVaultIdsHash(vaultIds: string[]): string {
  return vaultIds.sort().join(',');
}

function isCacheValid(cache: TVLCacheEntry | null, vaultIds: string[]): boolean {
  if (!cache) return false;
  
  const now = Date.now();
  const isExpired = now - cache.timestamp > TVL_CACHE_DURATION;
  const vaultIdsHash = createVaultIdsHash(vaultIds);
  const isSameVaultIds = cache.vaultIdsHash === vaultIdsHash;
  
  return !isExpired && isSameVaultIds;
}

/**
 * Custom hook to integrate external TVL data (DefiLlama, Noon Capital) with existing vault data
 */
export function useExternalTVL({
  vaultIds,
  existingTotalAssets,
  enabled = true
}: UseExternalTVLProps): UseExternalTVLReturn {
  const [enhancedTotalAssets, setEnhancedTotalAssets] = useState<VaultTotalAssets[]>(existingTotalAssets);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const existingTotalAssetsRef = useRef(existingTotalAssets);
  const lastVaultIdsHashRef = useRef<string>('');
  
  useEffect(() => {
    existingTotalAssetsRef.current = existingTotalAssets;
  }, [existingTotalAssets]);

  const refreshTVL = useCallback(async () => {
    if (!enabled || vaultIds.length === 0) return;

    const vaultIdsHash = createVaultIdsHash(vaultIds);
    
    if (isCacheValid(globalTVLCache, vaultIds)) {
      setEnhancedTotalAssets(globalTVLCache!.data);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const vaultsWithExternalData = vaultIds.filter(vaultId => hasExternalTVLData(vaultId));
      
      if (vaultsWithExternalData.length === 0) {
        setEnhancedTotalAssets(existingTotalAssetsRef.current);
        return;
      }

      const mergedData = await mergeExternalTVLData(existingTotalAssetsRef.current, vaultIds);
      
      globalTVLCache = {
        data: mergedData,
        timestamp: Date.now(),
        vaultIdsHash: vaultIdsHash
      };
      
      setEnhancedTotalAssets(mergedData);
    } catch (err) {
      console.error('Failed to fetch external TVL data:', err);
      setError('Failed to fetch external TVL data');
      setEnhancedTotalAssets(existingTotalAssetsRef.current);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, vaultIds]); 

  useEffect(() => {
    if (enabled && vaultIds.length > 0) {
      refreshTVL();
    }
  }, [enabled]); 

  return {
    enhancedTotalAssets,
    isLoading,
    error,
    refreshTVL
  };
}

/**
 * Hook to get the best available TVL for a specific vault
 */
export function useVaultTVL(vaultId: string, existingTotalAssets: VaultTotalAssets[]) {
  const [tvl, setTvl] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTVL = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const bestTVL = await getBestAvailableTVL(vaultId, existingTotalAssets);
      setTvl(bestTVL);
    } catch (err) {
      console.error(`Failed to fetch TVL for vault ${vaultId}:`, err);
      setError('Failed to fetch TVL data');
      setTvl(null);
    } finally {
      setIsLoading(false);
    }
  }, [vaultId, existingTotalAssets]); 

  useEffect(() => {
    fetchTVL();
  }, [vaultId, existingTotalAssets]); 

  return {
    tvl,
    isLoading,
    error,
    refresh: fetchTVL
  };
} 