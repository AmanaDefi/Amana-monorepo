import {apiService} from "@/service";
import { Action } from "@/types/types";
import { useQuery } from "@tanstack/react-query";

export const useInboundToCctxData = (crossschainInvestHash: string, action: Action) => {
  const { data } = useQuery({
    queryKey: ["InboundToCctxData", crossschainInvestHash, action],
    queryFn: () => apiService.blockpi.getInboundHashToCctxData(crossschainInvestHash),
    refetchInterval: 5000,
    staleTime: 3 * 1000,
    enabled: crossschainInvestHash !== "" && action === Action.crosschainInvest
  });

  return data
};
