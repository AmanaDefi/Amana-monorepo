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
    try {
      const now = Date.now();
      const cached = localStorage.getItem(this.vaultDataCache);
      const timestamp = localStorage.getItem(this.vaultDataCacheTimestamp);
      if (cached && timestamp && now - Number(timestamp) < 5 * ONE_MINUTE) {
        return JSON.parse(cached);
      }
      const results = await Promise.all(
        addresses.map((addr) => this.getVaultData(addr)),
      );
      const map: Record<string, any> = {};
      addresses.forEach((addr, idx) => {
        map[addr] = results[idx];
      });
      localStorage.setItem(this.vaultDataCache, JSON.stringify(map));
      localStorage.setItem(this.vaultDataCacheTimestamp, now.toString());
      return map;
    } catch (error) {
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
