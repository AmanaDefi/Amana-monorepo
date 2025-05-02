import { SearchParams } from "@/types/types";
import BaseAPI from "./baseApi";
import Blockpi from "./blockpi";

export class ApiService {
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
