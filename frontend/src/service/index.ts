import { SearchParams } from "@/types/types";
import BaseAPI from "./baseApi";
import Blockpi from "./blockpi";
import { exponentialApi } from "./exponentialApi";

class APIService {
  public api: BaseAPI;
  public blockpi: Blockpi;
  public exponential: typeof exponentialApi;

  constructor() {
    this.api = new BaseAPI();
    this.blockpi = new Blockpi();
    this.exponential = exponentialApi;
  }

  async getLeaderboardData(searchParams: SearchParams) {
    return this.api.getLeaderboardData(searchParams);
  }
}

export const apiService = new APIService();
