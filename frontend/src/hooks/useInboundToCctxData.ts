import { ApiService } from "@/service";
import { Action } from "@/types/types";
import { useQuery } from "@tanstack/react-query";
import { MockBlockpi } from "@/mocks/mockBlockpi";

const useMockService = process.env.NEXT_PUBLIC_USE_MOCK_CCTX === 'true';
const blockpiService = useMockService ? new MockBlockpi() : new ApiService().blockpi;

export const useInboundToCctxData = (crossschainInvestHash: string, action: Action) => {
  return useQuery({
    queryKey: ["InboundToCctxData", crossschainInvestHash],
    queryFn: () => blockpiService.getInboundHashToCctxData(crossschainInvestHash),
    refetchInterval: 5000,
    enabled: crossschainInvestHash != "" && action == Action.crosschainInvest
  });
};

// Export the mock service for testing
export const getMockBlockpi = () => blockpiService as MockBlockpi;
