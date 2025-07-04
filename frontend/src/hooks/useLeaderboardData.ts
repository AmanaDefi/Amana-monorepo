import { ONE_MINUTE } from "@/constants"
import {apiService} from "@/service"
import { SearchParams } from "@/types/types"
import { useQuery } from "@tanstack/react-query"

export const useLeaderboardData = (searchParams: SearchParams): { data: any, isLoading: boolean, error: any } => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["LeaderboardData", searchParams],
        queryFn: () => apiService.getLeaderboardData(searchParams),
        staleTime: 3 * ONE_MINUTE
    })

    return { data, isLoading, error }
}
