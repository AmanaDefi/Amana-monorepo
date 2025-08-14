import { useState, useEffect, useMemo } from "react";
import { VaultData } from "@/types/types";
import { exponentialApi } from "@/service/exponentialApi";

interface UseRiskRatingsProps {
  vaults: VaultData[];
  enabled?: boolean;
}

export function useRiskRatings({ vaults, enabled = true }: UseRiskRatingsProps) {
  const [riskRatings, setRiskRatings] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vaultKey = useMemo(() => vaults.map(v => v.id).sort().join(','), [vaults]);

  useEffect(() => {
    if (!enabled || vaults.length === 0) return;

    const fetchRatings = async () => {
      setIsLoading(true);
      setError(null);

      const newRatings = new Map<string, any>();

      for (const vault of vaults) {
        try {
          const rating = await exponentialApi.getRiskRating(vault);
          if (rating) {
            newRatings.set(vault.id, {
              poolRating: rating.data?.pool_rating,
              poolRatingColor: rating.data?.pool_rating_color,
              poolRatingDescription: rating.data?.pool_rating_description,
              poolUrl: rating.data?.pool_url,
            });
          }
          // Add delay between requests to be conservative
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Failed to fetch rating for vault ${vault.id}:`, err);
        }
      }

      setRiskRatings(newRatings);
      setIsLoading(false);
    };

    fetchRatings();
  }, [vaultKey, enabled]);

  const getRiskLevel = (vaultId: string) => {
    const rating = riskRatings.get(vaultId);
    return rating?.poolRating || null;
  };

  return {
    riskRatings,
    isLoading,
    error,
    getRiskLevel,
  };
}
