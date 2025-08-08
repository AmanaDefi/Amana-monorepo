import axios, { AxiosInstance } from "axios";
import {
  EXPONENTIAL_API_URL,
  EXPONENTIAL_API_KEY,
} from "@/config.ts/apiConfig";
import {
  ExponentialRiskRequest,
  ExponentialRiskResponse,
  ExponentialRiskRating,
  BLOCKCHAIN_MAPPING,
  PROTOCOL_MAPPING,
} from "@/types/exponentialTypes";
import { VaultData } from "@/types/types";
import { RISK_RATING_CONFIG } from "@/config/riskRatingConfig";
import { VAULT_TO_EXPONENTIAL_POOL } from "@/constants/exponentialPools";

export type ExponentialAPI = ReturnType<typeof createExponentialAPI>;

function createExponentialAPI() {
  // Local state captured by closure
  // Use an internal Next.js API route to avoid CORS and keep API key server-side
  const api: AxiosInstance = axios.create({
    baseURL: '',
    timeout: RISK_RATING_CONFIG.timeout,
    headers: {
      "Content-Type": "application/json",
      // Do NOT set Accept-Encoding in browser; it causes warnings and is forbidden
    },
  });

  console.log("[ExponentialAPI] Initialized (function factory)", {
    url: '/api/exponential-proxy',
    timeout: RISK_RATING_CONFIG.timeout,
    cacheDuration: RISK_RATING_CONFIG.cacheDuration,
    batchSize: RISK_RATING_CONFIG.batchSize,
  });

  const cache: Map<string, { data: ExponentialRiskRating; timestamp: number }> =
    new Map();

  const CACHE_DURATION = RISK_RATING_CONFIG.cacheDuration;
  const BATCH_SIZE = RISK_RATING_CONFIG.batchSize;
  const RETRY_DELAY = RISK_RATING_CONFIG.retryDelay;
  const MAX_RETRIES = RISK_RATING_CONFIG.maxRetries;
  let globalCooldownUntil = 0;

  async function getRiskRating(
    vault: VaultData,
  ): Promise<ExponentialRiskRating | null> {
    console.log(
      `[ExponentialAPI] Starting risk rating fetch for vault ${vault.id}`,
    );
    console.log(`[ExponentialAPI] Vault details:`, {
      id: vault.id,
      network: vault.protocol?.network,
      protocol: vault.protocol?.name,
      inputToken: vault.inputToken?.address,
      inputTokenSymbol: vault.inputToken?.symbol,
    });

    try {
      // Check cache first
      const cached = cache.get(vault.id);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`[ExponentialAPI] Cache hit for vault ${vault.id}`);
        return cached.data;
      }

      console.log(
        `[ExponentialAPI] Cache miss, fetching from API for vault ${vault.id}`,
      );
      const requestData = mapVaultToExponentialRequest(vault);
      console.log(
        `[ExponentialAPI] Request data for ${vault.id}:`,
        requestData,
      );

      const response = await makeRequest(requestData);

      if (response) {
        console.log(`[ExponentialAPI] API response for ${vault.id}:`, response);
        const riskRating = mapExponentialResponseToRiskRating(response);
        console.log(
          `[ExponentialAPI] Mapped risk rating for ${vault.id}:`,
          riskRating,
        );

        cache.set(vault.id, { data: riskRating, timestamp: Date.now() });
        console.log(`[ExponentialAPI] Cached risk rating for ${vault.id}`);
        return riskRating;
      }

      console.warn(
        `[ExponentialAPI] No response received for vault ${vault.id}`,
      );
      return null;
    } catch (error) {
      console.error(
        `[ExponentialAPI] Error fetching risk rating for vault ${vault.id}:`,
        error,
      );
      return null;
    }
  }

  async function getBatchRiskRatings(
    vaults: VaultData[],
  ): Promise<Map<string, ExponentialRiskRating | null>> {
    const results = new Map<string, ExponentialRiskRating | null>();

    for (let i = 0; i < vaults.length; i += BATCH_SIZE) {
      // Honor global cooldown if we previously hit a rate limit
      if (Date.now() < globalCooldownUntil) {
        console.warn('[ExponentialAPI] Global cooldown active. Skipping batch.');
        break;
      }

      const batch = vaults.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (vault) => {
        const riskRating = await getRiskRating(vault);
        return { vaultId: vault.id, riskRating };
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(({ vaultId, riskRating }) => {
        results.set(vaultId, riskRating);
      });

      if (i + BATCH_SIZE < vaults.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, RISK_RATING_CONFIG.batchDelay),
        );
      }
    }

    return results;
  }

  function mapVaultToExponentialRequest(
    vault: VaultData,
  ): ExponentialRiskRequest {
    const originalNetwork = vault.protocol.network;
    const originalProtocol = vault.protocol.name;

    // Prefer explicit pool token mapping when available
    const mapping = VAULT_TO_EXPONENTIAL_POOL[vault.id.toLowerCase()];
    const tokenAddress = mapping?.poolToken || vault.id;

    const blockchain =
      mapping?.blockchain ||
      BLOCKCHAIN_MAPPING[vault.protocol.network] ||
      vault.protocol.network.toLowerCase();
    const protocol =
      mapping?.protocol ||
      PROTOCOL_MAPPING[vault.protocol.name] ||
      vault.protocol.name.toLowerCase();

    console.log(`[ExponentialAPI] Mapping vault ${vault.id}:`, {
      originalNetwork,
      mappedBlockchain: blockchain,
      originalProtocol,
      mappedProtocol: protocol,
      tokenAddress: vault.id,
      inputTokenAddress: vault.inputToken.address,
    });

    return {
      token_address: tokenAddress,
      blockchain,
      protocol,
      assets: [vault.inputToken.address],
    };
  }

  function mapExponentialResponseToRiskRating(
    response: ExponentialRiskResponse,
  ): ExponentialRiskRating {
    const { data = {}, assets = {}, protocols = {} } = response;

    return {
      poolRating: data.pool_rating,
      poolRatingColor: data.pool_rating_color,
      poolRatingDescription: data.pool_rating_description,
      poolUrl: data.pool_url,
      chainRating: data.chain?.rating,
      chainRatingColor: data.chain?.rating_color,
      assetRating: (assets as any)?.rating,
      assetRatingColor: (assets as any)?.rating_color,
      protocolRating: (protocols as any)?.underlying?.[0]?.rating,
      protocolRatingColor: (protocols as any)?.underlying?.[0]?.rating_color,
      protocolUrl: (protocols as any)?.underlying?.[0]?.url,
      assetUrl: (assets as any)?.underlying?.[0]?.url,
    };
  }

  async function makeRequest(
    requestData: ExponentialRiskRequest,
  ): Promise<ExponentialRiskResponse | null> {
    console.log(`[ExponentialAPI] Making API request:`, {
      url: '/api/exponential-proxy',
      data: requestData,
    });

    let lastError: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[ExponentialAPI] Attempt ${attempt}/${MAX_RETRIES}`);
        const response = await api.post("/api/exponential-proxy", requestData);
        console.log(`[ExponentialAPI] API response status: ${response.status}`);
        console.log(`[ExponentialAPI] API response data:`, response.data);
        return response.data;
      } catch (error: any) {
        lastError = error;
        console.error(
          `[ExponentialAPI] API request failed on attempt ${attempt}:`,
          {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
          },
        );

        if (error.response?.status === 401) {
          console.error(
            "[ExponentialAPI] Authentication failed. Please check your API key.",
          );
          throw new Error("API authentication failed");
        }

        if (error.response?.status === 400) {
          const data = error.response?.data;
          console.error("[ExponentialAPI] Bad request:", data);
          // If upstream signals rate limit, set a cooldown
          const msg = JSON.stringify(data || '').toLowerCase();
          if (msg.includes('rate limit')) {
            globalCooldownUntil = Date.now() + (RISK_RATING_CONFIG as any).globalCooldownOnRateLimitMs;
            console.warn('[ExponentialAPI] Upstream rate limit detected. Cooling down globally until', new Date(globalCooldownUntil).toISOString());
          }
          return null;
        }

        if (error.response?.status === 429) {
          console.warn(
            `[ExponentialAPI] Rate limit hit, attempt ${attempt}/${MAX_RETRIES}`,
          );
          if (attempt < MAX_RETRIES) {
            const waitTime = RETRY_DELAY * Math.pow(2, attempt - 1);
            console.log(
              `[ExponentialAPI] Waiting ${waitTime}ms before retry`,
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
        }

        if (error.response?.status >= 500) {
          console.warn(
            `[ExponentialAPI] Server error, attempt ${attempt}/${MAX_RETRIES}`,
          );
          if (attempt < MAX_RETRIES) {
            console.log(
              `[ExponentialAPI] Waiting ${RETRY_DELAY}ms before retry`,
            );
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            continue;
          }
        }

        break;
      }
    }

    console.error(
      "[ExponentialAPI] Failed to get risk rating after retries:",
      lastError,
    );
    return null;
  }

  function clearCache(): void {
    cache.clear();
  }

  function getCacheStats(): {
    size: number;
    entries: Array<{ vaultId: string; age: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(cache.entries()).map(
      ([vaultId, { timestamp }]) => ({
        vaultId,
        age: now - timestamp,
      }),
    );

    return {
      size: cache.size,
      entries,
    };
  }

  return {
    getRiskRating,
    getBatchRiskRatings,
    clearCache,
    getCacheStats,
  };
}

export const exponentialApi = createExponentialAPI();
export default exponentialApi;
