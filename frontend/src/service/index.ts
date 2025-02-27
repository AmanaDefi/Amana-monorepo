import BaseAPI from "./api";

export class ApiService {
    public api: BaseAPI;
    constructor () {
        this.api = new BaseAPI();
    }

    async getLeaderboardData(page:number, perPage:number) {
        return this.api.getLeaderboardData(page, perPage);
    }
}