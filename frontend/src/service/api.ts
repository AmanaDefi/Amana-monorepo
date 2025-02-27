import { API_URL } from "@/config.ts/apiConfig";
import axios, { AxiosInstance } from "axios";

export default class BaseAPI {
    public api: AxiosInstance;
    constructor() {
        this.api = axios.create({ baseURL: API_URL });
    }

    async getLeaderboardData(page: number, perPage: number) {
        const from: number = (page - 1) * perPage;
        const to: number = page * perPage - 1;
        try {
            const res = await this.api.get(`/vaults/v1/leaderboard?start=${from}&limit=${to}`);
            return res.data
        } catch (error) {
            console.log(error);
            return []
        }
    }
}