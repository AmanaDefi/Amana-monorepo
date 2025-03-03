import { API_URL } from "@/config.ts/apiConfig";
import { SearchParams } from "@/types/types";
import axios, { AxiosInstance } from "axios";

export default class BaseAPI {
    public api: AxiosInstance;
    constructor() {
        this.api = axios.create({ baseURL: API_URL });
    }

    async getLeaderboardData(searchParams: SearchParams) {
        const {page, perPage, userAddress} = searchParams;
        const from: number = (page - 1) * perPage;
        const to: number = page * perPage - 1;
        try {
            const res = await this.api.get(`/vaults/v1/leaderboard?start=${from}&limit=${to}&user_address=${userAddress}`);
            return res.data.data
        } catch (error) {
            console.log(error);
            return []
        }
    }
}