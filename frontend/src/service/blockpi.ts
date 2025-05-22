import { BLOCKPI_URL } from "@/config.ts/apiConfig";
import axios, { AxiosInstance } from "axios";

export type BlockPIStatus = 
  | "OutboundMined" 
  | "Reverted" 
  | "Pending" 
  | "Failed" 
  | "Success";

interface CrossChainTxData {
  creator: string;
  index: string;
  cctx_status: {
    status: string;
    status_message: string;
    error_message: string;
    lastUpdate_timestamp: string;
    isAbortRefunded: boolean;
    created_timestamp: string;
  };
  inbound_params: {
    sender: string;
    sender_chain_id: string;
    tx_origin: string;
    coin_type: string;
    asset: string;
    amount: string;
    observed_hash: string;
    observed_external_height?: string;
    ballot_index?: string;
    finalized_zeta_height?: string;
    tx_finalization_status?: string;
    is_cross_chain_call?: boolean;
    status: string;
    confirmation_mode: string;
  };
  outbound_params?: Array<{
    receiver: string;
    receiver_chainId: string;
    coin_type: string;
    amount: string;
    tss_nonce: string;
    gas_limit: string;
    gas_price: string;
    gas_priority_fee: string;
    hash: string;
    ballot_index: string;
    observed_external_height: string;
    gas_used: string;
    effective_gas_price: string;
    effective_gas_limit: string;
    tss_pubkey: string;
    tx_finalization_status: string;
    call_options?: {
      gas_limit: string;
      is_arbitrary_call: boolean;
    };
    confirmation_mode: string;
  }>;
}

export interface BlockPIResponse {
  CrossChainTx?: CrossChainTxData;
  CrossChainTxs?: CrossChainTxData[];
  inboundHashToCctx?: {
    cctx_index: string[];
  };
}

export interface TransactionStep {
  type: 'local' | 'inboundToCctx' | 'cctx';
  hash: string;
  status: BlockPIStatus | null;
  data: BlockPIResponse | null;
  error?: string;
}

export interface TransactionProgress {
  steps: TransactionStep[];
  currentStep: number;
  isComplete: boolean;
  error?: string;
}

