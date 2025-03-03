import { ApiService } from "@/service"
import { SearchParams } from "@/types/types"
import { useQuery } from "@tanstack/react-query"

export const useLeaderboardData = (searchParams: SearchParams): { data: any[], isLoading: boolean, error: any } => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["LeaderboardData", searchParams],
        queryFn: () => new ApiService().getLeaderboardData(searchParams)
    })

    return { data, isLoading, error }
}