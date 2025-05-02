import { BLOCKPI_URL } from "@/config.ts/apiConfig";
import axios, { AxiosInstance } from "axios";

export default class Blockpi {
  public api: AxiosInstance;
  constructor() {
    this.api = axios.create({ baseURL: BLOCKPI_URL });
  }

  async getInboundHashToCctxData(localchainHash: string) {
    try {
      const res = await this.api.get(
        `/inboundHashToCctxData/${localchainHash}`
      );
      if (res.data) console.log(res.data, "Data from blockpi");
      return res.data;
    } catch (error) {
      return null;
    }
  }
}
