import { useState, useEffect, useCallback } from 'react';
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

  // Function to refresh TVL data
  const refreshTVL = useCallback(async () => {
    if (!enabled || vaultIds.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if any vaults have external TVL data
      const vaultsWithExternalData = vaultIds.filter(vaultId => hasExternalTVLData(vaultId));
      
      if (vaultsWithExternalData.length === 0) {
        // No external data available, use existing data
        setEnhancedTotalAssets(existingTotalAssets);
        return;
      }

      // Merge external TVL data with existing data
      const mergedData = await mergeExternalTVLData(existingTotalAssets, vaultIds);
      setEnhancedTotalAssets(mergedData);
    } catch (err) {
      console.error('Failed to fetch external TVL data:', err);
      setError('Failed to fetch external TVL data');
      // Fall back to existing data on error
      setEnhancedTotalAssets(existingTotalAssets);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, vaultIds, existingTotalAssets]);

  // Effect to update enhanced data when existing data changes
  useEffect(() => {
    setEnhancedTotalAssets(existingTotalAssets);
  }, [existingTotalAssets]);

  // Effect to refresh TVL data when vault IDs change or on mount
  useEffect(() => {
    refreshTVL();
  }, [refreshTVL]);

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
  }, [fetchTVL]);

  return {
    tvl,
    isLoading,
    error,
    refresh: fetchTVL
  };
} 