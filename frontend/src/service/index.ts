import { SearchParams } from "@/types/types";
import BaseAPI from "./api";

export class ApiService {
    public api: BaseAPI;
    constructor () {
        this.api = new BaseAPI();
    }

    async getLeaderboardData(searchParams:SearchParams) {
        return this.api.getLeaderboardData(searchParams);
    }
}