import axios, { AxiosInstance } from "axios";
import { VaultData } from "@/types/types";
import { ExponentialRiskRequest, ExponentialRiskResponse } from "@/types/exponentialTypes";
import { VAULT_TO_EXPONENTIAL_POOL } from "@/constants/exponentialPools";

// Simple cache for 24 hours
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRIES = 3;

// Global cooldown to prevent rate limit issues
let globalCooldownUntil = 0;
const GLOBAL_COOLDOWN_DURATION = 60 * 60 * 1000; // 1 hour

function createExponentialAPI() {
  const api: AxiosInstance = axios.create({
    baseURL: '',
    timeout: 30000,
    headers: { "Content-Type": "application/json" },
  });

  function mapVaultToExponentialRequest(vault: VaultData): ExponentialRiskRequest {
    const mapping = VAULT_TO_EXPONENTIAL_POOL[vault.id.toLowerCase()];
    const tokenAddress = mapping?.poolToken || vault.id;

    return {
      token_address: tokenAddress,
      blockchain: mapping?.blockchain || vault.protocol.network.toLowerCase(),
      protocol: mapping?.protocol || vault.protocol.name.toLowerCase(),
    };
  }

  async function getRiskRating(vault: VaultData): Promise<any> {
    // Check global cooldown first
    if (Date.now() < globalCooldownUntil) {
      console.log('[ExponentialAPI] Global cooldown active, skipping request');
      return null;
    }

    const cacheKey = vault.id.toLowerCase();
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const request = mapVaultToExponentialRequest(vault);
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await api.post('/api/exponential-proxy', request);
        const data = response.data;
        
        // Cache successful response
        cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (error: any) {
        // Check if it's a rate limit error
        if (error.response?.status === 429) {
          console.warn('[ExponentialAPI] Rate limit hit, setting global cooldown');
          globalCooldownUntil = Date.now() + GLOBAL_COOLDOWN_DURATION;
          // Cache failure for 24 hours to prevent repeated calls
          cache.set(cacheKey, { data: null, timestamp: Date.now() });
          return null;
        }

        if (attempt === MAX_RETRIES) {
          // Cache failure for 24 hours to prevent repeated calls
          cache.set(cacheKey, { data: null, timestamp: Date.now() });
          return null;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return null;
  }

  return { getRiskRating };
}

export const exponentialApi = createExponentialAPI();
