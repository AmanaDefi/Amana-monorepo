import { useMemo, useState, useEffect } from 'react';
import { predict30DayAPY, PredictionResult } from '@/utils/prediction';
import { getVaultHistoricalAPY } from '@/utils/defillama';
import { VAULT_TO_DEFILLAMA_POOL } from '@/constants/defillamaPoolMapping';
import { isNoonCapitalVault, getNoonCapitalHistoricalAPY } from '@/utils/noonCapital';

// Cache for prediction results
const predictionCache: Record<string, { result: PredictionResult; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface UsePredictionOptions {
  vaultId: string;
  historicalAPY?: number[];
  enableCache?: boolean;
}

export function usePrediction({ 
  vaultId, 
  historicalAPY, 
  enableCache = true 
}: UsePredictionOptions) {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if vault has DefiLlama data
  const hasDefiLlamaData = useMemo(() => {
    return VAULT_TO_DEFILLAMA_POOL[vaultId] !== undefined;
  }, [vaultId]);

  // Check if vault is Noon Capital
  const isNoonCapital = useMemo(() => {
    return isNoonCapitalVault(vaultId);
  }, [vaultId]);

  // Generate prediction from provided historical data
  const generatePrediction = useMemo(() => {
    if (!historicalAPY || historicalAPY.length === 0) {
      return null;
    }

    // Always normalize to decimal for prediction
    const normalizedAPY = historicalAPY.map((apy) => apy / 100);
    console.log('Normalized APY:', normalizedAPY);
    // Check cache first
    if (enableCache && predictionCache[vaultId]) {
      const cached = predictionCache[vaultId];
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.result;
      }
    }

    // Generate new prediction
    const result = predict30DayAPY(normalizedAPY);
    console.log('Prediction result:', result);
    // Cache the result
    if (enableCache) {
      predictionCache[vaultId] = {
        result,
        timestamp: Date.now()
      };
    }

    return result;
  }, [vaultId, historicalAPY, enableCache, isNoonCapital, hasDefiLlamaData]);

  // Fetch historical data and generate prediction
  const fetchAndPredict = async () => {
    if (!hasDefiLlamaData && !isNoonCapital) {
      setError('No historical data available for this vault');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let historicalData: number[] = [];

      if (isNoonCapital) {
        // Fetch Noon Capital historical data
        const noonCapitalData = await getNoonCapitalHistoricalAPY();
        const raw = noonCapitalData.map(point => point.apy);
        historicalData = raw.map(apy => apy / 100); // Convert to decimal
      } else {
        // Fetch DefiLlama historical data
        const defiLlamaData = await getVaultHistoricalAPY(vaultId);
        if (defiLlamaData && Array.isArray(defiLlamaData)) {
          const raw = defiLlamaData.map(point => point.apy);
          historicalData = raw.map(apy => apy / 100); // Convert to decimal
        }
      }

      if (historicalData.length === 0) {
        setError('No historical data available');
        return;
      }

      const result = predict30DayAPY(historicalData);
      setPrediction(result);

      // Cache the result
      if (enableCache) {
        predictionCache[vaultId] = {
          result,
          timestamp: Date.now()
        };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prediction data');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch if no historical data provided but vault has data source
  useEffect(() => {
    if (!historicalAPY && (hasDefiLlamaData || isNoonCapital)) {
      fetchAndPredict();
    }
  }, [vaultId, hasDefiLlamaData, isNoonCapital]);

  // Update prediction when historical data changes
  useEffect(() => {
    if (historicalAPY && historicalAPY.length > 0) {
      const result = generatePrediction;
      setPrediction(result);
    }
  }, [generatePrediction]);

  return {
    prediction,
    isLoading,
    error,
    hasData: hasDefiLlamaData || isNoonCapital,
    refetch: fetchAndPredict
  };
} 