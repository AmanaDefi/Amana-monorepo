import { ApiService } from "@/service"
import { useQuery } from "@tanstack/react-query"

export const useLeaderboardData = (page: number, perPage: number) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["LeaderboardData", page, perPage],
        queryFn: () => new ApiService().getLeaderboardData(page, perPage)
    })

    return {data, isLoading, error}
}