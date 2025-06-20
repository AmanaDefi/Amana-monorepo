import { useState, useEffect } from 'react';

interface AegisPointsResponse {
  success: boolean;
  totalPoints: number;
  isConfigError?: boolean;
  isNewUser?: boolean;
  isApiError?: boolean;
  message?: string;
  rawData?: any;
}

interface UseAegisPointsReturn {
  points: number;
  loading: boolean;
  error: string | null;
  isNewUser: boolean;
  isConfigError: boolean;
  refetch: () => void;
}

export const useAegisPoints = (userAddress: string | undefined): UseAegisPointsReturn => {
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [isConfigError, setIsConfigError] = useState<boolean>(false);

  const fetchPoints = async () => {
    if (!userAddress) {
      setPoints(0);
      setLoading(false);
      setError(null);
      setIsNewUser(false);
      setIsConfigError(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsNewUser(false);
    setIsConfigError(false);

    try {
      const response = await fetch(`/api/aegis-points?user_address=${userAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch points`);
      }

      const data: AegisPointsResponse = await response.json();
      
      if (data.success) {
        setPoints(data.totalPoints || 0);
        
        // Set flags based on response
        if (data.isNewUser) {
          setIsNewUser(true);
        }
        if (data.isConfigError) {
          setIsConfigError(true);
        }
        if (data.isApiError) {
          setError('Network error');
        }
      } else {
        throw new Error(data.message || 'API returned unsuccessful response');
      }
    } catch (err) {
      console.error('Error fetching Aegis points:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch points');
      setPoints(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
  }, [userAddress]);

  const refetch = () => {
    fetchPoints();
  };

  return {
    points,
    loading,
    error,
    isNewUser,
    isConfigError,
    refetch
  };
}; 