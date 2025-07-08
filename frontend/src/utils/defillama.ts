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
  return pool.apyMean30d;
}

export async function getVaultHistoricalAPY(vaultId: string): Promise<Array<{timestamp: number, apy: number}> | null> {
  const poolId = VAULT_TO_DEFILLAMA_POOL[vaultId];
  if (!poolId) return null;
  const now = Date.now();
  if (chartCache[poolId] && now - chartCache[poolId].timestamp < CHART_CACHE_TTL) {
    return chartCache[poolId].data;
  }
  try {
    const res = await fetch(DEFILLAMA_CHART_URL + poolId);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) return null;
    chartCache[poolId] = { data: data.data, timestamp: now };
    return data.data;
  } catch (e) {
    return null;
  }
} 