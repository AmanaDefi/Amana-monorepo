import { VaultTotalAssets } from '@/types/types';
import { getVaultTVL, hasDefiLlamaData } from './defillama';
import { getNoonCapitalTVL, isNoonCapitalVault } from './noonCapital';

// Cache for external TVL data
const externalTVLCache: Record<string, { tvl: number; timestamp: number }> = {};
const EXTERNAL_TVL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches TVL data from external sources (DefiLlama, Noon Capital) for a specific vault
 * @param vaultId - The vault ID to fetch TVL for
 * @returns Promise<number | null> - The TVL value in USD, or null if not available
 */
export async function getExternalTVL(vaultId: string): Promise<number | null> {
  const now = Date.now();
  
  // Check cache first
  if (externalTVLCache[vaultId] && now - externalTVLCache[vaultId].timestamp < EXTERNAL_TVL_CACHE_TTL) {
    return externalTVLCache[vaultId].tvl;
  }

  let tvl: number | null = null;

  // Try DefiLlama first
  if (hasDefiLlamaData(vaultId)) {
    tvl = await getVaultTVL(vaultId);
  }
  
  // Try Noon Capital if DefiLlama didn't work or if it's a Noon Capital vault
  if (tvl === null && isNoonCapitalVault(vaultId)) {
    tvl = await getNoonCapitalTVL();
  }

  // Cache the result (even if null, to avoid repeated failed requests)
  if (tvl !== null) {
    externalTVLCache[vaultId] = { tvl, timestamp: now };
  }

  return tvl;
}

/**
 * Checks if a vault has external TVL data available
 * @param vaultId - The vault ID to check
 * @returns boolean - True if external TVL data is available
 */
export function hasExternalTVLData(vaultId: string): boolean {
  return hasDefiLlamaData(vaultId) || isNoonCapitalVault(vaultId);
}