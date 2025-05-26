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
  type: 'local' | 'inboundToCctx' | 'cctx' | 'strategy_tx_extract';
  hash: string;
  status: BlockPIStatus | null;
  data: BlockPIResponse | null;
  error?: string;
  name: string;
  url?: string;
}

export interface TransactionProgress {
  steps: TransactionStep[];
  currentStep: number;
  isComplete: boolean;
  error?: string;
}

// Define transaction sequences based on the correct hash chaining flow
export interface TransactionSequence {
  type: 'deposit' | 'withdrawal';
  steps: Array<{
    name: string;
    type: 'local' | 'inboundToCctx' | 'cctx' | 'strategy_tx_extract';
    getHash: (localHash: string, prevStepData?: any) => string;
  }>;
}

export const TRANSACTION_SEQUENCES: Record<string, TransactionSequence> = {
  deposit: {
    type: 'deposit',
    steps: [
      {
        name: 'Initial local transaction',
        type: 'local',
        getHash: (localHash: string) => localHash
      },
      {
        name: 'Cross chain call to vault on ZC',
        type: 'inboundToCctx',
        getHash: (localHash: string) => localHash // Step 2 uses local hash
      },
      {
        name: 'Cross chain call from vault to strategy',
        type: 'inboundToCctx',
        getHash: (localHash: string, prevStepData: any) => {
          // Step 3 uses Step 2's cctx_index as inbound hash
          return prevStepData?.cctxIndex || prevStepData?.CrossChainTx?.index;
        }
      },
      {
        name: 'Transaction on strategy chain',
        type: 'strategy_tx_extract',
        getHash: (localHash: string, prevStepData: any) => {
          // Step 4: Extract the outbound hash from Step 3's cctx data
          return prevStepData?.CrossChainTx?.outbound_params?.[0]?.hash;
        }
      },
      {
        name: 'Cross chain call from strategy back to vault',
        type: 'inboundToCctx',
        getHash: (localHash: string, prevStepData: any) => {
          // Step 5: Use the strategy chain hash extracted in Step 4
          return prevStepData?.hash;
        }
      }
    ]
  },
  withdrawal: {
    type: 'withdrawal',
    steps: [
      {
        name: 'Initial local transaction',
        type: 'local',
        getHash: (localHash: string) => localHash
      },
      {
        name: 'Cross chain call to vault on ZC',
        type: 'inboundToCctx',
        getHash: (localHash: string) => localHash // Step 2 uses local hash
      },
      {
        name: 'Cross chain call from vault to strategy',
        type: 'inboundToCctx',
        getHash: (localHash: string, prevStepData: any) => {
          // Step 3 uses Step 2's cctx_index as inbound hash
          return prevStepData?.cctxIndex || prevStepData?.CrossChainTx?.index;
        }
      },
      {
        name: 'Transaction on strategy chain',
        type: 'strategy_tx_extract',
        getHash: (localHash: string, prevStepData: any) => {
          // Step 4: Extract the outbound hash from Step 3's cctx data
          return prevStepData?.CrossChainTx?.outbound_params?.[0]?.hash;
        }
      },
      {
        name: 'Cross chain call from strategy back to vault',
        type: 'inboundToCctx',
        getHash: (localHash: string, prevStepData: any) => {
          // Step 5: Use the strategy chain hash extracted in Step 4
          return prevStepData?.hash;
        }
      },
      {
        name: 'Cross chain withdraw from vault to user',
        type: 'inboundToCctx',
        getHash: (localHash: string, prevStepData: any) => {
          // Step 6: Use Step 5's cctx_index as inbound hash
          return prevStepData?.cctxIndex || prevStepData?.CrossChainTx?.index;
        }
      }
    ]
  }
};

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

  private async makeRequest(endpoint: string, cacheBuster?: number | number, retries: number = 3): Promise<any> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Add cache busting to ensure we get fresh data
        const timestamp = typeof cacheBuster === 'number' ? cacheBuster : Date.now();
        const separator = endpoint.includes('?') ? '&' : '?';
        const endpointWithCacheBuster = `${endpoint}${separator}t=${timestamp}`;
        
        console.log(`[BlockPI API Call] Making request to: ${this.api.defaults.baseURL}${endpointWithCacheBuster}`);
        const response = await this.api.get(endpointWithCacheBuster);
        console.log(`[BlockPI API Call] Response received:`, response.status, response.statusText);
        return response.data;
      } catch (error: any) {
        lastError = error;
        
        // Handle different types of errors
        if (error.response?.status === 404) {
          // For 404s, only log on first and last attempt
          if (attempt === 1 || attempt === retries) {
            console.log(`[BlockPI] Data not yet available (attempt ${attempt}/${retries})`);
          }
          
          // For 404s, wait longer with exponential backoff
          if (attempt < retries) {
            const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000); // 5s, 10s, 20s, max 30s
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        } else if (error.response?.status === 429) {
          // Rate limited - wait much longer
          console.log(`[BlockPI] Rate limited (attempt ${attempt}/${retries}) - backing off`);
          if (attempt < retries) {
            const waitTime = Math.min(10000 * Math.pow(2, attempt - 1), 60000); // 10s, 20s, 40s, max 60s
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        } else if (error.response?.status >= 500) {
          if (attempt === retries) {
            console.log(`[BlockPI] Server error ${error.response.status}`);
          }
          
          // For server errors, shorter retry intervals
          if (attempt < retries) {
            const waitTime = 3000 * attempt; // 3s, 6s, 9s
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        } else if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
          if (attempt === retries) {
            console.log(`[BlockPI] Network issue after ${retries} attempts`);
          }
          
          if (attempt < retries) {
            const waitTime = 5000 * attempt; // 5s, 10s, 15s
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        } else {
          // For other errors, fail immediately
          console.error(`[BlockPI] Request failed:`, error.message);
          throw error;
        }
      }
    }
    
    // If we've exhausted retries, provide a more descriptive error
    if (lastError?.response?.status === 404) {
      throw new Error(`Data not yet available after ${retries} attempts.`);
    } else if (lastError?.response?.status === 429) {
      throw new Error(`Rate limited. Please try again later.`);
    } else {
      throw new Error(`Request failed: ${lastError?.message || 'Unknown error'}`);
    }
  }

  // Get data from inboundHashToCctx endpoint
  async getInboundHashToCctx(hash: string, cacheBuster?: number): Promise<any> {
    try {
      console.log(`[BlockPI] Getting inboundHashToCctx for hash: ${hash} (timestamp: ${cacheBuster || 'none'})`);
      const data = await this.makeRequest(`/inboundHashToCctx/${hash}`, cacheBuster);
      console.log(`[BlockPI] inboundHashToCctx response:`, data);
      return data;
    } catch (error) {
      console.error(`[BlockPI] Error getting inboundHashToCctx for ${hash}:`, error);
      throw error;
    }
  }

  // Get data from cctx endpoint
  async getCctx(cctxIndex: string, cacheBuster?: number): Promise<any> {
    try {
      console.log(`[BlockPI] Getting cctx for index: ${cctxIndex} (timestamp: ${cacheBuster || 'none'})`);
      const data = await this.makeRequest(`/cctx/${cctxIndex}`, cacheBuster);
      console.log(`[BlockPI] cctx response:`, data);
      return data;
    } catch (error) {
      console.error(`[BlockPI] Error getting cctx for ${cctxIndex}:`, error);
      throw error;
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

  // Execute a single step of the transaction sequence
  async executeTransactionStep(
    stepIndex: number,
    stepConfig: any,
    localHash: string,
    prevStepData?: any,
    cacheBuster?: number
  ): Promise<{ success: boolean; data?: any; error?: string; cctxIndex?: string }> {
    try {
      const stepHash = stepConfig.getHash(localHash, prevStepData);
      
      if (!stepHash) {
        return { success: false, error: `No hash available for step ${stepIndex + 1}` };
      }
      
      if (stepConfig.type === 'local') {
        // Local transaction is already completed
        return { 
          success: true, 
          data: { status: 'LocalTx', hash: stepHash }
        };
      } else if (stepConfig.type === 'inboundToCctx') {
        // Get inbound to cctx data with cache buster
        console.log(`[BlockPI] Step ${stepIndex + 1}: Calling inboundHashToCctx with hash: ${stepHash} (timestamp: ${cacheBuster || 'none'})`);
        const inboundData = await this.getInboundHashToCctx(stepHash, cacheBuster);
        if (!inboundData) {
          return { success: false, error: 'No inbound data found' };
        }

        const cctxIndex = inboundData?.inboundHashToCctx?.cctx_index?.[0];
        if (!cctxIndex) {
          return { success: false, error: 'No cctx_index found in inbound response' };
        }

        console.log(`[BlockPI] Step ${stepIndex + 1}: Got cctx_index: ${cctxIndex}`);

        // Get the cctx data to check status with cache buster
        const cctxData = await this.getCctx(cctxIndex, cacheBuster);
        if (!cctxData) {
          return { success: false, error: 'No cctx data found' };
        }

        const status = cctxData?.CrossChainTx?.cctx_status?.status;
        const lastUpdate = cctxData?.CrossChainTx?.cctx_status?.lastUpdate_timestamp;
        console.log(`[BlockPI] Step ${stepIndex + 1}: Status: ${status}, Last Update: ${lastUpdate}, cctxIndex: ${cctxIndex}`);
        
        if (status === 'OutboundMined' || status === 'Success') {
          console.log(`[BlockPI] Step ${stepIndex + 1} completed: Cross chain call to vault on ZC (hash: ${stepHash})`);
          return { 
            success: true, 
            data: { 
              ...cctxData, 
              cctxIndex, 
              hash: stepHash,
              inboundData,
              status,
              lastUpdate
            },
            cctxIndex
          };
        } else if (this.isRevertWithSecondOutbound(cctxData) || status === 'Reverted' || status === 'Aborted' || status === 'Failed') {
          const revertHash = cctxData.CrossChainTx?.outbound_params?.[1]?.hash || cctxData.CrossChainTx?.outbound_params?.[0]?.hash;
          console.error(`[BlockPI] Step ${stepIndex + 1} failed: ${status} (hash: ${revertHash})`);
          return { 
            success: false, 
            error: `Transaction reverted: ${status} (hash: ${revertHash})`,
            data: cctxData
          };
        } else {
          console.log(`[BlockPI] Step ${stepIndex + 1} still pending: ${status}, will retry...`);
          return { 
            success: false, 
            error: `Transaction pending: ${status} (updated: ${lastUpdate})`,
            data: cctxData
          };
        }
      } else if (stepConfig.type === 'strategy_tx_extract') {
        // This step represents the strategy chain transaction hash extracted from previous step
        // We don't make an API call here, just return the hash as a completed step
        if (!stepHash) {
          return { success: false, error: 'No strategy transaction hash found in previous step' };
        }
        
        console.log(`[BlockPI] Step ${stepIndex + 1}: Extracted strategy chain tx hash: ${stepHash}`);
        
        return { 
          success: true, 
          data: { 
            status: 'StrategyTxExtracted',
            hash: stepHash,
            type: 'strategy_chain_transaction',
            description: 'Transaction executed on strategy chain'
          }
        };
      } else if (stepConfig.type === 'cctx') {
        // Direct cctx call with cache buster
        const cctxData = await this.getCctx(stepHash, cacheBuster);
        if (!cctxData) {
          return { success: false, error: 'No cctx data found' };
        }

        const status = cctxData?.CrossChainTx?.cctx_status?.status;
        
        if (status === 'OutboundMined' || status === 'Success') {
          return { 
            success: true, 
            data: { ...cctxData, hash: stepHash }
          };
        } else if (this.isRevertWithSecondOutbound(cctxData) || status === 'Reverted' || status === 'Aborted' || status === 'Failed') {
          const revertHash = cctxData.CrossChainTx?.outbound_params?.[1]?.hash || cctxData.CrossChainTx?.outbound_params?.[0]?.hash;
          return { 
            success: false, 
            error: `Transaction reverted: ${status} (hash: ${revertHash})`,
            data: cctxData
          };
        } else {
          return { 
            success: false, 
            error: `Transaction pending: ${status}`,
            data: cctxData
          };
        }
      }

      return { success: false, error: `Unknown step type: ${stepConfig.type}` };
    } catch (error) {
      console.error(`[BlockPI] Error in step ${stepIndex + 1}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Track complete transaction sequence
  async trackTransactionSequence(
    localHash: string,
    transactionType: 'deposit' | 'withdrawal',
    onStepUpdate?: (step: number, status: 'pending' | 'processing' | 'completed' | 'error', data?: any) => void,
    timestamp?: number // Added optional timestamp parameter for cache busting
  ): Promise<TransactionProgress> {
    console.log('[BlockPI Service] trackTransactionSequence called with:', {
      localHash,
      transactionType,
      hasCallback: !!onStepUpdate,
      timestamp: timestamp || Date.now()
    });
    
    const sequence = TRANSACTION_SEQUENCES[transactionType];
    if (!sequence) {
      throw new Error(`Unknown transaction type: ${transactionType}`);
    }
    
    console.log('[BlockPI Service] Using sequence:', sequence);

    const startTime = Date.now();
    const steps: TransactionStep[] = [];
    let currentStep = 0;
    let prevStepData: any = null;

    // Initialize steps array but don't call onStepUpdate for all steps
    for (let i = 0; i < sequence.steps.length; i++) {
      steps.push({
        type: sequence.steps[i].type,
        hash: '',
        status: null,
        data: null,
        name: sequence.steps[i].name
      });
    }

    // Only initialize the first step as processing
    onStepUpdate?.(0, 'processing');

    try {
      // Execute each step in sequence
      for (let stepIndex = 0; stepIndex < sequence.steps.length; stepIndex++) {
        currentStep = stepIndex;
        const stepConfig = sequence.steps[stepIndex];
        
        // Only call processing update if not already called for step 0
        if (stepIndex > 0) {
          onStepUpdate?.(stepIndex, 'processing');
        }
        
        let attempt = 0;
        const maxAttempts = 15; // Increased retry attempts for better reliability
        let baseDelay = 3000; // Start with 3s
        let stepCompleted = false;

        while (attempt < maxAttempts && !stepCompleted && Date.now() - startTime < 600000) {
          // Add timestamp to force fresh API call on each attempt
          const cacheBuster = Date.now();
          console.log(`[BlockPI] Step ${stepIndex + 1} attempt ${attempt + 1} with timestamp ${cacheBuster}`);
          
          const result = await this.executeTransactionStep(
            stepIndex, 
            stepConfig, 
            localHash, 
            prevStepData,
            cacheBuster // Pass timestamp to ensure fresh API call
          );
          
          // Calculate hash after we have the result
          const calculatedHash = stepConfig.getHash(localHash, prevStepData);
          steps[stepIndex].hash = calculatedHash;
          
          if (result.success) {
            steps[stepIndex].status = 'OutboundMined' as BlockPIStatus;
            steps[stepIndex].data = result.data;
            // Update prevStepData with the complete result data
            prevStepData = result.data;
            onStepUpdate?.(stepIndex, 'completed', {
              ...result.data,
              hash: calculatedHash,
              cctxIndex: result.cctxIndex,
              url: stepConfig.type === 'inboundToCctx' && result.cctxIndex ? 
                `${this.api.defaults.baseURL}/cctx/${result.cctxIndex}` : undefined
            });
            stepCompleted = true;
            console.log(`[BlockPI] Step ${stepIndex + 1} completed: ${stepConfig.name} (hash: ${calculatedHash})`);
          } else if (result.error?.includes('reverted')) {
            steps[stepIndex].status = 'Reverted' as BlockPIStatus;
            steps[stepIndex].error = result.error;
            steps[stepIndex].data = result.data;
            onStepUpdate?.(stepIndex, 'error', result.data);
            return {
              steps,
              currentStep: stepIndex,
              isComplete: false,
              error: result.error
            };
          } else {
            // Step not ready yet, retry with exponential backoff
            attempt++;
            const backoffDelay = Math.min(baseDelay * attempt, 24000);
            
            console.log(`[BlockPI] Step ${stepIndex + 1} attempt ${attempt}/${maxAttempts}: ${result.error}, next attempt in ${backoffDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
        }

        if (!stepCompleted) {
          const error = `Step ${stepIndex + 1} failed after ${maxAttempts} attempts`;
          steps[stepIndex].error = error;
          onStepUpdate?.(stepIndex, 'error');
          
          // Don't stop on later step failures - continue to next step
          if (stepIndex <= 1) {
            return {
              steps,
              currentStep: stepIndex,
              isComplete: false,
              error
            };
          }
          
          console.warn(`[BlockPI] Step ${stepIndex + 1} failed, but continuing to check remaining steps`);
          continue;
        }
      }

      return {
        steps,
        currentStep: sequence.steps.length,
        isComplete: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onStepUpdate?.(currentStep, 'error');
      return {
        steps,
        currentStep,
        isComplete: false,
        error: errorMessage
      };
    }
  }

  // Get transaction status from either endpoint
  async getTransactionStatus(localchainHash: string, cctxIndex?: string): Promise<BlockPIStatus | null> {
    try {
      let data: BlockPIResponse | null = null;
      
      if (cctxIndex) {
        data = await this.getCctx(cctxIndex);
      } else {
        data = await this.getInboundHashToCctx(localchainHash);
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

  // Track transaction progress across all steps (legacy method for backward compatibility)
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
      const inboundData = await this.getInboundHashToCctx(localchainHash);
      if (!inboundData) {
        throw new Error("Failed to get initial transaction data");
      }

      steps.push({
        type: 'inboundToCctx',
        hash: localchainHash,
        status: (inboundData.CrossChainTx?.cctx_status?.status || 
                inboundData.CrossChainTxs?.[0]?.cctx_status?.status || 
                null) as BlockPIStatus | null,
        data: inboundData,
        name: 'Initial cross-chain call'
      });

      // Get cctx index from inbound data
      const cctxIndex = inboundData.CrossChainTx?.index || 
                       inboundData.CrossChainTxs?.[0]?.index;
      
      if (!cctxIndex) {
        throw new Error("No cctx index found in transaction data");
      }

      // Step 2: Get cctx data
      const cctxData = await this.getCctx(cctxIndex);
      if (!cctxData) {
        throw new Error("Failed to get cctx data");
      }

      steps.push({
        type: 'cctx',
        hash: cctxIndex,
        status: (cctxData.CrossChainTx?.cctx_status?.status || 
                cctxData.CrossChainTxs?.[0]?.cctx_status?.status || 
                null) as BlockPIStatus | null,
        data: cctxData,
        name: 'Cross-chain transaction'
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