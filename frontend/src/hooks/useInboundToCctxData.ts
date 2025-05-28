import { ApiService } from "@/service";
import { Action } from "@/types/types";
import { useQuery } from "@tanstack/react-query";
import { MockBlockpi } from "@/mocks/mockBlockpi";
import { BlockPIResponse, BlockPIStatus } from "@/service/blockpi";

const useMockService = process.env.NEXT_PUBLIC_USE_MOCK_CCTX === 'true';
const blockpiService = useMockService ? new MockBlockpi() : new ApiService().blockpi;

export interface UseInboundToCctxDataResult {
  data: BlockPIResponse | null;
  status: BlockPIStatus | null;
  isConfirmed: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
}

export const useInboundToCctxData = (
  crosschainInvestHash: string, 
  action: Action
): UseInboundToCctxDataResult => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["InboundToCctxData", crosschainInvestHash],
    queryFn: async () => {
      if (!crosschainInvestHash) return null;
      return blockpiService.getInboundHashToCctx(crosschainInvestHash);
    },
    refetchInterval: 5000,
    enabled: crosschainInvestHash !== "" && action === Action.crosschainInvest,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const status = data?.CrossChainTx?.cctx_status?.status || 
                data?.CrossChainTxs?.[0]?.cctx_status?.status || 
                null;
  const isConfirmed = status === "OutboundMined" || status === "Success";

  return {
    data: data || null,
    status: status as BlockPIStatus | null,
    isConfirmed,
    isLoading,
    error: error as Error | null,
    refetch
  };
};

// Export the mock service for testing
export const getMockBlockpi = () => blockpiService as MockBlockpi;
