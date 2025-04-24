import { ApiService } from "@/service";
import { useQuery } from "@tanstack/react-query";

export const useInboundToCctxData = (crossschainInvestHash: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["InboundToCctxData", crossschainInvestHash],
    queryFn: () => new ApiService().blockpi.getInboundHashToCctxData(crossschainInvestHash),
    refetchInterval: 5000,
    enabled: crossschainInvestHash != ""
  });

  return data
};
