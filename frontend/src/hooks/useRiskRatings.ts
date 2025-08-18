import { useState, useEffect, useMemo, useRef } from "react";
import { VaultData } from "@/types/types";
import { exponentialApi } from "@/service/exponentialApi";

interface UseRiskRatingsProps {
  vaults: VaultData[];
  enabled?: boolean;
}

// Cache key for localStorage
const CACHE_KEY = 'exponential_risk_ratings_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function useRiskRatings({ vaults, enabled = true }: UseRiskRatingsProps) {
  const [riskRatings, setRiskRatings] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Persistent cache across re-renders AND page refreshes
  const persistentCache = useRef<Map<string, any>>(new Map());

  // Load cache from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        
        // Filter out expired entries
        const validEntries = Object.entries(parsed).filter(([_, data]: [string, any]) => {
          return data.timestamp && (now - data.timestamp) < CACHE_DURATION;
        });
        
        // Load valid entries into persistent cache
        validEntries.forEach(([vaultId, data]: [string, any]) => {
          persistentCache.current.set(vaultId, data.rating);
        });
        
        console.log(`[useRiskRatings] Loaded ${validEntries.length} cached ratings from localStorage`);
      }
    } catch (err) {
      console.error('[useRiskRatings] Failed to load cache from localStorage:', err);
    }
  }, []);

  // Save cache to localStorage whenever it changes
  const saveCacheToStorage = () => {
    try {
      const cacheData: Record<string, { rating: any; timestamp: number }> = {};
      persistentCache.current.forEach((rating, vaultId) => {
        cacheData[vaultId] = {
          rating,
          timestamp: Date.now()
        };
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.error('[useRiskRatings] Failed to save cache to localStorage:', err);
    }
  };

  // Function to clear cache (for testing)
  const clearCache = () => {
    persistentCache.current.clear();
    localStorage.removeItem(CACHE_KEY);
    setRiskRatings(new Map());
    console.log('[useRiskRatings] Cache cleared');
  };

  useEffect(() => {
    if (!enabled || vaults.length === 0) return;

    const fetchMissingRatings = async () => {
      setIsLoading(true);
      setError(null);

      // Find vaults that don't have ratings yet
      const missingVaults = vaults.filter(vault => !persistentCache.current.has(vault.id));
      
      console.log(`[useRiskRatings] Total vaults: ${vaults.length}, Missing: ${missingVaults.length}, Cached: ${persistentCache.current.size}`);
      
      if (missingVaults.length === 0) {
        // All vaults already have ratings, just update the state
        const currentRatings = new Map<string, any>();
        vaults.forEach(vault => {
          const cached = persistentCache.current.get(vault.id);
          if (cached) {
            currentRatings.set(vault.id, cached);
          }
        });
        setRiskRatings(currentRatings);
        setIsLoading(false);
        console.log(`[useRiskRatings] Using cached data for all ${vaults.length} vaults`);
        return;
      }

      console.log(`[useRiskRatings] Fetching ratings for ${missingVaults.length} missing vaults`);

      for (const vault of missingVaults) {
        try {
          const rating = await exponentialApi.getRiskRating(vault);
          if (rating) {
            const ratingData = {
              poolRating: rating.data?.pool_rating,
              poolRatingColor: rating.data?.pool_rating_color,
              poolRatingDescription: rating.data?.pool_rating_description,
              poolUrl: rating.data?.pool_url,
            };
            
            // Store in persistent cache
            persistentCache.current.set(vault.id, ratingData);
            console.log(`[useRiskRatings] Cached rating for ${vault.name}: ${ratingData.poolRating}`);
          }
          // Add delay between requests to be conservative
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Failed to fetch rating for vault ${vault.id}:`, err);
        }
      }

      // Save updated cache to localStorage
      saveCacheToStorage();

      // Update state with all current vaults (including previously cached ones)
      const updatedRatings = new Map<string, any>();
      vaults.forEach(vault => {
        const cached = persistentCache.current.get(vault.id);
        if (cached) {
          updatedRatings.set(vault.id, cached);
        }
      });
      
      setRiskRatings(updatedRatings);
      setIsLoading(false);
      console.log(`[useRiskRatings] Updated state with ${updatedRatings.size} ratings`);
    };

    fetchMissingRatings();
  }, [vaults, enabled]); // Remove vaultKey dependency to prevent unnecessary refetches

  const getRiskLevel = (vaultId: string) => {
    const rating = riskRatings.get(vaultId);
    return rating?.poolRating || null;
  };

  return {
    riskRatings,
    isLoading,
    error,
    getRiskLevel,
    clearCache, // Export for testing
  };
}
