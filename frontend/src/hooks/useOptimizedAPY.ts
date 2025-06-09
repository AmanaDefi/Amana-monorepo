import { useEffect, useMemo, useRef, useCallback } from "react";
import {
  calculateAaveAPY,
  calculateAaveFlashAPY,
  calculateCompoundAPY,
  calculateMoonwellAPY,
  calculateVenusAPY,
  calculateVenusRewardsAPY,
  calculateEddyAPY,
  calculateBeefyAPY,
  calculateCurveAPY,
  calculateConvexEthereumRewardsAPY,
  calculateCompoundRewardsAPY,
  calculateConvexArbitrumRewardsAPY,
  calculateCombinedBalancerAPY
} from "@/actions/actions";
import { Address, defineChain, getContract, readContract } from "thirdweb";
import { VaultData, Token } from "@/types/types";
import { client } from "@/utils/client";
import { rpcDebugger } from "@/utils/rpcDebugger";

// Cache for APY calculations to prevent repeated calls
const APY_CACHE = new Map<string, { value: number; timestamp: number }>();
const APY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Cache for receipt token addresses to prevent repeated readContract calls
const RECEIPT_TOKEN_CACHE = new Map<string, string>();

export const useOptimizedAPYs = (
  vaults: VaultData[],
  setVaultAPYs: (vaultAPYs: { vaultId: string, APY7d: number }[]) => void,
  setLoading: (loading: boolean) => void,
  crvTokenPrice: number,
  cvxTokenPrice: number,
  ethTokenPrice: number,
  compTokenPrice: number,
  opTokenPrice: number
) => {
  const lastCalculationTime = useRef<number>(0);
  const calculationInProgress = useRef<boolean>(false);
  const abortController = useRef<AbortController | null>(null);

  // Memoize dependencies to prevent unnecessary recalculations
  const tokenPrices = useMemo(() => ({
    crv: crvTokenPrice,
    cvx: cvxTokenPrice,
    eth: ethTokenPrice,
    comp: compTokenPrice,
    op: opTokenPrice
  }), [crvTokenPrice, cvxTokenPrice, ethTokenPrice, compTokenPrice, opTokenPrice]);

  // Check if prices are valid (all non-zero)
  const pricesReady = useMemo(() => {
    return Object.values(tokenPrices).every(price => price > 0);
  }, [tokenPrices]);

  const getCachedReceiptToken = useCallback(async (vault: VaultData): Promise<string | null> => {
    const cacheKey = `receipt_${vault.id}_${vault.protocol.strategyAddress}`;
    
    // Check cache first
    if (RECEIPT_TOKEN_CACHE.has(cacheKey)) {
      return RECEIPT_TOKEN_CACHE.get(cacheKey)!;
    }

    // Track RPC call
    rpcDebugger.trackCall('getReceiptToken', { vault: vault.id });

    try {
      const strategyChain = defineChain(vault.protocol.chainId);
      const strategyContract = getContract({
        client,
        chain: strategyChain,
        address: vault.protocol.strategyAddress,
      });
      
      const receiptTokenAddress = await readContract({
        contract: strategyContract,
        method: "function receiptToken() view returns (address)",
      });

      // Cache the result
      RECEIPT_TOKEN_CACHE.set(cacheKey, receiptTokenAddress as string);
      return receiptTokenAddress as string;
    } catch (error) {
      console.error(`Failed to get receipt token for vault ${vault.id}:`, error);
      return null;
    }
  }, []);

  const getCachedAPY = useCallback((cacheKey: string): number | null => {
    const cached = APY_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < APY_CACHE_DURATION) {
      console.log(`📊 [APY-CACHE] Using cached APY for ${cacheKey}: ${cached.value}%`);
      return cached.value;
    }
    return null;
  }, []);

  const setCachedAPY = useCallback((cacheKey: string, value: number) => {
    APY_CACHE.set(cacheKey, { value, timestamp: Date.now() });
  }, []);

  const calculateSingleVaultAPY = useCallback(async (vault: VaultData): Promise<number> => {
    const cacheKey = `apy_${vault.id}_${vault.protocol.name}_${JSON.stringify(tokenPrices)}`;
    
    // Check cache first
    const cachedAPY = getCachedAPY(cacheKey);
    if (cachedAPY !== null) {
      return cachedAPY;
    }

    console.log(`📊 [APY-CALC] Calculating APY for vault ${vault.symbol} (${vault.protocol.name})`);
    
    try {
      const receiptTokenAddress = await getCachedReceiptToken(vault);
      if (!receiptTokenAddress) {
        console.warn(`No receipt token found for vault ${vault.id}`);
        return 0;
      }

      const strategyChain = defineChain(vault.protocol.chainId);
      let APY7d = 0;
      let RewardsAPY = 0;

      // Calculate base APY based on protocol
      switch (vault.protocol.name) {
        case "Aave":
        case "ZeroLend":
          APY7d = await calculateAaveAPY(receiptTokenAddress as Address, strategyChain);
          break;
          
        case "Compound":
          APY7d = await calculateCompoundAPY(receiptTokenAddress as Address, strategyChain);
          if (vault.protocol.rewardsContractAddress) {
            RewardsAPY = await calculateCompoundRewardsAPY(
              vault.protocol.rewardsContractAddress as Address, 
              receiptTokenAddress as Address, 
              strategyChain, 
              tokenPrices.comp
            );
            APY7d += RewardsAPY;
          }
          break;
          
        case "Moonwell":
        case "Euler":
        case "Fluid":
          APY7d = await calculateMoonwellAPY(receiptTokenAddress as Address, strategyChain);
          break;
          
        case "Venus":
          APY7d = await calculateVenusAPY(receiptTokenAddress as Address, strategyChain);
          RewardsAPY = await calculateVenusRewardsAPY(receiptTokenAddress as Address, strategyChain);
          APY7d += RewardsAPY;
          break;
          
        case "Eddy":
          APY7d = await calculateEddyAPY(receiptTokenAddress as Address, strategyChain);
          break;
          
        case "Balancer":
          if (vault.protocol.rewardsContractAddress) {
            const { totalAPY } = await calculateCombinedBalancerAPY({
              receiptTokenAddress: receiptTokenAddress as Address,
              liquidityGaugeAddress: vault.protocol.rewardsContractAddress as Address,
              rewardTokenAddress: "0x994ac01750047B9d35431a7Ae4Ed312ee955E030",
              inputTokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
              opTokenPrice: tokenPrices.op,
              strategyChain
            });
            APY7d = totalAPY;
          }
          break;
          
        case "Beefy":
          APY7d = await calculateBeefyAPY(receiptTokenAddress as Address, strategyChain);
          break;
          
        case "Curve-Convex":
          // Only calculate if we have required token prices
          if (tokenPrices.crv > 0 && tokenPrices.eth > 0 && vault.protocol.rewardsContractAddress) {
            if (strategyChain.id === 1) {
              RewardsAPY = await calculateConvexEthereumRewardsAPY(
                receiptTokenAddress as Address, 
                vault.inputToken as Token, 
                vault.protocol.rewardsContractAddress as Address, 
                strategyChain, 
                tokenPrices.crv, 
                tokenPrices.cvx, 
                tokenPrices.eth
              );
            } else if (strategyChain.id === 42161) {
              RewardsAPY = await calculateConvexArbitrumRewardsAPY(
                receiptTokenAddress as Address, 
                vault.inputToken as Token, 
                vault.protocol.rewardsContractAddress as Address, 
                strategyChain, 
                tokenPrices.crv, 
                tokenPrices.eth
              );
            }
            APY7d = RewardsAPY;
          } else {
            console.warn(`Skipping Curve rewards APY for ${vault.symbol} due to missing token prices`, { 
              crvPrice: tokenPrices.crv, 
              ethPrice: tokenPrices.eth 
            });
          }
          break;
          
        default:
          console.warn(`Unknown protocol: ${vault.protocol.name} for vault ${vault.id}`);
      }

      // Cache the result
      setCachedAPY(cacheKey, APY7d);
      
      console.log(`✅ [APY-CALC] Calculated APY for ${vault.symbol}: ${APY7d.toFixed(2)}%`);
      return APY7d;
      
    } catch (error) {
      console.error(`❌ [APY-CALC] Error calculating APY for vault ${vault.id}:`, error);
      return 0;
    }
  }, [tokenPrices, getCachedReceiptToken, getCachedAPY, setCachedAPY]);

  const updateAPYs = useCallback(async () => {
    // Prevent multiple concurrent calculations
    if (calculationInProgress.current) {
      console.log('🔄 [APY-CALC] APY calculation already in progress, skipping...');
      return;
    }

    // Throttle calculations (minimum 30 seconds between calculations)
    const now = Date.now();
    if (now - lastCalculationTime.current < 30000) {
      console.log('🕐 [APY-CALC] APY calculation throttled, skipping...');
      return;
    }

    calculationInProgress.current = true;
    lastCalculationTime.current = now;
    setLoading(true);

    try {
      console.log('🚀 [APY-CALC] Starting optimized APY calculation for', vaults.length, 'vaults');
      
      // For now, set default APYs to prevent the massive RPC calls
      const updatedVaultAPYs = vaults.map(vault => ({
        vaultId: vault.id,
        APY7d: 5.0 // Default 5% APY until we can safely calculate real values
      }));

      setVaultAPYs(updatedVaultAPYs);
      console.log('✅ [APY-CALC] APY calculation completed (using defaults to prevent rate limiting)');

    } catch (error) {
      console.error('❌ [APY-CALC] Error in APY calculation:', error);
    } finally {
      calculationInProgress.current = false;
      setLoading(false);
    }
  }, [vaults, setVaultAPYs, setLoading]);

  useEffect(() => {
    // Only trigger if we have vaults and prices are ready
    if (vaults.length > 0 && pricesReady) {
      console.log('🎯 [APY-CALC] Conditions met, starting APY calculation...');
      updateAPYs();
    }
  }, [vaults.length, pricesReady, updateAPYs]);

  return {
    refreshAPYs: updateAPYs
  };
}; 