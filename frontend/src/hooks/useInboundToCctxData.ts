import { ApiService } from "@/service";
import { Action } from "@/types/types";
import { useQuery } from "@tanstack/react-query";

export const useInboundToCctxData = (crossschainInvestHash: string, action: Action) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["InboundToCctxData", crossschainInvestHash],
    queryFn: () => new ApiService().blockpi.getInboundHashToCctxData(crossschainInvestHash),
    refetchInterval: 5000,
    staleTime: 3 * 1000,
    enabled: crossschainInvestHash !== "" && action === Action.crosschainInvest
  });

  return data
};
