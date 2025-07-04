import { SearchParams } from "@/types/types";
import BaseAPI from "./baseApi";
import Blockpi from "./blockpi";

class APIService {
  public api: BaseAPI;
  public blockpi: Blockpi;
  constructor() {
    this.api = new BaseAPI();
    this.blockpi = new Blockpi();
  }

  async getLeaderboardData(searchParams: SearchParams) {
    return this.api.getLeaderboardData(searchParams);
  }
}

export const apiService = new APIService();