export default class Blockpi {
  public api: AxiosInstance;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds
  private readonly POLLING_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.api = axios.create({ 
      baseURL: BLOCKPI_URL,
      timeout: 10000 // 10 second timeout
    });
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
      return this.retryWithBackoff(operation, retries - 1);
    }
  }

  // Get data from inboundHashToCctx endpoint
  async getInboundHashToCctxData(localchainHash: string): Promise<BlockPIResponse | null> {
    try {
      // Set a shorter timeout for individual requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await this.api.get<BlockPIResponse>(`inboundHashToCctx/${localchainHash}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (res.data) {
        console.log("[BlockPI] InboundHashToCctx data:", res.data);
        return res.data;
      }
      return null;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("[BlockPI] Request timed out, will retry");
      } else if (error.response?.status === 404) {
        console.log("[BlockPI] Transaction not propagated yet (404), will retry");
      } else {
        console.error("[BlockPI] Error fetching inboundHashToCctx data:", error);
      }
      return null;
    }
  }

  // Get data from cctx endpoint
  async getCctxData(cctxIndex: string): Promise<BlockPIResponse | null> {
    try {
      // Set a shorter timeout for individual requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await this.api.get<BlockPIResponse>(`cctx/${cctxIndex}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (res.data) {
        console.log("[BlockPI] Cctx data:", res.data);
        return res.data;
      }
      return null;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("[BlockPI] Request timed out, will retry");
      } else if (error.response?.status === 404) {
        console.log("[BlockPI] Transaction not propagated yet (404), will retry");
      } else {
        console.error("[BlockPI] Error fetching cctx data:", error);
      }
      return null;
    }
  }

  // Helper to check for revert with second outbound param
  private isRevertWithSecondOutbound(data: BlockPIResponse): boolean {
    const status = data?.CrossChainTx?.cctx_status?.status || 
                  data?.CrossChainTxs?.[0]?.cctx_status?.status;
    const outboundParams = data?.CrossChainTx?.outbound_params || 
                          data?.CrossChainTxs?.[0]?.outbound_params;
    return (
      status === 'Reverted' &&
      Array.isArray(outboundParams) &&
      outboundParams.length > 1 &&
      !!outboundParams[1]?.hash
    );
  }

  // Get transaction status from either endpoint
  async getTransactionStatus(localchainHash: string, cctxIndex?: string): Promise<BlockPIStatus | null> {
    try {
      let data: BlockPIResponse | null = null;
      
      if (cctxIndex) {
        data = await this.getCctxData(cctxIndex);
      } else {
        data = await this.getInboundHashToCctxData(localchainHash);
      }

      const status = data?.CrossChainTx?.cctx_status?.status || 
                    data?.CrossChainTxs?.[0]?.cctx_status?.status;
      
      if (status && ["OutboundMined", "Reverted", "Pending", "Failed", "Success"].includes(status)) {
        return status as BlockPIStatus;
      }
      return null;
    } catch (error) {
      console.error("[BlockPI] Error getting transaction status:", error);
      return null;
    }
  }

  // Track transaction progress across all steps
  async trackTransactionProgress(
    localchainHash: string,
    timeout: number = 300000 // 5 minutes
  ): Promise<TransactionProgress> {
    const startTime = Date.now();
    const steps: TransactionStep[] = [];
    let currentStep = 0;
    let error: string | undefined;

    try {
      // Step 1: Get initial inboundHashToCctx data
      const inboundData = await this.getInboundHashToCctxData(localchainHash);
      if (!inboundData) {
        throw new Error("Failed to get initial transaction data");
      }

      steps.push({
        type: 'inboundToCctx',
        hash: localchainHash,
        status: (inboundData.CrossChainTx?.cctx_status?.status || 
                inboundData.CrossChainTxs?.[0]?.cctx_status?.status || 
                null) as BlockPIStatus | null,
        data: inboundData
      });

      // Get cctx index from inbound data
      const cctxIndex = inboundData.CrossChainTx?.index || 
                       inboundData.CrossChainTxs?.[0]?.index;
      
      if (!cctxIndex) {
        throw new Error("No cctx index found in transaction data");
      }

      // Step 2: Get cctx data
      const cctxData = await this.getCctxData(cctxIndex);
      if (!cctxData) {
        throw new Error("Failed to get cctx data");
      }

      steps.push({
        type: 'cctx',
        hash: cctxIndex,
        status: (cctxData.CrossChainTx?.cctx_status?.status || 
                cctxData.CrossChainTxs?.[0]?.cctx_status?.status || 
                null) as BlockPIStatus | null,
        data: cctxData
      });

      // Check for revert
      if (this.isRevertWithSecondOutbound(cctxData)) {
        error = `Transaction reverted with second outbound hash: ${cctxData.CrossChainTx?.outbound_params?.[1]?.hash || cctxData.CrossChainTxs?.[0]?.outbound_params?.[1]?.hash}`;
        return { steps, currentStep: 2, isComplete: false, error };
      }

      // Wait for final confirmation
      while (Date.now() - startTime < timeout) {
        const status = await this.getTransactionStatus(localchainHash, cctxIndex);
      
      if (status === "OutboundMined" || status === "Success") {
          return { steps, currentStep: 2, isComplete: true };
      }
      
      if (status === "Reverted" || status === "Failed") {
          error = `Transaction failed with status: ${status}`;
          return { steps, currentStep: 2, isComplete: false, error };
        }

        await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL));
      }

      error = "Transaction confirmation timeout";
      return { steps, currentStep: 2, isComplete: false, error };
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error occurred";
      return { steps, currentStep, isComplete: false, error };
    }
  }

  // Simplified confirmation check
  async isTransactionConfirmed(localchainHash: string): Promise<boolean> {
    try {
      const progress = await this.trackTransactionProgress(localchainHash);
      return progress.isComplete && !progress.error;
    } catch (error) {
      console.error("[BlockPI] Error checking transaction confirmation:", error);
      return false;
    }
  }
}
