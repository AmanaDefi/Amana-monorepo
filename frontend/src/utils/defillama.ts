import { VAULT_TO_DEFILLAMA_POOL } from '@/constants/defillamaPoolMapping';

const DEFILLAMA_POOLS_URL = 'https://yields.llama.fi/pools';
const DEFILLAMA_CHART_URL = 'https://yields.llama.fi/chart/';

// Simple in-memory cache
let cachedPools: any[] = [];
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Historical chart cache
const chartCache: Record<string, { data: any; timestamp: number }> = {};
const CHART_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// YieldFi vault ID for vyUSD
const YIELDFI_VYUSD_VAULT_ID = '0xcf18fc631e05ba7dcbcadcd212176c381256faa8';

// Helper function to check if a vault is YieldFi vyUSD
function isYieldFiVyUSD(vaultId: string): boolean {
  return vaultId.toLowerCase() === YIELDFI_VYUSD_VAULT_ID.toLowerCase();
}

// Helper function to add 5% to APY for YieldFi vyUSD
function adjustYieldFiAPY(apy: number, vaultId: string): number {
  if (isYieldFiVyUSD(vaultId)) {
    return apy + 5;
  }
  return apy;
}

export async function fetchDefiLlamaPools(): Promise<any[]> {
  const now = Date.now();
  if (cachedPools.length > 0 && now - lastFetch < CACHE_TTL) {
    return cachedPools;
  }
  const res = await fetch(DEFILLAMA_POOLS_URL);
  const data = await res.json();
  cachedPools = data.data;
  lastFetch = now;
  return cachedPools;
}

export async function getVault30dAvgAPY(vaultId: string): Promise<number | null> {
  const poolId = VAULT_TO_DEFILLAMA_POOL[vaultId];
  if (!poolId) return null;
  const pools = await fetchDefiLlamaPools();
  const pool = pools.find((p: any) => p.pool === poolId);
  if (!pool || typeof pool.apyMean30d !== 'number') return null;
  
  // Add 5% for YieldFi vyUSD vault
  return adjustYieldFiAPY(pool.apyMean30d, vaultId);
}

export async function getVaultHistoricalAPY(vaultId: string): Promise<Array<{timestamp: number, apy: number}> | null> {
  const poolId = VAULT_TO_DEFILLAMA_POOL[vaultId];
  if (!poolId) return null;
  const now = Date.now();
  if (chartCache[poolId] && now - chartCache[poolId].timestamp < CHART_CACHE_TTL) {
    const cachedData = chartCache[poolId].data;
    // Apply YieldFi adjustment to cached data
    return cachedData.map((point: {timestamp: number, apy: number}) => ({
      ...point,
      apy: adjustYieldFiAPY(point.apy, vaultId)
    }));
  }
  try {
    const res = await fetch(DEFILLAMA_CHART_URL + poolId);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) return null;
    
    // Apply YieldFi adjustment to the data
    const adjustedData = data.data.map((point: {timestamp: number, apy: number}) => ({
      ...point,
      apy: adjustYieldFiAPY(point.apy, vaultId)
    }));
    
    chartCache[poolId] = { data: adjustedData, timestamp: now };
    return adjustedData;
  } catch (e) {
    return null;
  }
}

// New function to get TVL from DefiLlama
export async function getVaultTVL(vaultId: string): Promise<number | null> {
  const poolId = VAULT_TO_DEFILLAMA_POOL[vaultId];
  if (!poolId) return null;
  
  try {
    const pools = await fetchDefiLlamaPools();
    const pool = pools.find((p: any) => p.pool === poolId);
    if (!pool || typeof pool.tvlUsd !== 'number') return null;
    console.log("pool", pool);
    console.log("pool.tvlUsd", pool.tvlUsd);
    return pool.tvlUsd;
  } catch (e) {
    console.error("Failed to get DefiLlama TVL for vault:", vaultId, e);
    return null;
  }
}

// Helper function to check if a vault has DefiLlama data
export function hasDefiLlamaData(vaultId: string): boolean {
  return !!VAULT_TO_DEFILLAMA_POOL[vaultId];
} 