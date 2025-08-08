import { useState, useEffect, useCallback, useMemo } from 'react';
import { VaultData } from '@/types/types';
import { ExponentialRiskRating } from '@/types/exponentialTypes';
import { apiService } from '@/service';
import { EXPONENTIAL_TO_RISK_LEVEL } from '@/types/exponentialTypes';
import { RISK_RATING_CONFIG } from '@/config/riskRatingConfig';

interface UseRiskRatingsOptions {
  vaults: VaultData[];
  enabled?: boolean;
  showProtocolRisk?: boolean;
  showAssetRisk?: boolean;
}

interface UseRiskRatingsReturn {
  riskRatings: Map<string, ExponentialRiskRating | null>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getRiskLevel: (vaultId: string) => number | null;
}

export const useRiskRatings = ({
  vaults,
  enabled = RISK_RATING_CONFIG.enabled,
  showProtocolRisk = RISK_RATING_CONFIG.showProtocolRisk,
  showAssetRisk = RISK_RATING_CONFIG.showAssetRisk,
}: UseRiskRatingsOptions): UseRiskRatingsReturn => {
  const [riskRatings, setRiskRatings] = useState<Map<string, ExponentialRiskRating | null>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a stable key from the list of vault IDs to avoid refetching on every render
  const vaultKey = useMemo(() => {
    if (!vaults || vaults.length === 0) return '';
    try {
      return vaults.map(v => v.id.toLowerCase()).sort().join(',');
    } catch {
      return String(vaults.length);
    }
  }, [vaults]);

  const fetchRiskRatings = useCallback(async () => {
    if (!enabled || vaults.length === 0) {
      console.log('[useRiskRatings] Skipping fetch - disabled or no vaults');
      return;
    }

    console.log(`[useRiskRatings] Starting fetch for ${vaults.length} vaults`);
    console.log('[useRiskRatings] Configuration:', {
      enabled,
      showProtocolRisk,
      showAssetRisk,
      vaultCount: vaults.length
    });
    
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useRiskRatings] Fetching risk ratings for ${vaults.length} vaults`);
      const ratings = await apiService.exponential.getBatchRiskRatings(vaults);
      console.log('[useRiskRatings] Received ratings:', ratings);
      console.log('[useRiskRatings] Ratings summary:', {
        total: ratings.size,
        successful: Array.from(ratings.values()).filter(r => r !== null).length,
        failed: Array.from(ratings.values()).filter(r => r === null).length
      });
      setRiskRatings(ratings);
    } catch (err) {
      console.error('[useRiskRatings] Error fetching risk ratings:', err);
      setError('Failed to load risk ratings');
      // Clear existing ratings on error
      setRiskRatings(new Map());
    } finally {
      setIsLoading(false);
    }
  }, [vaultKey, enabled, showProtocolRisk, showAssetRisk]);

  const getRiskLevel = useCallback((vaultId: string): number | null => {
    const rating = riskRatings.get(vaultId);
    if (!rating) {
      console.log(`[useRiskRatings] No rating found for vault ${vaultId}`);
      return null;
    }

    // Convert Exponential rating to your A/B/C format
    const riskLevel = EXPONENTIAL_TO_RISK_LEVEL[rating.poolRating] || null;
    console.log(`[useRiskRatings] Risk level for vault ${vaultId}:`, {
      poolRating: rating.poolRating,
      mappedLevel: riskLevel
    });
    return riskLevel;
  }, [riskRatings]);

  const refetch = useCallback(async () => {
    await fetchRiskRatings();
  }, [fetchRiskRatings]);

  useEffect(() => {
    fetchRiskRatings();
  }, [fetchRiskRatings]);

  return {
    riskRatings,
    isLoading,
    error,
    refetch,
    getRiskLevel,
  };
};
