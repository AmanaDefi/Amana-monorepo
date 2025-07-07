import { VAULT_TO_DEFILLAMA_POOL } from '@/constants/defillamaPoolMapping';

const DEFILLAMA_POOLS_URL = 'https://yields.llama.fi/pools';

// Simple in-memory cache
let cachedPools: any[] = [];
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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