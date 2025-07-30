import { useState, useEffect, useCallback, useRef } from 'react';
import { VaultTotalAssets } from '@/types/types';
import { getExternalTVL, hasExternalTVLData } from '../utils/tvlData';

interface UseExternalTVLProps {
  vaultIds: string[];
  existingTotalAssets: VaultTotalAssets[]; // Internal TVL from subgraph
  enabled?: boolean;
}

interface UseExternalTVLReturn {
  enhancedTotalAssets: VaultTotalAssets[];
  isLoading: boolean;
  error: string | null;
  refreshTVL: () => Promise<void>;
}

/**
 * SIMPLIFIED Hook: Merge external TVL with internal TVL
 * - External TVL (DefiLlama, Noon Capital) for supported vaults
 * - Internal TVL (subgraph) for others or as fallback
 */
export function useExternalTVL({
  vaultIds,
  existingTotalAssets,
  enabled = true
}: UseExternalTVLProps): UseExternalTVLReturn {
  
  const [enhancedTotalAssets, setEnhancedTotalAssets] = useState<VaultTotalAssets[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 🔒 BULLETPROOF loop prevention
  const isProcessingRef = useRef(false);
  const lastProcessedDataRef = useRef<string>('');
  const existingTotalAssetsRef = useRef<VaultTotalAssets[]>([]);
  
  // Always keep fresh reference without causing dependency changes
  existingTotalAssetsRef.current = existingTotalAssets;

  const refreshTVL = useCallback(async () => {
    // Get current data
    const currentExistingAssets = existingTotalAssetsRef.current;
    
    // Create a simple hash to detect if data actually changed
    const dataHash = `${enabled}|${vaultIds.sort().join(',')}|${currentExistingAssets.length}`;
    
    // GUARD 1: Prevent concurrent executions
    if (isProcessingRef.current) {
      return;
    }
    
    // GUARD 2: Skip if we already processed this exact data
    if (lastProcessedDataRef.current === dataHash) {
      return;
    }
    
    if (!enabled || vaultIds.length === 0 || currentExistingAssets.length === 0) {
      setEnhancedTotalAssets(currentExistingAssets);
      lastProcessedDataRef.current = dataHash;
      return;
    }


    // Mark as processing and processed BEFORE starting async work
    isProcessingRef.current = true;
    lastProcessedDataRef.current = dataHash;
    setIsLoading(true);
    setError(null);

    try {
      // Start with internal TVL as base
      const result: VaultTotalAssets[] = [...currentExistingAssets];
      
      // Check which vaults have external TVL and fetch it
      const externalTVLPromises = vaultIds.map(async (vaultId) => {
        if (hasExternalTVLData(vaultId)) {
          try {
            const externalTVL = await getExternalTVL(vaultId);
            if (externalTVL && externalTVL > 0) {
              // Replace internal TVL with external TVL
              const index = result.findIndex(asset => asset.vaultId === vaultId);
              if (index >= 0) {
                result[index] = { ...result[index], totalAssets: externalTVL.toString() };
              } else {
                result.push({ vaultId, totalAssets: externalTVL.toString() });
              }
            }
          } catch (err) {
            // Fallback to internal TVL (already in result array)
          }
        }
      });

      await Promise.all(externalTVLPromises);
      setEnhancedTotalAssets(result);
    } catch (err) {
      console.error('TVL merge failed:', err);
      setError('Failed to fetch external TVL data');
      setEnhancedTotalAssets(currentExistingAssets); // Fallback to internal
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  }, [enabled, vaultIds]); // ✅ REMOVED existingTotalAssets - this was causing the loop!

  // Trigger refreshTVL when meaningful data changes occur
  useEffect(() => {
    if (enabled && vaultIds.length > 0) {
      refreshTVL();
    }
  }, [enabled, vaultIds, refreshTVL]);

  // Also trigger when existingTotalAssets length changes (new data arrived)
  const prevLengthRef = useRef(0);
  useEffect(() => {
    if (existingTotalAssets.length > 0 && existingTotalAssets.length !== prevLengthRef.current) {
      prevLengthRef.current = existingTotalAssets.length;
      refreshTVL();
    }
  }, [existingTotalAssets.length, refreshTVL]);

  return {
    enhancedTotalAssets,
    isLoading,
    error,
    refreshTVL
  };
}