import { ApiService } from "@/service"
import { SearchParams } from "@/types/types"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react";

export const useLeaderboardData = (searchParams: SearchParams): { data: any, isLoading: boolean, error: any } => {

     const apiService = useMemo(() => new ApiService(), []);
     
    const { data, isLoading, error } = useQuery({
      queryKey: ["LeaderboardData", searchParams],
      queryFn: () => apiService.getLeaderboardData(searchParams),
    });

    return { data, isLoading, error }
}