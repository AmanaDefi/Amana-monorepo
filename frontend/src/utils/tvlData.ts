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

/**
 * Merges external TVL data with existing VaultTotalAssets array
 * @param existingTotalAssets - The existing VaultTotalAssets array
 * @param vaultIds - Array of vault IDs to check for external TVL data
 * @returns Promise<VaultTotalAssets[]> - Updated VaultTotalAssets array with external TVL data
 */
export async function mergeExternalTVLData(
  existingTotalAssets: VaultTotalAssets[],
  vaultIds: string[]
): Promise<VaultTotalAssets[]> {
  const updatedTotalAssets = [...existingTotalAssets];
  
  // Create a map for quick lookup
  const existingMap = new Map(existingTotalAssets.map(asset => [asset.vaultId, asset]));
  
  // Fetch external TVL data for vaults that have it
  const externalTVLPromises = vaultIds
    .filter(vaultId => hasExternalTVLData(vaultId))
    .map(async (vaultId) => {
      const externalTVL = await getExternalTVL(vaultId);
      return { vaultId, externalTVL };
    });

  const externalTVLResults = await Promise.all(externalTVLPromises);
  
  // Update the total assets with external TVL data
  externalTVLResults.forEach(({ vaultId, externalTVL }) => {
    if (externalTVL !== null) {
      const existingAsset = existingMap.get(vaultId);
      
      if (existingAsset) {
        // Update existing entry
        existingAsset.totalAssets = externalTVL.toString();
      } else {
        // Create new entry
        updatedTotalAssets.push({
          vaultId,
          totalAssets: externalTVL.toString()
        });
      }
    }
  });

  return updatedTotalAssets;
}

/**
 * Gets the best available TVL value for a vault
 * @param vaultId - The vault ID
 * @param existingTotalAssets - The existing VaultTotalAssets array
 * @returns Promise<number | null> - The best available TVL value, or null if none available
 */
export async function getBestAvailableTVL(
  vaultId: string,
  existingTotalAssets: VaultTotalAssets[]
): Promise<number | null> {
  // First try external sources
  if (hasExternalTVLData(vaultId)) {
    const externalTVL = await getExternalTVL(vaultId);
    if (externalTVL !== null) {
      return externalTVL;
    }
  }
  
  // Fall back to existing data
  const existingAsset = existingTotalAssets.find(asset => asset.vaultId === vaultId);
  if (existingAsset && existingAsset.totalAssets !== "Error") {
    const tvlValue = Number(existingAsset.totalAssets);
    return isNaN(tvlValue) ? null : tvlValue;
  }
  
  return null;
} 