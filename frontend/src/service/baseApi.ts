import { API_KEY, API_URL } from "@/config.ts/apiConfig";
import { SearchParams } from "@/types/types";
import axios, { AxiosInstance } from "axios";

export default class BaseAPI {
  public api: AxiosInstance;
  constructor() {
    this.api = axios.create({ baseURL: API_URL });
  }

  async getLeaderboardData(searchParams: SearchParams) {
    const { page, perPage, userAddress } = searchParams;
    const from: number = (page - 1) * perPage;
    const to: number = page * perPage;
    try {
      const res = await this.api.get(
        `/vaults/v1/leaderboard?start=${from}&limit=${to}&user_address=${userAddress}`
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
          "API_KEY": API_KEY,
        },
      });
      return res.data.data[0];
    } catch (error) {
      return [];
    }
  }

  async getDistinctLatestRecords() {
    try {
      const res = await this.api.get(`/vault/v1/get-distinct-latest-records`, {
        headers: {
          "API_KEY": API_KEY,
        },
      });
      return res.data.data;
    } catch (error) {
      return [];
    }
  }
}