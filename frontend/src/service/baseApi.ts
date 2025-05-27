import { API_KEY, API_URL } from "@/config.ts/apiConfig";
import { SearchParams } from "@/types/types";
import axios, { AxiosInstance } from "axios";
import { ONE_MINUTE } from "@/constants";

export default class BaseAPI {
  public api: AxiosInstance;
  private readonly vaultDataCache = "vaultDataCache";
  private readonly vaultDataCacheTimestamp = "vaultDataCacheTimestamp";
  constructor() {
    this.api = axios.create({ baseURL: API_URL });
  }

  async getLeaderboardData(searchParams: SearchParams) {
    const { page, perPage, userAddress } = searchParams;
    const from: number = (page - 1) * perPage;
    const to: number = page * perPage;
    try {
      const res = await this.api.get(
        `/vaults/v1/leaderboard?start=${from}&limit=${to}&user_address=${userAddress}`,
      );
      return res.data;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  async getVaultData(address: string) {
    try {
      const res = await this.api.get(`/vaults/v1/collect-data/${address}`, {
        headers: {
          API_KEY: API_KEY,
        },
      });
      return res.data.data[0];
    } catch (error) {
      return [];
    }
  }

  async getAllVaultDataCached(
    addresses: string[],
  ): Promise<Record<string, any>> {
    const CACHE_KEY = this.vaultDataCache;
    const TS_KEY = this.vaultDataCacheTimestamp;
    const TTL = 5 * ONE_MINUTE;
    const now = Date.now();

    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      const tsStr = localStorage.getItem(TS_KEY);
      let cachedMap: Record<string, any> = {};

      if (cachedStr) {
        try {
          cachedMap = JSON.parse(cachedStr);
        } catch {
          cachedMap = {};
        }
      }

      if (tsStr && now - Number(tsStr) < TTL) {
        const missingAddrs = Object.entries(cachedMap)
          .filter(([_, v]) => Array.isArray(v) && v.length === 0)
          .map((item) => item[0]);

        if (missingAddrs.length === 0) {
          return cachedMap;
        }

        for (const addr of missingAddrs) {
          try {
            const fresh = await this.getVaultData(addr);
            cachedMap[addr] = fresh;
          } catch (err) {
            console.warn(`getVaultData(${addr}) retry failed:`, err);
          }
        }

        localStorage.setItem(CACHE_KEY, JSON.stringify(cachedMap));
        return cachedMap;
      }

      const newMap: Record<string, any> = {};
      for (const addr of addresses) {
        try {
          newMap[addr] = await this.getVaultData(addr);
        } catch (err) {
          console.warn(`getVaultData(${addr}) failed:`, err);
          newMap[addr] = [];
        }
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(newMap));
      localStorage.setItem(TS_KEY, now.toString());
      return newMap;
    } catch (error) {
      console.error("getAllVaultDataCached error:", error);
      return {};
    }
  }

  async getDistinctLatestRecords() {
    try {
      const res = await this.api.get(`/vault/v1/get-distinct-latest-records`, {
        headers: {
          API_KEY: API_KEY,
        },
      });
      return res.data.data;
    } catch (error) {
      return [];
    }
  }
}
