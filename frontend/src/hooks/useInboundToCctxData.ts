import { ApiService } from "@/service";
import { Action } from "@/types/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export const useInboundToCctxData = (crossschainInvestHash: string, action: Action) => {
  const apiService = useMemo(() => new ApiService(), []); 

  const { data, isLoading, error } = useQuery({
    queryKey: ["InboundToCctxData", crossschainInvestHash, action],
    queryFn: () =>
      apiService.blockpi.getInboundHashToCctxData(crossschainInvestHash),
    refetchInterval: 5000,
    enabled: crossschainInvestHash !== "" && action === Action.crosschainInvest,
  });

  return data
};
