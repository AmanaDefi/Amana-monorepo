import { BLOCKPI_URL } from "@/config.ts/apiConfig";
import { CHAINS_EXPLORER_BASE_URL_MAINNET, ZETACHAIN_CROSSCHAIN_EXPLORER_URLS, deployEnv } from "@/constants/chainConfig";
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
    getHash: (localHash: string, prevStepData?: any, transactionTypeData?: any) => string;
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
        getHash: (localHash: string, prevStepData: any, transactionTypeData: any) => {
          const isType2 = transactionTypeData?.isType2 === true;
          
          if (isType2) {
            // Type 2: Step 3 uses outbound hash from Step 2
            console.log('[Type 2] Step 3 using outbound hash from Step 2');
            return prevStepData?.CrossChainTx?.outbound_params?.[0]?.hash;
          } else {
            // Type 4: Step 3 uses Step 2's cctx_index as inbound hash
            console.log('[Type 4] Step 3 using cctx_index from Step 2');
            return prevStepData?.cctxIndex || prevStepData?.CrossChainTx?.index;
          }
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
        getHash: (localHash: string, prevStepData: any, transactionTypeData: any) => {
          const isType2 = transactionTypeData?.isType2 === true;
          
          if (isType2) {
            // Type 2: Step 3 uses outbound hash from Step 2
            console.log('[Type 2] Step 3 using outbound hash from Step 2');
            return prevStepData?.CrossChainTx?.outbound_params?.[0]?.hash;
          } else {
            // Type 4: Step 3 uses Step 2's cctx_index as inbound hash
            console.log('[Type 4] Step 3 using cctx_index from Step 2');
            return prevStepData?.cctxIndex || prevStepData?.CrossChainTx?.index;
          }
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

// Add new types for error classification
export type BlockPIErrorType = 
  | 'NETWORK_ERROR'
  | 'API_RATE_LIMIT'
  | 'TRANSACTION_REVERTED'
  | 'TIMEOUT'
  | 'TIMEOUT_WITH_NEXT_STEP'
  | 'DATA_NOT_AVAILABLE'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

// Add enhanced response interface
export interface EnhancedTransactionProgress extends TransactionProgress {
  isTimeout: boolean;
  hasOutboundHash?: boolean;
  outboundHash?: string;
  errorType?: BlockPIErrorType;
  stepWaitingTooLong?: number; // Step index that's taking longer than expected
  waitTime?: number; // How long the step has been waiting
}

export default class Blockpi {
  public api: AxiosInstance;
  private readonly MAX_RETRIES = 5; // Increased from 3
  private readonly RETRY_DELAY = 2000; // 2 seconds
  private readonly POLLING_INTERVAL = 5000; // 5 seconds
  private readonly MAX_ATTEMPTS = 30; // Increased from 15
  private readonly LONG_WAIT_THRESHOLD = 5; // After 5 attempts, show "taking longer than expected"

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
    cacheBuster?: number,
    transactionTypeData?: any
  ): Promise<{ success: boolean; data?: any; error?: string; cctxIndex?: string }> {
    try {
      const stepHash = stepConfig.getHash(localHash, prevStepData, transactionTypeData);
      
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

  // Enhanced error classification method
  private classifyError(error: any): BlockPIErrorType {
    if (error?.code === 'NETWORK_ERROR' || error?.code === 'ECONNABORTED') {
      return 'NETWORK_ERROR';
    }
    
    if (error?.response?.status === 429) {
      return 'API_RATE_LIMIT';
    }
    
    if (error?.response?.status === 404) {
      return 'DATA_NOT_AVAILABLE';
    }
    
    if (error?.response?.status >= 500) {
      return 'SERVER_ERROR';
    }
    
    if (typeof error === 'string') {
      if (error.includes('reverted')) {
        return 'TRANSACTION_REVERTED';
      }
      if (error.includes('timeout')) {
        return 'TIMEOUT';
      }
    }
    
    return 'UNKNOWN_ERROR';
  }

  // Enhanced retry with exponential backoff
  private async retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    errorHandler?: (error: any, attempt: number, maxAttempts: number) => void,
    maxAttempts: number = this.MAX_ATTEMPTS,
    baseDelay: number = 3000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (errorHandler) {
          errorHandler(error, attempt, maxAttempts);
        }
        
        // Determine backoff based on error type
        const errorType = this.classifyError(error);
        let delayMultiplier;
        
        switch (errorType) {
          case 'API_RATE_LIMIT':
            delayMultiplier = Math.pow(2, attempt); // Exponential: 2^n
            break;
          case 'NETWORK_ERROR':
            delayMultiplier = 1.5 * attempt; // Linear but faster: 1.5*n
            break;
          case 'SERVER_ERROR':
            delayMultiplier = Math.pow(1.5, attempt); // Moderate exponential: 1.5^n
            break;
          default:
            delayMultiplier = attempt; // Linear: n
        }
        
        const delay = Math.min(baseDelay * delayMultiplier, 60000); // Cap at 1 minute
        
        console.log(`[BlockPI] Retrying after ${Math.round(delay/1000)}s due to ${errorType}`);
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    
    throw lastError; // Should never reach here but TypeScript needs it
  }

  // Add method to attempt to find next step after timeout
  public async attemptStepRecovery(
    outboundHash: string,
    currentStepIndex: number,
    transactionType: 'deposit' | 'withdrawal',
    transactionTypeData?: { isType2?: boolean; isType4?: boolean; totalSteps?: number }
  ): Promise<boolean> {
    // Get transaction type information
    const isType2 = transactionTypeData?.isType2 === true;
    const totalSteps = transactionTypeData?.totalSteps || (isType2 ? 3 : (transactionType === 'deposit' ? 5 : 6));
    
    // Determine which step is the "outbound step" based on transaction type
    // For Type 2: This is the first cross-chain step (step 1, index 1)
    // For Type 4 and others: This is the second cross-chain step (step 2, index 2)
    const outboundStepIndex = isType2 ? 1 : 2;
    
    // Only attempt recovery at the outbound step index (where outbound hash is relevant)
    const shouldAttemptRecovery = currentStepIndex === outboundStepIndex;
    
    // For flexibility, allow recovery if no transaction type data is provided
    const allowRecovery = transactionTypeData ? shouldAttemptRecovery : true;
    
    if (!allowRecovery) {
      console.log(`[BlockPI Recovery] Skipping recovery for step ${currentStepIndex} on ${isType2 ? 'Type 2' : 'other'} transaction type`);
      return false;
    }
    
    if (!outboundHash) {
      console.log('[BlockPI Recovery] No outbound hash available for recovery');
      return false;
    }
    
    try {
      console.log(`[BlockPI Recovery] Attempting to find next step using outbound hash: ${outboundHash}`);
      
      // First, try to get inbound hash to cctx using the outbound hash
      const inboundData = await this.getInboundHashToCctx(outboundHash);
      
      if (inboundData?.inboundHashToCctx?.cctx_index?.[0]) {
        const cctxIndex = inboundData.inboundHashToCctx.cctx_index[0];
        console.log(`[BlockPI Recovery] Found next step cctx_index: ${cctxIndex}`);
        
        // Verify this cctx is valid by fetching it
        const cctxData = await this.getCctx(cctxIndex);
        if (cctxData?.CrossChainTx) {
          console.log(`[BlockPI Recovery] Successfully found next step!`);
          return true;
        }
      }
      
      console.log('[BlockPI Recovery] Could not find valid next step');
      return false;
    } catch (error) {
      console.error('[BlockPI Recovery] Error during recovery attempt:', error);
      return false;
    }
  }

  // Add a method that provides real-time step updates using simple polling
  async trackTransactionSequenceWithProgress(
    localHash: string,
    transactionType: 'deposit' | 'withdrawal',
    onStepComplete: (stepIndex: number, stepData: any) => void,
    transactionTypeData?: { isType2?: boolean; isType4?: boolean; totalSteps?: number },
    activeChainId?: number,
    vaultProtocolChainId?: number
  ): Promise<{
    success: boolean;
    completedSteps: number;
    totalSteps: number;
    error?: string;
  }> {
    console.log('[BlockPI Progressive] Starting progressive tracking for:', {
      localHash,
      transactionType,
      transactionTypeData,
      activeChainId,
      vaultProtocolChainId
    });

    const sequence = TRANSACTION_SEQUENCES[transactionType];
    if (!sequence) {
      throw new Error(`Unknown transaction type: ${transactionType}`);
    }

    const isType2 = transactionTypeData?.isType2 === true;
    
    // CRITICAL FIX: Limit sequence steps based on transaction type
    const stepsToProcess = isType2 ? 3 : sequence.steps.length; // Type 2 only needs 3 steps
    const sequenceSteps = sequence.steps.slice(0, stepsToProcess);
    
    console.log(`[BlockPI Progressive] Using ${stepsToProcess} steps for ${isType2 ? 'Type 2' : 'Type 4/other'} transaction`);
    
    let prevStepData: any = null;
    let completedSteps = 0;

    // Step descriptions based on transaction type
    const getStepDescription = (stepIndex: number): string => {
      if (isType2) {
        const descriptions = transactionType === 'deposit' ? [
          'Initial deposit transaction on Zetachain',
          'Cross chain transfer and investment of funds',
          'Final confirmation completed, shares issued by vault'
        ] : [
          'Initial withdraw transaction on Zetachain',
          'Divestment of funds from strategy',
          'Withdrawal confirmation completed, funds returned'
        ];
        return descriptions[stepIndex] || `Step ${stepIndex + 1}`;
      } else {
        const descriptions = transactionType === 'deposit' ? [
          'Initial deposit transaction on local chain',
          'Cross chain transfer to vault',
          'Cross chain transfer and investment of funds',
          'Funds investment on strategy chain',
          'Final confirmation completed, shares issued by vault'
        ] : [
          'Initial withdraw transaction on local chain',
          'Cross chain request to vault',
          'Divestment of funds from strategy',
          'Withdrawal confirmation',
          'Return of funds',
          'Final withdraw to user'
        ];
        return descriptions[stepIndex] || `Step ${stepIndex + 1}`;
      }
    };

    try {
          console.log(`[BlockPI Progressive] About to process ${sequenceSteps.length} steps for ${isType2 ? 'Type 2' : 'Type 4/other'} transaction`);
    
    // Execute each step with retry logic and update UI immediately when each completes
    for (let stepIndex = 0; stepIndex < sequenceSteps.length; stepIndex++) {
      const stepConfig = sequenceSteps[stepIndex];
      console.log(`[BlockPI Progressive] Processing step ${stepIndex + 1}/${sequenceSteps.length}: ${stepConfig.name}`);
      console.log(`[BlockPI Progressive] Step ${stepIndex + 1} starting at timestamp: ${Date.now()}`);
      
      const stepHash = stepConfig.getHash(localHash, prevStepData, transactionTypeData);
      const description = getStepDescription(stepIndex);
      
      // Show this step as processing
      const processingStepData = {
        stepIndex,
        status: 'processing' as const,
        description: `${description} in progress`,
        txHash: stepHash
      };
      
      // Generate correct explorer link for processing step
      if (activeChainId && vaultProtocolChainId) {
        processingStepData.txHash = this.getStepExplorerLink(
          stepIndex,
          processingStepData,
          stepHash,
          transactionType,
          transactionTypeData,
          activeChainId,
          vaultProtocolChainId
        );
      }
      
      onStepComplete(stepIndex, processingStepData);
      
      // Retry logic for each step
      let attempt = 0;
      const maxAttempts = 120; // 120 attempts = ~20 minutes with 10s intervals
      let stepCompleted = false;
      let stepResult: any = null;

      while (attempt < maxAttempts && !stepCompleted) {
        attempt++;
        console.log(`[BlockPI Progressive] Step ${stepIndex + 1}, attempt ${attempt}/${maxAttempts}`);
        
        const result = await this.executeTransactionStep(
          stepIndex,
          stepConfig,
          localHash,
          prevStepData,
          Date.now(),
          transactionTypeData // Pass transaction type data for hash calculation
        );

        if (result.success) {
          // Step completed successfully
          stepResult = result;
          stepCompleted = true;
          console.log(`[BlockPI Progressive] Step ${stepIndex + 1} completed on attempt ${attempt}`);
        } else {
          // Check if this is a real failure or just a retryable state
          const isRetryableError = result.error?.includes('pending') || 
                                  result.error?.includes('PendingOutbound') ||
                                  result.error?.includes('Pending') ||
                                  result.error?.includes('Data not yet available') ||
                                  result.error?.includes('not yet available') ||
                                  result.error?.includes('404') ||
                                  result.error?.includes('Rate limited');
          
          if (isRetryableError) {
            // This is just a retryable state, not a real failure - keep retrying
            console.log(`[BlockPI Progressive] Step ${stepIndex + 1} retryable error (${result.error}), retrying in 10s...`);
            
            // Show "taking longer than expected" after 5 attempts
            if (attempt >= 5) {
              const waitingStepData = {
                stepIndex,
                status: 'processing' as const,
                description: `${description} is taking longer than expected`,
                txHash: stepHash,
                isWaitingTooLong: true
              };
              
              // Generate correct explorer link for waiting step
              if (activeChainId && vaultProtocolChainId) {
                waitingStepData.txHash = this.getStepExplorerLink(
                  stepIndex,
                  waitingStepData,
                  stepHash,
                  transactionType,
                  transactionTypeData,
                  activeChainId,
                  vaultProtocolChainId
                );
              }
              
              onStepComplete(stepIndex, waitingStepData);
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second intervals
                      } else {
              // This is a real failure (reverted, failed, etc.)
              const isRealFailure = result.error?.includes('reverted') || 
                                   result.error?.includes('Reverted') ||
                                   result.error?.includes('Failed') ||
                                   result.error?.includes('Aborted');
              
              if (isRealFailure) {
                console.error(`[BlockPI Progressive] Step ${stepIndex + 1} failed with transaction error: ${result.error}`);
                
                const stepData = {
                  stepIndex,
                  status: 'error' as const,
                  description: `${description} failed: ${result.error}`,
                  txHash: stepHash,
                  data: result.data
                };
                
                // Generate correct explorer link for error step
                if (activeChainId && vaultProtocolChainId) {
                  stepData.txHash = this.getStepExplorerLink(
                    stepIndex,
                    stepData,
                    stepHash,
                    transactionType,
                    transactionTypeData,
                    activeChainId,
                    vaultProtocolChainId
                  );
                }
                
                // Immediately update UI for this failed step
                onStepComplete(stepIndex, stepData);
                
                // Transaction failures should stop processing
                console.log(`[BlockPI Progressive] Transaction failed at step ${stepIndex + 1}, stopping`);
                return {
                  success: false,
                  completedSteps,
                  totalSteps: stepsToProcess,
                  error: result.error
                };
              } else {
                // Unknown error - treat as retryable for now but log it
                console.warn(`[BlockPI Progressive] Step ${stepIndex + 1} unknown error (treating as retryable): ${result.error}`);
                
                // Show "taking longer than expected" for unknown errors too
                if (attempt >= 5) {
                  const retryStepData = {
                    stepIndex,
                    status: 'processing' as const,
                    description: `${description} encountering issues, retrying...`,
                    txHash: stepHash,
                    isWaitingTooLong: true
                  };
                  
                  // Generate correct explorer link for retry step
                  if (activeChainId && vaultProtocolChainId) {
                    retryStepData.txHash = this.getStepExplorerLink(
                      stepIndex,
                      retryStepData,
                      stepHash,
                      transactionType,
                      transactionTypeData,
                      activeChainId,
                      vaultProtocolChainId
                    );
                  }
                  
                  onStepComplete(stepIndex, retryStepData);
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second intervals
              }
            }
        }
      }

              if (stepCompleted && stepResult) {
          // Step completed successfully - update UI
          const stepData = {
            stepIndex,
            status: 'completed' as const,
            description: `${description} completed`,
            txHash: stepHash,
            data: stepResult.data
          };
          
          // Generate correct explorer link for completed step
          if (activeChainId && vaultProtocolChainId) {
            stepData.txHash = this.getStepExplorerLink(
              stepIndex,
              stepData,
              stepHash,
              transactionType,
              transactionTypeData,
              activeChainId,
              vaultProtocolChainId
            );
          }
          
          onStepComplete(stepIndex, stepData);
          
          prevStepData = stepResult.data;
          completedSteps++;
          console.log(`[BlockPI Progressive] Step ${stepIndex + 1} completed and UI updated at timestamp: ${Date.now()}`);
          console.log(`[BlockPI Progressive] Completed ${completedSteps}/${stepsToProcess} steps so far`);
      } else if (!stepCompleted) {
        // Step timed out after max attempts
        console.error(`[BlockPI Progressive] Step ${stepIndex + 1} timed out after ${attempt} attempts (max: ${maxAttempts})`);
        
        const stepData = {
          stepIndex,
          status: 'error' as const,
          description: `${description} timed out after ${attempt} attempts`,
          txHash: stepHash
        };
        
        // Generate correct explorer link for timeout step
        if (activeChainId && vaultProtocolChainId) {
          stepData.txHash = this.getStepExplorerLink(
            stepIndex,
            stepData,
            stepHash,
            transactionType,
            transactionTypeData,
            activeChainId,
            vaultProtocolChainId
          );
        }
        
        onStepComplete(stepIndex, stepData);
        
        // CRITICAL FIX: Return failure for ANY step that times out, not just early steps
        console.log(`[BlockPI Progressive] Step ${stepIndex + 1} failed, stopping transaction`);
        return {
          success: false,
          completedSteps,
          totalSteps: stepsToProcess,
          error: `Step ${stepIndex + 1} timed out after ${attempt} attempts`
        };
      }
    }

      console.log(`[BlockPI Progressive] *** FOR LOOP COMPLETED ***`);
      console.log(`[BlockPI Progressive] All ${stepsToProcess} steps completed successfully (completedSteps: ${completedSteps})`);
      console.log(`[BlockPI Progressive] Final result: success=true, completedSteps=${completedSteps}, totalSteps=${stepsToProcess}`);
      return {
        success: true,
        completedSteps,
        totalSteps: stepsToProcess
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[BlockPI Progressive] Error during tracking:', errorMessage);
      
      return {
        success: false,
        completedSteps,
        totalSteps: stepsToProcess,
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

  // Add a method to get inbound hash from outbound hash
  async getInboundHashFromOutboundHash(outboundHash: string): Promise<any> {
    try {
      console.log(`[BlockPI] Looking for inbound hash using outbound hash: ${outboundHash}`);
      
      // First, attempt to get inbound hash directly
      const inboundData = await this.getInboundHashToCctx(outboundHash);
      
      if (inboundData?.inboundHashToCctx?.cctx_index?.[0]) {
        return {
          cctxIndex: inboundData.inboundHashToCctx.cctx_index[0],
          method: 'direct'
        };
      }
      
      // If direct lookup fails, could try alternative methods here
      // such as querying all recent transactions
      
      return null;
    } catch (error) {
      console.error(`[BlockPI] Error finding inbound hash for outbound hash ${outboundHash}:`, error);
      return null;
    }
  }

  // Add method to construct correct explorer links for each step
  private getStepExplorerLink(
    stepIndex: number, 
    stepData: any, 
    stepHash: string, 
    transactionType: 'deposit' | 'withdrawal',
    transactionTypeData: any,
    activeChainId: number,
    vaultProtocolChainId: number
  ): string {
    // Use the existing explorer URL configuration
    const explorerUrls = CHAINS_EXPLORER_BASE_URL_MAINNET;
    const ZETACHAIN_ID = deployEnv === "testnet" ? 7001 : 7000; // Use correct ZetaChain ID based on environment
    
    const isType2 = transactionTypeData?.isType2 === true;
    
    if (isType2) {
      // Type 2: 3 steps (User on ZetaChain → Vault on Non-ZetaChain)
      switch (stepIndex) {
        case 0: // Initial transaction on ZetaChain
          return `${explorerUrls[ZETACHAIN_ID]}/tx/${stepHash}`;
          
        case 1: // Cross-chain transfer to strategy chain
          // Use the outbound hash from the CCTX data, which is the actual transaction on strategy chain
          const strategyTxHash = stepData?.data?.CrossChainTx?.outbound_params?.[0]?.hash;
          if (strategyTxHash && explorerUrls[vaultProtocolChainId]) {
            return `${explorerUrls[vaultProtocolChainId]}/tx/${strategyTxHash}`;
          }
          // Fallback to ZetaChain explorer with the stepHash (CCTX index)
          return `${explorerUrls[ZETACHAIN_ID]}/tx/${stepHash}`;
          
        case 2: // Final confirmation - should be strategy chain, not ZetaChain
          // FIXED: Final confirmation happens on strategy chain
          const finalStrategyTxHash = stepData?.data?.CrossChainTx?.outbound_params?.[0]?.hash;
          if (finalStrategyTxHash && explorerUrls[vaultProtocolChainId]) {
            return `${explorerUrls[vaultProtocolChainId]}/tx/${finalStrategyTxHash}`;
          }
          // Fallback to strategy chain with stepHash or ZetaChain if no strategy explorer
          return explorerUrls[vaultProtocolChainId] 
            ? `${explorerUrls[vaultProtocolChainId]}/tx/${stepHash}`
            : `${explorerUrls[ZETACHAIN_ID]}/tx/${stepHash}`;
          
        default:
          return stepHash; // Fallback
      }
    } else {
      // Type 4: 5-6 steps (Cross-chain from Non-ZetaChain)
      switch (stepIndex) {
        case 0: // Initial transaction on user's chain
          return `${explorerUrls[activeChainId]}/tx/${stepHash}`;
          
        case 1: // Cross-chain to ZetaChain vault
          // This is a CCTX index, link to ZetaChain explorer
          return `${explorerUrls[ZETACHAIN_ID]}/tx/${stepHash}`;
          
        case 2: // Cross-chain from vault to strategy - FIXED: Use cc/tx format for CCTX
          // FIXED: Use ZetaChain's cross-chain transaction explorer format with proper configuration
          const zetaExplorerBaseUrl = deployEnv === "testnet" 
            ? ZETACHAIN_CROSSCHAIN_EXPLORER_URLS.testnet 
            : ZETACHAIN_CROSSCHAIN_EXPLORER_URLS.mainnet;
          return `${zetaExplorerBaseUrl}/cc/tx/${stepHash}`;
          
        case 3: // Strategy chain transaction (extracted hash)
          // This is the actual strategy chain transaction hash
          if (explorerUrls[vaultProtocolChainId]) {
            return `${explorerUrls[vaultProtocolChainId]}/tx/${stepHash}`;
          }
          return stepHash; // Fallback
          
        case 4: // Return from strategy to vault (ZetaChain)
          return `${explorerUrls[ZETACHAIN_ID]}/tx/${stepHash}`;
          
        case 5: // Final withdraw to user (withdrawal only) - FIXED: Should be strategy chain
          if (transactionType === 'withdrawal') {
            // FIXED: Return of funds happens on strategy chain, not ZetaChain
            const finalTxHash = stepData?.data?.CrossChainTx?.outbound_params?.[0]?.hash;
            if (finalTxHash && explorerUrls[vaultProtocolChainId]) {
              return `${explorerUrls[vaultProtocolChainId]}/tx/${finalTxHash}`;
            }
            // Use stepHash on strategy chain as fallback
            if (explorerUrls[vaultProtocolChainId]) {
              return `${explorerUrls[vaultProtocolChainId]}/tx/${stepHash}`;
            }
            // Last resort fallback to ZetaChain
            return `${explorerUrls[ZETACHAIN_ID]}/tx/${stepHash}`;
          }
          return stepHash; // Fallback
          
        default:
          return stepHash; // Fallback
      }
    }
  }
}