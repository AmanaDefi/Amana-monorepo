import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Action,
  Balance,
  Token,
  TransactionStepFeedback,
  TransactionStepMessages,
  TransactionStepStatus,
  VaultData,
} from "@/types/types";
import mixpanel from "mixpanel-browser";
import {
  Approvedeposit,
  executeDeposit,
  executeWithdrawal,
  waitForReceiptSol,
} from "@/actions/actions";
import { Address, Chain, signTransaction, waitForReceipt } from "thirdweb";
import { Account } from "thirdweb/wallets";
import MainActionButton from "@/components/button/MainActionButton";
import { client } from "@/utils/client";
import { MoonLoader } from "react-spinners";
import { AiOutlineCheck, AiOutlineExclamation } from "react-icons/ai";
import { isZetachain } from "@/utils/utils";
import { useInteractionEvents, useTokenPriceBySymbol } from "@/hooks/hooks";
import { determineVaultTokenFromApprovedTokens } from "@/utils/utils";
import {
  APPROVED_TOKENS,
  CHAIN_ID,
  CHAINS_EXPLORER_BASE_URL_MAINNET,
  deployEnv,
} from "@/constants/chainConfig";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useActiveAccount } from "thirdweb/react";
import {
  useWallet,
  Wallet,
  WalletContextState,
} from "@solana/wallet-adapter-react";
import { SolanaZetaClient } from "@/lib/solanaGateway/cli/scripts";
import { Wallet as AnchorWallet } from "@coral-xyz/anchor";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useInboundToCctxData } from "@/hooks/useInboundToCctxData";
import { decimals } from "thirdweb/extensions/erc20";
import { trackEvent } from "@/utils/trackEvent";
import { getAssetsFromShares } from "@/actions/actions";
import { amount } from "codemelt-retro-api-sdk/functional/api/venft/upgrade";
import Blockpi, { TransactionProgress, TransactionStep, TRANSACTION_SEQUENCES } from "@/service/blockpi";

const handleDepositTransaction = async (
  vaultData: VaultData,
  inputBalance: Balance,
  inputToken: Token,
  walletContext: WalletContextState,
  activeAccount: Account,
  setTransactionCompleted: (value: boolean) => void,
  activeChain: any,
  setCrosschainInvestHash: Function,
  setcrossChainTxId: Function,
  setInputBalance: Function,
  setLastEventTxHash: Function
) => {
  setTransactionCompleted(false);

  try {
    const depositAmount = inputBalance.value;
    // Debug log for USD amount of deposit
    console.log("[Deposit Debug] vault=", vaultData.id.toString(), 
      "tokenAmount=", depositAmount.toString(), 
      "usdAmount=", inputBalance.formattedUSD || (Number(inputBalance.formatted) * (inputToken.price || 0)).toFixed(2)
    );
    const receipt = await executeDeposit(
      vaultData,
      inputToken,
      walletContext,
      activeAccount,
      activeChain,
      depositAmount,
      setcrossChainTxId
    );

    trackEvent("Deposit Initiated", {
      vaultSymbol: vaultData.symbol,
      vault: vaultData.id.toString(),
      amount: depositAmount.toString(),
      inputToken: inputToken.symbol,
      amountUSD: inputBalance.formattedUSD || (Number(inputBalance.formatted) * (inputToken.price || 0)).toFixed(2),
      user: activeAccount.address,
      chain: activeChain.id,
    });

    if (activeChain.id === CHAIN_ID.solana) {
    } else {
      // Create an object to pass to waitForReceipt with the required fields
      const receiptObject = {
        transactionHash: receipt.transactionHash as `0x${string}`,
        client, // Assuming `client` is already defined somewhere in this scope
        chain: activeChain,
      };
      await waitForReceipt(receiptObject);
    }

    const activeChainExplorerBaseUrl =
      CHAINS_EXPLORER_BASE_URL_MAINNET[activeChain.id] ?? "";
    setLastEventTxHash(
      `${activeChainExplorerBaseUrl}/tx/${receipt.transactionHash}`
    );
    setCrosschainInvestHash(receipt.transactionHash);

    return true;
  } catch (error: any) {
    if (!error.message.includes("User denied transaction")) {
      trackEvent("Deposit Failed", {
        vaultSymbol: vaultData.symbol,
        vault: vaultData.id.toString(),
        amount: inputBalance.value.toString(),
        amountUSD: inputBalance.formattedUSD || (Number(inputBalance.formatted) * (inputToken.price || 0)).toFixed(2),
      });
    }
  }
};

const handleWithdrawTransaction = async (
  vaultData: VaultData,
  inputBalance: Balance,
  withdrawToken: Token,
  walletContext: WalletContextState,
  activeAccount: Account,
  setTransactionCompleted: (value: boolean) => void,
  activeChain: any,
  setCrosschainInvestHash: Function,
  setcrossChainTxId: Function,
  setInputBalance: Function,
  setLastEventTxHash: Function
) => {
  setTransactionCompleted(false);
  let withdrawZRC20;
  if (activeChain.id === 7001 || activeChain.id === 7000) {
    withdrawZRC20 = vaultData.inputToken;
  } else {
    withdrawZRC20 = withdrawToken.ZRC20equivalent;
  }
  if (!withdrawToken || !withdrawZRC20) {
    throw new Error("Withdraw token not found");
  }
  try {
    const withdrawShareAmount = inputBalance.value;
    const assetsOut = await getAssetsFromShares(withdrawShareAmount, vaultData);
    const withdrawAmountFormatted = Number(assetsOut) / 10 ** withdrawToken.decimals;
    const amountUSD = (withdrawAmountFormatted * (withdrawToken.price || 0)).toFixed(2);

    trackEvent("Withdraw Submitted", {
      vaultSymbol: vaultData.symbol,
      vault: vaultData.id.toString(),
      amount: withdrawShareAmount.toString(),
      amountUSD: amountUSD,
      withdrawToken: withdrawToken.symbol,
      user: activeAccount.address,
      chain: activeChain.id,
    });
    const receipt = await executeWithdrawal(
      vaultData.id as Address,
      vaultData.protocol.strategyAddress as Address,
      vaultData.protocol.chainId as number,
      walletContext,
      activeAccount,
      activeChain,
      withdrawShareAmount,
      withdrawToken.address as Address,
      withdrawZRC20 as Token,
      setcrossChainTxId
    );

    if (activeChain.id === CHAIN_ID.solana) {
      // await waitForReceiptSol(receipt.transactionHash)
    } else {
      // Create an object to pass to waitForReceipt with the required fields
      const receiptObject = {
        transactionHash: receipt.transactionHash as `0x${string}`,
        client, // Assuming `client` is already defined somewhere in this scope
        chain: activeChain,
      };
      await waitForReceipt(receiptObject);
    }
    const activeChainExplorerBaseUrl =
      CHAINS_EXPLORER_BASE_URL_MAINNET[activeChain.id] ?? "";
    setLastEventTxHash(
      `${activeChainExplorerBaseUrl}/tx/${receipt.transactionHash}`
    );
    setCrosschainInvestHash(receipt.transactionHash);
    return true;
  } catch (error) {
    trackEvent("Withdraw Failed", {
      vault: vaultData.id.toString(),
      vaultSymbol: vaultData.symbol,
    });
  }
};

export default function InteractionContainer({
  step,
  setStep,
  action,
  setAction,
  _inputToken,
  _inputBalance,
  _action,
  vaultData,
  setTransactionCompleted,
  activeChain,
  actions,
  setInputBalance,
  errorMessage,
  isDeposit,
  refreshBalance,
}: {
  step: number;
  setStep: Function;
  action: Action;
  setAction: Function;
  _inputToken: Token;
  _inputBalance: Balance;
  _action: Action;
  vaultData: VaultData;
  setTransactionCompleted: (value: boolean) => void;
  activeChain: Chain;
  actions: Action[];
  setInputBalance: Function;
  errorMessage: string;
  isDeposit: boolean;
  refreshBalance: Function;
}): JSX.Element {
  const [label, setLabel] = useState("");
  const [disabled, setDisabled] = useState(true);

  const processedTxHashesRef = useRef({
    vault: new Set(),
    strategy: new Set(),
    withdrawal: new Set(),
  });

  useEffect(() => {
    setAction(_action);
    setStep(0);
  }, [actions]);

  const [strategyAddress] = useState(vaultData.protocol.strategyAddress);
  const [strategyChainID] = useState(vaultData.protocol.chainId);

  const [crosschainInvestHash, setCrosschainInvestHash] = useState("");
  const [crossChainTxId, setcrossChainTxId] = useState<string>("");

  const isTestnet = process.env.NEXT_PUBLIC_DEPLOY_ENV === "testnet";
  const contractWithdrawalReceiverAddress = (
    isTestnet
      ? process.env.NEXT_PUBLIC_WITHDRAWAL_RECEIVER_ADDRESS_TESTNET
      : process.env.NEXT_PUBLIC_WITHDRAWAL_RECEIVER_ADDRESS
  ) as `0x${string}`;

  const [transactionStepFeedback, setTransactionStepFeedback] =
    useState<TransactionStepMessages>({});
  const [lastTransactionStepFeedback, setLastTransactionStepFeedback] =
    useState<TransactionStepMessages>({});
  const [isTransactionStarted, setIsTransactionStarted] = useState(false);
  const [isTransactionProcessing, setIsTransactionProcessing] = useState(false);
  const [finishedTransaction, setFinishedTransaction] = useState(false);
  const [lastEventTxHash, setLastEventTxHash] = useState("");

  // Event listeners remain active for potential debugging/monitoring
  // but event processing logic is disabled in favor of BlockPI API method
  const { vaultEvents, strategyEvents, withdrawalReceiverEvents } =
    useInteractionEvents({
      vaultData,
      activeChainId: activeChain?.id,
      strategyChainID,
      strategyAddress,
      contractWithdrawalReceiverAddress,
      isTransactionStarted,
    });

  const [transactionProgress, setTransactionProgress] = useState<TransactionProgress | null>(null);
  const blockpi = useMemo(() => new Blockpi(), []);
  
  // Flag to prioritize BlockPI feedback over traditional action-based feedback
  const [isBlockPIActive, setIsBlockPIActive] = useState(false);

  // Comprehensive transaction tracking with sequence management
  const [transactionSequenceProgress, setTransactionSequenceProgress] = useState<{
    steps: Array<{
      name: string;
      status: 'pending' | 'processing' | 'completed' | 'error';
      hash?: string;
      data?: any;
      url?: string;
    }>;
    currentStep: number;
    isComplete: boolean;
    error?: string;
  } | null>(null);

  // Enhanced BlockPI integration that persists across tab switches
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;
    let cancelled = false;
    
    const trackTransactionSequence = async () => {
      if (!crosschainInvestHash || !action) return;
      
      // Only start BlockPI tracking for confirmed transactions, not initial transactions
      if (action === Action.depositConfirmed || action === Action.withdrawconfirmed) {
        // These are the starting points for BlockPI tracking
        console.log('[BlockPI] Starting tracking for confirmed transaction action:', action);
      } else {
        console.log('[BlockPI] Skipping tracking for action:', action);
        return;
      }
      
      // Determine transaction type based on action
      let transactionType: 'deposit' | 'withdrawal' | null = null;
      if (action === Action.depositConfirmed) {
        transactionType = 'deposit';
      } else if (action === Action.withdrawconfirmed) {
        transactionType = 'withdrawal';
      }
      
      if (!transactionType) return;
      
      // Don't clear existing transaction feedback - preserve loading states from local transactions
      console.log('[BlockPI] Starting comprehensive transaction sequence tracking for:', crosschainInvestHash);
      
      // Save transaction state to localStorage with more details
      const txState = {
        hash: crosschainInvestHash,
        txId: crossChainTxId,
        timestamp: Date.now(),
        type: transactionType,
        action: action,
        step: step
      };
      
      localStorage.setItem(`pending${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}Transaction`, JSON.stringify(txState));
      
      try {
        console.log(`[BlockPI] Starting ${transactionType} tracking for ${crosschainInvestHash}`);
        setIsBlockPIActive(true); // Enable BlockPI priority mode
        
        const progress = await blockpi.trackTransactionSequence(
          crosschainInvestHash,
          transactionType,
          (stepIndex: number, status: 'pending' | 'processing' | 'completed' | 'error', data?: any) => {
            if (cancelled) return;
            
            console.log(`[BlockPI] Step update: ${stepIndex}, status: ${status}`);
            
            // Update UI feedback based on step progress - but don't override local transaction feedback
            updateTransactionStepFeedbackFromSequence(stepIndex, status, data, transactionType);
          }
        );
        
        // Handle completion
        if (progress.isComplete) {
          console.log(`[BlockPI] ${transactionType} sequence completed successfully`);
          
          // FIXED: Mark final step as completed in UI before state transitions
          const finalStepIndex = transactionType === 'deposit' ? 4 : 5;
          updateTransactionStepFeedbackFromSequence(finalStepIndex, 'completed', {}, transactionType);
          
          setIsBlockPIActive(false); // Disable BlockPI priority mode
          localStorage.removeItem(`pending${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}Transaction`);
          localStorage.removeItem('amana_current_transaction_feedback');
          localStorage.removeItem('amana_transaction_progress');
          localStorage.removeItem('amana_sequence_progress');
          
          setTransactionSequenceProgress(prev => prev ? {
            ...prev,
            isComplete: true
          } : null);
          
          // Move to final step based on transaction type and trigger completion
          setTimeout(() => {
            if (transactionType === 'deposit') {
              const nextStep = actions.findIndex(el => el === Action.deposited);
              if (nextStep >= 0) {
                setAction(actions[nextStep]);
                setStep(nextStep);
              }
            } else if (transactionType === 'withdrawal') {
              const nextStep = actions.findIndex(el => el === Action.withdrew);
              if (nextStep >= 0) {
                setAction(actions[nextStep]);
                setStep(nextStep);
              }
            }
          }, 500); // Small delay to ensure UI updates properly
        } else if (progress.error) {
          console.error(`[BlockPI] ${transactionType} sequence failed:`, progress.error);
          setIsBlockPIActive(false); // Disable BlockPI priority mode on error
          
          // Store error state
          localStorage.setItem('amana_transaction_error', JSON.stringify({
            error: progress.error,
            timestamp: Date.now()
          }));
          
          setTransactionSequenceProgress(prev => prev ? {
            ...prev,
            error: progress.error
          } : null);
          
          // Handle different error scenarios
          if (progress.error.includes('reverted')) {
            if (transactionType === 'deposit') {
              const nextStep = actions.findIndex(el => el === Action.CrossChainInvestFailed);
              if (nextStep >= 0) {
                setAction(actions[nextStep]);
                setStep(nextStep);
              }
            } else if (transactionType === 'withdrawal') {
              const nextStep = actions.findIndex(el => el === Action.DivestFailed);
              if (nextStep >= 0) {
                setAction(actions[nextStep]);
                setStep(nextStep);
              }
            }
          }
        }
        
      } catch (error) {
        console.error(`[BlockPI] Error in ${transactionType} sequence tracking:`, error);
        setIsBlockPIActive(false); // Disable BlockPI priority mode on exception
        
        // Store error in localStorage
        localStorage.setItem('amana_transaction_error', JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }));
        
        // Fallback to RPC-based monitoring
        console.log(`[BlockPI] Falling back to RPC-based monitoring for ${transactionType}`);
      }
    };

    if (crosschainInvestHash && (action === Action.depositConfirmed || action === Action.withdrawconfirmed)) {
      trackTransactionSequence();
    }

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [crosschainInvestHash, action, blockpi]); // Removed problematic dependencies

  // Restore transaction state when component mounts (after tab switch or page refresh)
  useEffect(() => {
    // Restore feedback from localStorage if available
    const savedFeedback = localStorage.getItem('amana_current_transaction_feedback');
    if (savedFeedback) {
      try {
        const feedback = JSON.parse(savedFeedback);
        if (Object.keys(feedback).length > 0) {
          console.log('[Tab Restore] Restoring transaction feedback from localStorage');
          setTransactionStepFeedback(feedback);
        }
      } catch (error) {
        console.error('Error restoring transaction feedback:', error);
      }
    }
    
    // Restore sequence progress
    const savedProgress = localStorage.getItem('amana_sequence_progress');
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        console.log('[Tab Restore] Restoring sequence progress from localStorage');
        setTransactionSequenceProgress(progress);
      } catch (error) {
        console.error('Error restoring sequence progress:', error);
      }
    }
    
    // Check for transaction errors
    const savedError = localStorage.getItem('amana_transaction_error');
    if (savedError) {
      try {
        const { error, timestamp } = JSON.parse(savedError);
        // Only show recent errors (within 5 minutes)
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          console.warn('[Tab Restore] Transaction error detected:', error);
        } else {
          localStorage.removeItem('amana_transaction_error');
        }
      } catch (error) {
        console.error('Error checking transaction error:', error);
      }
    }
  }, []); // Only run on mount

  // Helper function to update UI feedback based on sequence progress
  function updateTransactionStepFeedbackFromSequence(
    stepIndex: number,
    status: 'pending' | 'processing' | 'completed' | 'error',
    data?: any,
    transactionType?: 'deposit' | 'withdrawal'
  ) {
    const isDeposit = transactionType === 'deposit';
    
    console.log(`[UI Feedback] Step ${stepIndex}, Status: ${status}, Type: ${transactionType}`);
    
    // Map BlockPI steps to Action enum based on transaction flow
    const actionMapping = isDeposit ? [
      Action.deposit,           // Step 0: Local transaction
      Action.depositConfirmed,  // Step 1: Cross chain to vault
      Action.crosschainInvest,  // Step 2: Vault to strategy
      Action.FundsInvest,       // Step 3: Strategy execution
      Action.deposited          // Step 4: Return to vault (completion)
    ] : [
      Action.withdraw,              // Step 0: Local transaction  
      Action.withdrawconfirmed,     // Step 1: Cross chain to vault
      Action.DivestSent,           // Step 2: Vault to strategy
      Action.FundsDivested,        // Step 3: Strategy execution
      Action.ReturnFundsToUserSent, // Step 4: Return to vault
      Action.withdrew              // Step 5: Final withdraw (completion)
    ];
    
    // Helper function to get step description
    function getStepDescription(stepIndex: number, status: string, isDeposit: boolean): string {
      const stepDescriptions = isDeposit ? [
        'Initial deposit transaction',
        'Cross chain transfer to vault',
        'Cross chain transfer to strategy',
        'Funds investment on strategy chain',
        'Investment confirmation and shares issued'
      ] : [
        'Initial withdraw transaction',
        'Cross chain request to vault',
        'Cross chain request to strategy',
        'Funds divestment on strategy chain',
        'Return of funds to vault',
        'Final withdraw to user'
      ];
      
      const statusText = status === 'completed' ? 'completed' : 
                        status === 'error' ? 'failed' : 'in progress';
      
      return `${stepDescriptions[stepIndex] || `Step ${stepIndex + 1}`} ${statusText}`;
    }
    
    // Helper function to get transaction hash for step
    function getStepTxHash(stepIndex: number, data?: any): string | undefined {
      if (!data) return undefined;
      
      if (stepIndex === 0) {
        // Local transaction hash
        return data.localHash || data.hash;
      } else if (data.cctxIndex) {
        // BlockPI cctx URL
        return `${process.env.NEXT_PUBLIC_BLOCKPI_URL}/cctx/${data.cctxIndex}`;
      } else if (data.hash) {
        // Direct hash
        return data.hash;
      }
      
      return undefined;
    }
    
    // Only update the specific step that changed, don't rebuild all feedback
    const actionKey = actionMapping[stepIndex];
    if (!actionKey) {
      console.warn(`[UI Feedback] No action mapping for step ${stepIndex}`);
      return;
    }
    
    // FIXED: Force BlockPI feedback to take priority and update all steps correctly
    setTransactionStepFeedback(prev => {
      const existingFeedback = prev[actionKey];
      
      console.log(`[UI Feedback] Current feedback for ${actionKey}:`, existingFeedback);
      console.log(`[UI Feedback] Attempting to update to status: ${status}`);
      
      // FIXED: Stronger protection against downgrading completed steps
      if (existingFeedback && existingFeedback.status === TransactionStepStatus.completed) {
        if (status === 'processing' || status === 'pending') {
          console.log(`[UI Feedback] BLOCKED: Preventing downgrade from completed to ${status} for step ${stepIndex} (${actionKey})`);
          return prev;
        }
        // Only allow completed->error transitions, skip completed->completed updates unless they have better data
        if (status !== 'completed' && status !== 'error') {
          console.log(`[UI Feedback] BLOCKED: Invalid status transition from completed to ${status}`);
          return prev;
        }
      }
      
      let stepStatus: TransactionStepStatus;
      let description: string;
      let txHash: string | undefined;
      
      // Determine status for this specific step
      if (status === 'completed') {
        stepStatus = TransactionStepStatus.completed;
        description = getStepDescription(stepIndex, 'completed', isDeposit);
        txHash = getStepTxHash(stepIndex, data);
      } else if (status === 'error') {
        stepStatus = TransactionStepStatus.error;
        description = getStepDescription(stepIndex, 'error', isDeposit);
        txHash = getStepTxHash(stepIndex, data);
      } else if (status === 'processing') {
        stepStatus = TransactionStepStatus.processing;
        description = getStepDescription(stepIndex, 'processing', isDeposit);
        txHash = getStepTxHash(stepIndex, data);
      } else {
        // Don't show pending steps in UI - only show when they become processing
        return prev;
      }
      
      const timestamp = new Date().toISOString();
      console.log(`[UI Feedback] ${timestamp} - Updating step ${stepIndex} (${actionKey}) with status ${stepStatus}`);
      
      // FIXED: Build feedback progressively - mark all previous steps as completed when current step starts
      const updatedFeedback = { ...prev };
      
      // Mark all previous steps as completed if current step is processing/completed
      if (status === 'processing' || status === 'completed') {
        for (let i = 0; i < stepIndex; i++) {
          const prevActionKey = actionMapping[i];
          if (prevActionKey && (!updatedFeedback[prevActionKey] || updatedFeedback[prevActionKey].status !== TransactionStepStatus.completed)) {
            updatedFeedback[prevActionKey] = {
              label: isDeposit ? "Deposit" : "Withdraw",
              description: getStepDescription(i, 'completed', isDeposit),
              status: TransactionStepStatus.completed,
              txHash: updatedFeedback[prevActionKey]?.txHash
            };
            console.log(`[UI Feedback] ${timestamp} - Auto-completing previous step ${i} (${prevActionKey})`);
          }
        }
      }
      
      // Update current step
      updatedFeedback[actionKey] = {
        label: isDeposit ? "Deposit" : "Withdraw",
        description,
        status: stepStatus,
        txHash
      };
      
      // FIXED: Persist transaction feedback to localStorage for tab switch resilience
      localStorage.setItem('amana_current_transaction_feedback', JSON.stringify(updatedFeedback));
      
      console.log(`[UI Feedback] ${timestamp} - Updated feedback:`, updatedFeedback[actionKey]);
      
      return updatedFeedback;
    });
  }

  // Update transaction step feedback based on progress
  useEffect(() => {
    if (!transactionProgress) return;

    const feedback: TransactionStepMessages = {};
    
    transactionProgress.steps.forEach((step: TransactionStep) => {
      let actionKey: Action;
      let description: string;
      
      if (step.type === 'inboundToCctx') {
        actionKey = Action.depositConfirmed;
        description = "Cross chain transfer to vault in progress";
      } else if (step.type === 'cctx') {
        actionKey = Action.crosschainInvest;
        description = "Cross chain transfer and investment of funds in progress";
      } else {
        return;
      }

      feedback[actionKey] = {
        label: "Deposit",
        description,
        status: step.status === "OutboundMined" || step.status === "Success" 
          ? TransactionStepStatus.completed 
          : step.status === "Reverted" || step.status === "Failed"
          ? TransactionStepStatus.error
          : TransactionStepStatus.processing,
        txHash: step.hash
      };
    });

    setTransactionStepFeedback(feedback);
  }, [transactionProgress]);

  function completeTransactionProcess(
    feedbackSnapshot: TransactionStepMessages
  ) {
    setIsTransactionStarted(false);
    if (finishedTransaction) return;
    setIsTransactionProcessing(false);
    setLastTransactionStepFeedback(feedbackSnapshot);
    setFinishedTransaction(true);
    
    // FIXED: Freeze current feedback to prevent further updates
    console.log('[Transaction Complete] Freezing feedback state:', feedbackSnapshot);
    
    // Clear current feedback but preserve the snapshot for display
    setTransactionStepFeedback({});

    setTransactionCompleted(true);
    setInputBalance({
      value: 0,
      formatted: "0",
      formattedUSD: "0",
    });
    
    // FIXED: Additional protection - disable BlockPI updates after completion
    setIsBlockPIActive(false);
    
    // FIXED: Clear any lingering transaction state that might trigger updates
    setTimeout(() => {
      localStorage.removeItem('amana_current_transaction_feedback');
      localStorage.removeItem('amana_transaction_progress');
      localStorage.removeItem('amana_sequence_progress');
    }, 1000);
  }

  const strategyExplorerBaseUrl = useMemo(() => {
    if (!vaultData?.protocol?.chainId) return "";
    return CHAINS_EXPLORER_BASE_URL_MAINNET[vaultData.protocol.chainId] ?? "";
  }, [vaultData?.protocol?.chainId]);

  const vaultExplorerBaseUrl = CHAINS_EXPLORER_BASE_URL_MAINNET[7000];
  const activeChainExplorerBaseUrl = useMemo(() => {
    if (!activeChain?.id) return "";
    return CHAINS_EXPLORER_BASE_URL_MAINNET[activeChain.id] ?? "";
  }, [activeChain?.id]);

  // ================================================================================================
  // COMMENTED OUT: Event-based transaction confirmation logic
  // The BlockPI API method above provides more reliable cross-chain transaction tracking
  // ================================================================================================

  /*
  useEffect(() => {
    console.log("event1: ", vaultEvents);
    console.log("crosschainInvestHash: ", crosschainInvestHash);
    console.log("crossChainTxId: ", crossChainTxId);
    if (
      transactionProgress?.steps.some(step => 
        step.status === "Reverted" || step.status === "Failed"
      )
    ) {
      console.log({ action, actions });
      if (action == Action.depositConfirmed) {
        const nextStep = actions.findIndex(
          (el) => el == Action.CrossChainDepositFailed
        );
        setAction(actions[nextStep]);
        setStep(nextStep);
        return;
      }
    }
    if (vaultEvents && vaultEvents.length > 0 && crosschainInvestHash != "") {
      const newEvents = vaultEvents.filter((event) => {
        const eventKey = `${event.transactionHash}-${event.logIndex}`;
        if (processedTxHashesRef.current.vault.has(eventKey)) {
          return false;
        }
        processedTxHashesRef.current.vault.add(eventKey);
        return true;
      });

      console.log("New vault events: ", newEvents);

      for (let i = 0; i < newEvents.length; i++) {
        const last_event = newEvents[i];
        if (
          last_event.eventName == "CrossChainInvestSent" &&
          action ==
            (isZetachain(activeChain.id)
              ? Action.deposit
              : Action.depositConfirmed)
        ) {
          console.log("EVENT CrossChainInvestSent: ", last_event, action, step);
          if (
            (last_event.args.crossChainTxId.toString() == crossChainTxId &&
              !isZetachain(activeChain.id)) ||
            (last_event.transactionHash == crosschainInvestHash &&
              isZetachain(activeChain.id))
          ) {
            console.log(
              "PASSED EVENT CrossChainInvestSent: ",
              last_event,
              action,
              step
            );
            setcrossChainTxId(last_event.args.crossChainTxId.toString());
            setLastEventTxHash(
              `${vaultExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = actions.findIndex(
              (el) => el == Action.crosschainInvest
            );
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;
          }
        } else if (
          last_event.eventName == "Deposit" &&
          isZetachain(strategyChainID) &&
          isZetachain(activeChain.id) &&
          action === Action.deposit
        ) {
          console.log("EVENT Deposit: ", last_event, action, step);
          if (last_event.transactionHash == crosschainInvestHash) {
            console.log("PASSED EVENT Deposit: ", last_event, action, step);
            setLastEventTxHash(
              `${vaultExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = actions.findIndex((el) => el == Action.deposited);
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;
          }
        } else if (
          last_event.eventName == "Withdraw" &&
          action === Action.withdraw &&
          isZetachain(strategyChainID)
        ) {
          console.log("EVENT Withdraw: ", last_event, action, step);
          if (last_event.transactionHash == crosschainInvestHash) {
            console.log("PASSED EVENT Withdraw: ", last_event, action, step);
            setLastEventTxHash(
              `${vaultExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = step + 1;
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;
          }
        } else if (
          last_event.eventName == "Deposited" &&
          action ==
            (!isZetachain(strategyChainID)
              ? Action.FundsInvest
              : isZetachain(activeChain.id)
              ? Action.deposit
              : Action.depositConfirmed)
        ) {
          console.log("EVENT Deposited: ", last_event, action, step);
          if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
            console.log("PASSED EVENT Deposited: ", last_event, action, step);
            setLastEventTxHash(
              `${vaultExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = actions.findIndex((el) => el == Action.deposited);
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;
          }
        } else if (
          last_event.eventName == "DivestSent" &&
          action ==
            (isZetachain(activeChain.id)
              ? Action.withdraw
              : Action.withdrawconfirmed)
        ) {
          console.log("EVENT DivestSent: ", last_event, action, step);
          if (
            (last_event.args.crossChainTxId.toString() == crossChainTxId &&
              !isZetachain(activeChain.id)) ||
            (last_event.transactionHash == crosschainInvestHash &&
              isZetachain(activeChain.id))
          ) {
            console.log("PASSED EVENT DivestSent: ", last_event, action, step);
            setcrossChainTxId(last_event.args.crossChainTxId.toString());
            setLastEventTxHash(
              `${vaultExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = actions.findIndex((el) => el == Action.DivestSent);
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;
          }
        } else if (
          last_event.eventName == "ReturnFundsToUserSent" &&
          action ==
            (!isZetachain(strategyChainID)
              ? Action.FundsDivested
              : isZetachain(activeChain.id)
              ? Action.withdraw
              : Action.withdrawconfirmed)
        ) {
          console.log(
            "EVENT ReturnFundsToUserSent: ",
            last_event,
            action,
            step
          );
          if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
            console.log(
              "PASSED EVENT ReturnFundsToUserSent: ",
              last_event,
              action,
              step
            );
            setLastEventTxHash(
              `${vaultExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = actions.findIndex(
              (el) =>
                el ==
                (isZetachain(activeChain.id)
                  ? Action.withdrew
                  : Action.ReturnFundsToUserSent)
            );
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;
          }
        } else if (
          last_event.eventName == "CrossChainInvestFailed" &&
          action == Action.crosschainInvest
        ) {
          console.log(
            "EVENT CrossChainInvestFailed: ",
            last_event,
            action,
            step
          );
          if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
            console.log(
              "PASSED EVENT CrossChainInvestFailed: ",
              last_event,
              action,
              step
            );
            setLastEventTxHash(
              `${vaultExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = actions.findIndex(
              (el) => el == Action.CrossChainInvestFailed
            );
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;
          }
        } else if (
          last_event.eventName == "DivestFailed" &&
          action == Action.DivestSent
        ) {
          console.log("EVENT DivestFailed: ", last_event, action, step);
          if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
            console.log(
              "PASSED EVENT DivestFailed: ",
              last_event,
              action,
              step
            );
            setLastEventTxHash(
              `${vaultExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = actions.findIndex(
              (el) => el == Action.DivestFailed
            );
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;
          }
        } else if (
          last_event.eventName == "ReturnFundsToUserFailed" &&
          action == Action.ReturnFundsToUserSent
        ) {
          console.log(
            "EVENT ReturnFundsToUserFailed: ",
            last_event,
            action,
            step
          );
          if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
            console.log(
              "PASSED EVENT ReturnFundsToUserFailed: ",
              last_event,
              action,
              step
            );
            setLastEventTxHash(
              `${vaultExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = actions.findIndex(
              (el) => el == Action.ReturnFundsToUserFailed
            );
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;
          }
        }
      }
    }
  }, [vaultEvents, crosschainInvestHash, transactionProgress]);

  useEffect(() => {
    if (
      strategyEvents &&
      strategyEvents.length > 0 &&
      crosschainInvestHash != ""
    ) {
      console.log("event21: ", strategyEvents);
      const newEvents = strategyEvents.filter((event) => {
        const eventKey = `${event.transactionHash}-${event.logIndex}`;
        if (processedTxHashesRef.current.strategy.has(eventKey)) {
          return false;
        }
        processedTxHashesRef.current.strategy.add(eventKey);
        return true;
      });
      console.log("New strategy events: ", newEvents);
      for (let i = 0; i < newEvents.length; i++) {
        const last_event = newEvents[i];
        if (
          last_event.eventName == "FundsInvested" &&
          action == Action.crosschainInvest
        ) {
          console.log("EVENT FundsInvested: ", last_event, action, step);
          if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
            console.log(
              "PASSED EVENT FundsInvested: ",
              last_event,
              action,
              step
            );
            setLastEventTxHash(
              `${strategyExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = actions.findIndex(
              (el) => el == Action.FundsInvest
            );
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;
          }
        } else if (
          last_event.eventName == "FundsDivested" &&
          action == Action.DivestSent
        ) {
          console.log("EVENT FundsDivested: ", last_event, action, step);
          if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
            console.log(
              "PASSED EVENT FundsDivested: ",
              last_event,
              action,
              step
            );
            setLastEventTxHash(
              `${strategyExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = actions.findIndex(
              (el) => el == Action.FundsDivested
            );
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;
          }
        } else if (
          last_event.eventName == "InvestConfirmFailed" &&
          action == Action.FundsInvest
        ) {
          console.log("EVENT InvestConfirmFailed: ", last_event, action, step);
          if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
            console.log(
              "PASSED EVENT InvestConfirmFailed: ",
              last_event,
              action,
              step
            );
            setLastEventTxHash(
              `${strategyExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = actions.findIndex(
              (el) => el == Action.InvestConfirmFailed
            );
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;
          }
        } else if (
          last_event.eventName == "ReturnFundsFromStrategyFailed" &&
          action == Action.FundsDivested
        ) {
          console.log(
            "EVENT ReturnFundsFromStrategyFailed: ",
            last_event,
            action,
            step
          );
          if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
            console.log(
              "PASSED EVENT ReturnFundsFromStrategyFailed: ",
              last_event,
              action,
              step
            );
            setLastEventTxHash(
              `${strategyExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = actions.findIndex(
              (el) => el == Action.ReturnFundsFromStrategyFailed
            );
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;
          }
        }
      }
    }
  }, [strategyEvents]);

  useEffect(() => {
    if (
      withdrawalReceiverEvents &&
      withdrawalReceiverEvents.length > 0 &&
      crosschainInvestHash != ""
    ) {
      console.log("event31: ", withdrawalReceiverEvents);
      const newEvents = withdrawalReceiverEvents.filter((event) => {
        const eventKey = `${event.transactionHash}-${event.logIndex}`;
        if (processedTxHashesRef.current.withdrawal.has(eventKey)) {
          return false;
        }
        processedTxHashesRef.current.withdrawal.add(eventKey);
        return true;
      });
      console.log("New withdrawalReceiver events: ", newEvents);
      for (let i = 0; i < newEvents.length; i++) {
        const last_event = newEvents[i];
        if (
          last_event.eventName == "FundsReturned" &&
          action == Action.CrossChainInvestFailed
        ) {
          console.log(
            "EVENT FundsReturned on deposit: ",
            last_event,
            action,
            step
          );
          if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
            console.log(
              "PASSED EVENT FundsReturned on deposit: ",
              last_event,
              action,
              step
            );
            setLastEventTxHash(
              `${activeChainExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = actions.findIndex(
              (el) => el == Action.FundsReturnedError
            );
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;
          }
        } else if (
          last_event.eventName == "FundsReturned" &&
          action == Action.ReturnFundsToUserSent
        ) {
          console.log(
            "EVENT FundsReturned on withdraw: ",
            last_event,
            action,
            step
          );
          if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
            console.log(
              "PASSED EVENT FundsReturned on withdraw: ",
              last_event,
              action,
              step
            );
            setLastEventTxHash(
              `${activeChainExplorerBaseUrl}/tx/${last_event.transactionHash}`
            );
            const nextStep = actions.findIndex((el) => el == Action.withdrew);
            setAction(actions[nextStep]);
            setStep(nextStep);
            return;}
          } else if (
            last_event.eventName == "CrossChainDepositFailed" &&
            action == Action.depositConfirmed
          ) {
            console.log(
              "EVENT CrossChainDepositFailed on deposit: ",
              last_event,
              action,
              step
            );
            if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
              console.log(
                "PASSED EVENT CrossChainDepositFailed on deposit: ",
                last_event,
                action,
                step
              );
              setLastEventTxHash(
                `${activeChainExplorerBaseUrl}/tx/${last_event.transactionHash}`
              );
              const nextStep = actions.findIndex(
                (el) => el == Action.CrossChainDepositFailed
              );
              setAction(actions[nextStep]);
              setStep(nextStep);
              return;
            }
          } else if (
            last_event.eventName == "CrossChainWithdrawFailed" &&
            action == Action.withdrawconfirmed
          ) {
            console.log(
              "EVENT CrossChainWithdrawFailed on withdraw: ",
              last_event,
              action,
              step
            );
            if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
              console.log(
                "PASSED EVENT CrossChainWithdrawFailed on withdraw: ",
                last_event,
                action,
                step
              );
              const nextStep = actions.findIndex(
                (el) => el == Action.CrossChainWithdrawFailed
              );
              setAction(actions[nextStep]);
              setStep(nextStep);
              return;
            
          }
        }
      }
    }
  }, [withdrawalReceiverEvents]);
  */

  // ================================================================================================
  // END OF COMMENTED OUT EVENT-BASED CONFIRMATION LOGIC
  // ================================================================================================

  function updateTransactionStepFeedback(
    actionIndex: Action,
    data: Partial<TransactionStepFeedback>
  ) {
    setTransactionStepFeedback((prev) => ({
      ...prev,
      [actionIndex]: {
        ...prev[actionIndex],
        ...data,
      },
    }));
  }

  useEffect(() => {
    setTransactionStepFeedback({});
  }, [actions]);

  // ADDED: Page Visibility API to handle browser tab switching
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [transactionStateBeforeTabSwitch, setTransactionStateBeforeTabSwitch] = useState<{
    transactionStepFeedback: TransactionStepMessages;
    isTransactionStarted: boolean;
    isTransactionProcessing: boolean;
    finishedTransaction: boolean;
    crosschainInvestHash: string;
    crossChainTxId: string;
  } | null>(null);

  // Handle browser tab visibility changes to prevent feedback loss
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsTabVisible(isVisible);
      
      if (!isVisible) {
        // Tab became invisible - save current transaction state
        if (crosschainInvestHash.length > 0 || isTransactionStarted || isTransactionProcessing || Object.keys(transactionStepFeedback).length > 0) {
          console.log('[Tab Visibility] Saving transaction state before tab switch');
          setTransactionStateBeforeTabSwitch({
            transactionStepFeedback,
            isTransactionStarted,
            isTransactionProcessing,
            finishedTransaction,
            crosschainInvestHash,
            crossChainTxId
          });
        }
      } else {
        // Tab became visible - restore transaction state if needed
        if (transactionStateBeforeTabSwitch) {
          console.log('[Tab Visibility] Restoring transaction state after tab switch');
          setTransactionStepFeedback(transactionStateBeforeTabSwitch.transactionStepFeedback);
          setIsTransactionStarted(transactionStateBeforeTabSwitch.isTransactionStarted);
          setIsTransactionProcessing(transactionStateBeforeTabSwitch.isTransactionProcessing);
          setFinishedTransaction(transactionStateBeforeTabSwitch.finishedTransaction);
          setCrosschainInvestHash(transactionStateBeforeTabSwitch.crosschainInvestHash);
          setcrossChainTxId(transactionStateBeforeTabSwitch.crossChainTxId);
          
          // Clear the saved state
          setTransactionStateBeforeTabSwitch(null);
        }
      }
    };

    // Add event listener for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also listen for window focus/blur as backup
    const handleFocus = () => setIsTabVisible(true);
    const handleBlur = () => setIsTabVisible(false);
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [transactionStepFeedback, isTransactionStarted, isTransactionProcessing, finishedTransaction, crosschainInvestHash, crossChainTxId]);

  // Replace the problematic reset logic with smarter reset conditions
  function resetTransactionState() {
    setFinishedTransaction(false);
    setIsTransactionProcessing(false);
    setIsTransactionStarted(false);
    setCrosschainInvestHash("");
    setcrossChainTxId("");
    setTransactionStepFeedback({});
    setTransactionCompleted(false); // Reset transaction completed state
    setIsBlockPIActive(false); // Reset BlockPI priority flag
  }

  // FIXED: Only reset when there's no active transaction AND tab is visible
  useEffect(() => {
    // Don't reset if there's an active transaction in progress OR if tab is not visible
    if (
      isTabVisible && 
      Number(_inputBalance.value) > 0 && 
      crosschainInvestHash.length === 0 && 
      !isTransactionStarted && 
      !isTransactionProcessing && 
      Object.keys(transactionStepFeedback).length === 0
    ) {
      console.log('[Reset] Resetting transaction state due to input balance change');
      resetTransactionState();
    }
  }, [_inputBalance.value, crosschainInvestHash, isTransactionStarted, isTransactionProcessing, isTabVisible]);

  useEffect(() => {
    // Don't reset if there's an active transaction OR if tab is not visible
    if (
      isTabVisible && 
      crosschainInvestHash.length === 0 && 
      !isTransactionStarted && 
      !isTransactionProcessing && 
      Object.keys(transactionStepFeedback).length === 0
    ) {
      console.log('[Reset] Resetting transaction state due to input token change');
      resetTransactionState();
    }
  }, [_inputToken, crosschainInvestHash, isTransactionStarted, isTransactionProcessing, isTabVisible]);

  useEffect(() => {
    // Don't reset if there's an active transaction OR if tab is not visible
    if (
      isTabVisible && 
      crosschainInvestHash.length === 0 && 
      !isTransactionStarted && 
      !isTransactionProcessing && 
      Object.keys(transactionStepFeedback).length === 0
    ) {
      console.log('[Reset] Resetting transaction state due to deposit/withdraw toggle');
      resetTransactionState();
    }
  }, [isDeposit, crosschainInvestHash, isTransactionStarted, isTransactionProcessing, isTabVisible]);

  // ADDED: Integrate BlockPI sequence progress with existing state machine
  useEffect(() => {
    if (!transactionSequenceProgress) return;

    const { steps, currentStep, isComplete, error } = transactionSequenceProgress;
    
    // Map BlockPI progress to action/step progression
    if (isComplete) {
      // Transaction completed successfully
      const isDeposit = steps.some(step => step.name.includes('deposit') || step.name.includes('Deposit'));
      if (isDeposit) {
        const nextStep = actions.findIndex(el => el === Action.deposited);
        if (nextStep >= 0 && action !== Action.deposited) {
          setAction(actions[nextStep]);
          setStep(nextStep);
        }
      } else {
        const nextStep = actions.findIndex(el => el === Action.withdrew);
        if (nextStep >= 0 && action !== Action.withdrew) {
          setAction(actions[nextStep]);
          setStep(nextStep);
        }
      }
    } else if (error) {
      // Handle errors based on transaction type and current step
      const isDeposit = steps.some(step => step.name.includes('deposit') || step.name.includes('Deposit'));
      
      if (error.includes('reverted')) {
        if (isDeposit) {
          const nextStep = actions.findIndex(el => el === Action.CrossChainInvestFailed);
          if (nextStep >= 0 && action !== Action.CrossChainInvestFailed) {
            setAction(actions[nextStep]);
            setStep(nextStep);
          }
        } else {
          const nextStep = actions.findIndex(el => el === Action.DivestFailed);
          if (nextStep >= 0 && action !== Action.DivestFailed) {
            setAction(actions[nextStep]);
            setStep(nextStep);
          }
        }
      }
    } else {
      // Progress through intermediate steps based on currentStep
      const isDeposit = steps.some(step => step.name.includes('deposit') || step.name.includes('Deposit'));
      
      if (currentStep >= 1 && action === Action.depositConfirmed && isDeposit) {
        // Move to crosschainInvest step
        const nextStep = actions.findIndex(el => el === Action.crosschainInvest);
        if (nextStep >= 0) {
          setAction(actions[nextStep]);
          setStep(nextStep);
        }
      } else if (currentStep >= 1 && action === Action.withdrawconfirmed && !isDeposit) {
        // Move to DivestSent step
        const nextStep = actions.findIndex(el => el === Action.DivestSent);
        if (nextStep >= 0) {
          setAction(actions[nextStep]);
          setStep(nextStep);
        }
      } else if (currentStep >= 3 && action === Action.crosschainInvest && isDeposit) {
        // Move to FundsInvest step
        const nextStep = actions.findIndex(el => el === Action.FundsInvest);
        if (nextStep >= 0) {
          setAction(actions[nextStep]);
          setStep(nextStep);
        }
      } else if (currentStep >= 3 && action === Action.DivestSent && !isDeposit) {
        // Move to FundsDivested step
        const nextStep = actions.findIndex(el => el === Action.FundsDivested);
        if (nextStep >= 0) {
          setAction(actions[nextStep]);
          setStep(nextStep);
        }
      } else if (currentStep >= 4 && action === Action.FundsDivested && !isDeposit) {
        // Move to ReturnFundsToUserSent step for withdrawals
        const nextStep = actions.findIndex(el => el === Action.ReturnFundsToUserSent);
        if (nextStep >= 0) {
          setAction(actions[nextStep]);
          setStep(nextStep);
        }
      }
    }
  }, [transactionSequenceProgress, actions, action, setAction, setStep]);

  // ADDED: State persistence - maintain transaction state when component unmounts/remounts
  useEffect(() => {
    // Save transaction state to sessionStorage for persistence across tab switches
    if (crosschainInvestHash.length > 0 || crossChainTxId.length > 0 || isTransactionStarted || isTransactionProcessing) {
      const transactionState = {
        crosschainInvestHash,
        crossChainTxId,
        isTransactionStarted,
        isTransactionProcessing,
        finishedTransaction,
        action,
        step,
        timestamp: Date.now()
      };
      sessionStorage.setItem('amana_transaction_state', JSON.stringify(transactionState));
    }
  }, [crosschainInvestHash, crossChainTxId, isTransactionStarted, isTransactionProcessing, finishedTransaction, action, step]);

  // ADDED: Restore transaction state on component mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('amana_transaction_state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // Only restore if transaction is less than 20 minutes old
        if (Date.now() - state.timestamp < 20 * 60 * 1000) {
          setCrosschainInvestHash(state.crosschainInvestHash || "");
          setcrossChainTxId(state.crossChainTxId || "");
          setIsTransactionStarted(state.isTransactionStarted || false);
          setIsTransactionProcessing(state.isTransactionProcessing || false);
          setFinishedTransaction(state.finishedTransaction || false);
          
          // Restore action and step
          if (state.action && state.step !== undefined) {
            setAction(state.action);
            setStep(state.step);
          }
        } else {
          // Clear stale state
          sessionStorage.removeItem('amana_transaction_state');
        }
      } catch (error) {
        console.error('Error restoring transaction state:', error);
        sessionStorage.removeItem('amana_transaction_state');
      }
    }
  }, []); // Only run on mount

  // ADDED: Clear transaction state when transaction completes
  useEffect(() => {
    if (finishedTransaction) {
      sessionStorage.removeItem('amana_transaction_state');
    }
  }, [finishedTransaction]);

  // Check for pending transactions on component mount
  useEffect(() => {
    // Add debugging to understand button disabled state
    console.log('[Debug] Button disabled state check:', {
      isTransactionProcessing,
      crosschainInvestHash: crosschainInvestHash.length,
      finishedTransaction,
      disabled: isTransactionProcessing || (crosschainInvestHash.length > 0 && !finishedTransaction)
    });
    
    // Check for pending deposit transactions
    const pendingDepositTx = localStorage.getItem('pendingDepositTransaction');
    if (pendingDepositTx) {
      try {
        const { hash, txId, timestamp, type } = JSON.parse(pendingDepositTx);
        
        console.log('[Debug] Found pending deposit transaction:', { hash, type, age: Date.now() - timestamp });
        
        // Only resume if transaction is less than 20 minutes old
        if (Date.now() - timestamp < 20 * 60 * 1000) {
          console.log(`[BlockPI] Resuming pending ${type} transaction:`, hash);
          setCrosschainInvestHash(hash);
          setcrossChainTxId(txId);
          
          // Set action to appropriate confirmed state to trigger sequence tracking
          const actionKey = type === 'deposit' ? Action.depositConfirmed : Action.withdrawconfirmed;
          const nextStep = actions.findIndex((el) => el === actionKey);
          if (nextStep >= 0) {
            setAction(actions[nextStep]);
            setStep(nextStep);
          }
        } else {
          console.log('[BlockPI] Found stale deposit transaction, removing from localStorage');
          localStorage.removeItem('pendingDepositTransaction');
        }
      } catch (error) {
        console.error('[BlockPI] Error parsing pending deposit transaction:', error);
        localStorage.removeItem('pendingDepositTransaction');
      }
    }
    
    // Check for pending withdraw transactions
    const pendingWithdrawTx = localStorage.getItem('pendingWithdrawTransaction');
    if (pendingWithdrawTx) {
      try {
        const { hash, txId, timestamp, type } = JSON.parse(pendingWithdrawTx);
        
        console.log('[Debug] Found pending withdraw transaction:', { hash, type, age: Date.now() - timestamp });
        
        // Only resume if transaction is less than 20 minutes old
        if (Date.now() - timestamp < 20 * 60 * 1000) {
          console.log(`[BlockPI] Resuming pending ${type} transaction:`, hash);
          setCrosschainInvestHash(hash);
          setcrossChainTxId(txId);
          
          // Set action to appropriate confirmed state to trigger sequence tracking
          const actionKey = type === 'withdrawal' ? Action.withdrawconfirmed : Action.depositConfirmed;
          const nextStep = actions.findIndex((el) => el === actionKey);
          if (nextStep >= 0) {
            setAction(actions[nextStep]);
            setStep(nextStep);
          }
        } else {
          console.log(`[BlockPI] Found stale ${type} transaction, removing from localStorage`);
          localStorage.removeItem('pendingWithdrawTransaction');
        }
      } catch (error) {
        console.error('[BlockPI] Error parsing pending withdraw transaction:', error);
        localStorage.removeItem('pendingWithdrawTransaction');
      }
    }
  }, [actions, setCrosschainInvestHash, setcrossChainTxId, setAction, setStep]);

  // Force clear all transaction state - manual cleanup function
  const forceClearTransactionState = useCallback(() => {
    console.log('[Cleanup] Force clearing all transaction state');
    
    // Clear all state
    setFinishedTransaction(false);
    setIsTransactionProcessing(false);
    setIsTransactionStarted(false);
    setCrosschainInvestHash("");
    setcrossChainTxId("");
    setTransactionStepFeedback({});
    setLastTransactionStepFeedback({});
    setTransactionSequenceProgress(null);
    setTransactionStateBeforeTabSwitch(null);
    setTransactionCompleted(false);
    setIsBlockPIActive(false);
    
    // Clear all localStorage items
    localStorage.removeItem('pendingDepositTransaction');
    localStorage.removeItem('pendingWithdrawTransaction');
    localStorage.removeItem('amana_current_transaction_feedback');
    localStorage.removeItem('amana_transaction_progress');
    localStorage.removeItem('amana_sequence_progress');
    localStorage.removeItem('amana_transaction_error');
    
    // Clear sessionStorage as well
    sessionStorage.removeItem('amana_transaction_state');
    
    console.log('[Cleanup] All transaction state cleared');
  }, [
    setFinishedTransaction,
    setIsTransactionProcessing, 
    setIsTransactionStarted,
    setCrosschainInvestHash,
    setcrossChainTxId,
    setTransactionStepFeedback,
    setLastTransactionStepFeedback,
    setTransactionSequenceProgress,
    setTransactionStateBeforeTabSwitch,
    setTransactionCompleted
  ]);

  // Separate effect for cleanup check to avoid dependency issues
  useEffect(() => {
    // Only run cleanup check after component has mounted and stabilized
    const timer = setTimeout(() => {
      const pendingDepositTx = localStorage.getItem('pendingDepositTransaction');
      const pendingWithdrawTx = localStorage.getItem('pendingWithdrawTransaction');
      
      // If no pending transactions found but we still have disabled state, force clear it
      if (!pendingDepositTx && !pendingWithdrawTx && (crosschainInvestHash.length > 0 || isTransactionProcessing) && !isTransactionStarted) {
        console.log('[Debug] No pending transactions but disabled state detected - force clearing');
        forceClearTransactionState();
      }
    }, 1000); // Wait 1 second before checking
    
    return () => clearTimeout(timer);
  }, []); // Only run once on mount

  // Add window function for manual debugging
  useEffect(() => {
    // @ts-ignore
    window.forceClearTransactionState = forceClearTransactionState;
    // @ts-ignore
    window.debugTransactionState = () => {
      console.log('[Debug] Current transaction state:', {
        isTransactionProcessing,
        crosschainInvestHash,
        crossChainTxId,
        finishedTransaction,
        isTransactionStarted,
        action,
        step,
        transactionStepFeedback: Object.keys(transactionStepFeedback),
        buttonDisabled: isTransactionProcessing || (crosschainInvestHash.length > 0 && !finishedTransaction)
      });
      
      console.log('[Debug] localStorage items:', {
        pendingDepositTransaction: localStorage.getItem('pendingDepositTransaction'),
        pendingWithdrawTransaction: localStorage.getItem('pendingWithdrawTransaction'),
        amana_current_transaction_feedback: localStorage.getItem('amana_current_transaction_feedback'),
        amana_transaction_progress: localStorage.getItem('amana_transaction_progress'),
        amana_sequence_progress: localStorage.getItem('amana_sequence_progress'),
        amana_transaction_error: localStorage.getItem('amana_transaction_error')
      });
      
      console.log('[Debug] sessionStorage items:', {
        amana_transaction_state: sessionStorage.getItem('amana_transaction_state')
      });
    };
    
    // FIXED: Add real-time BlockPI status checker
    // @ts-ignore
    window.checkBlockPIStatus = async (hash, cctxIndex = null) => {
      try {
        const response = await fetch(cctxIndex ? 
          `${process.env.NEXT_PUBLIC_BLOCKPI_URL}/cctx/${cctxIndex}?t=${Date.now()}` :
          `${process.env.NEXT_PUBLIC_BLOCKPI_URL}/inboundHashToCctx/${hash}?t=${Date.now()}`
        );
        const data = await response.json();
        console.log('[BlockPI Debug] Fresh data:', data);
        
        if (cctxIndex) {
          const status = data?.CrossChainTx?.cctx_status?.status;
          const lastUpdate = data?.CrossChainTx?.cctx_status?.lastUpdate_timestamp;
          console.log(`[BlockPI Debug] Status: ${status}, Last Update: ${lastUpdate}`);
          return { status, lastUpdate, data };
        } else {
          const cctxIdx = data?.inboundHashToCctx?.cctx_index?.[0];
          console.log(`[BlockPI Debug] CCTX Index: ${cctxIdx}`);
          return { cctxIndex: cctxIdx, data };
        }
             } catch (error) {
         console.error('[BlockPI Debug] Error:', error);
         return { error: error instanceof Error ? error.message : 'Unknown error' };
       }
    };
    
    return () => {
      // @ts-ignore
      delete window.forceClearTransactionState;
      // @ts-ignore
      delete window.debugTransactionState;
      // @ts-ignore
      delete window.checkBlockPIStatus;
    };
  }, [forceClearTransactionState, isTransactionProcessing, crosschainInvestHash, crossChainTxId, finishedTransaction, isTransactionStarted, action, step, transactionStepFeedback]);

  // ADDED: Route change detection to reset transaction state on page navigation
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  
  // Force reset transaction state when route changes (navigation within app)
  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      console.log('[Route Change] Detected navigation from', previousPathnameRef.current, 'to', pathname);
      console.log('[Route Change] Resetting all transaction state and stopping tracking');
      
      // Force reset all transaction state
      setFinishedTransaction(false);
      setIsTransactionProcessing(false);
      setIsTransactionStarted(false);
      setCrosschainInvestHash("");
      setcrossChainTxId("");
      setTransactionStepFeedback({});
      setLastTransactionStepFeedback({});
      setTransactionSequenceProgress(null);
      setTransactionStateBeforeTabSwitch(null);
      setIsBlockPIActive(false);
      
      // Clear all localStorage items related to transactions
      localStorage.removeItem('pendingDepositTransaction');
      localStorage.removeItem('pendingWithdrawTransaction');
      localStorage.removeItem('amana_current_transaction_feedback');
      localStorage.removeItem('amana_transaction_progress');
      localStorage.removeItem('amana_sequence_progress');
      localStorage.removeItem('amana_transaction_error');
      
      // Clear sessionStorage as well
      sessionStorage.removeItem('amana_transaction_state');
      
      // Update previous pathname reference
      previousPathnameRef.current = pathname;
    }
  }, [pathname]);

  // Auto-cleanup on component mount to prevent disabled button issues
  useEffect(() => {
    // Check for lingering transaction state that might cause disabled button
    const hasLingeringState = crosschainInvestHash.length > 0 && !isTransactionStarted && !isTransactionProcessing && !finishedTransaction;
    
    if (hasLingeringState) {
      console.log('[Auto-Cleanup] Detected lingering transaction state on mount - clearing');
      forceClearTransactionState();
    }
  }, []); // Only run once on mount

  // Additional immediate cleanup check for button state
  useEffect(() => {
    // If we have a crosschainInvestHash but no active transaction state, clear it immediately
    if (crosschainInvestHash.length > 0 && !isTransactionStarted && !isTransactionProcessing && !finishedTransaction) {
      console.log('[Button State] Clearing lingering hash that would disable button');
      setCrosschainInvestHash("");
    }
  }, [crosschainInvestHash, isTransactionStarted, isTransactionProcessing, finishedTransaction]);

  return (
    <div className="w-full flex flex-col mt-5">
      <Interaction
        setStep={setStep}
        setAction={setAction}
        inputToken={_inputToken}
        vaultData={vaultData}
        action={action}
        inputBalance={_inputBalance}
        setTransactionCompleted={setTransactionCompleted}
        activeChain={activeChain}
        actions={actions}
        setCrosschainInvestHash={setCrosschainInvestHash}
        setcrossChainTxId={setcrossChainTxId}
        setInputBalance={setInputBalance}
        step={step}
        transactionStepFeedback={transactionStepFeedback}
        setTransactionStepFeedback={setTransactionStepFeedback}
        updateTransactionStepFeedback={updateTransactionStepFeedback}
        label={label}
        setLabel={setLabel}
        errorMessage={errorMessage}
        lastTransactionStepFeedback={lastTransactionStepFeedback}
        setLastTransactionStepFeedback={setLastTransactionStepFeedback}
        isTransactionStarted={isTransactionStarted}
        setIsTransactionStarted={setIsTransactionStarted}
        isTransactionProcessing={isTransactionProcessing}
        setIsTransactionProcessing={setIsTransactionProcessing}
        finishedTransaction={finishedTransaction}
        setFinishedTransaction={setFinishedTransaction}
        completeTransactionProcess={completeTransactionProcess}
        lastEventTxHash={lastEventTxHash}
        setLastEventTxHash={setLastEventTxHash}
        refreshBalance={refreshBalance}
        crosschainInvestHash={crosschainInvestHash}
        crossChainTxId={crossChainTxId}
        transactionStateBeforeTabSwitch={transactionStateBeforeTabSwitch}
        isBlockPIActive={isBlockPIActive}
      />
    </div>
  );
}

function Interaction({
  setStep,
  setAction,
  inputToken,
  inputBalance,
  action,
  vaultData,
  setTransactionCompleted,
  activeChain,
  actions,
  setCrosschainInvestHash,
  setcrossChainTxId,
  setInputBalance,
  step,
  transactionStepFeedback,
  setTransactionStepFeedback,
  updateTransactionStepFeedback,
  label,
  setLabel,
  errorMessage,
  lastTransactionStepFeedback,
  setLastTransactionStepFeedback,
  isTransactionStarted,
  setIsTransactionStarted,
  isTransactionProcessing,
  setIsTransactionProcessing,
  finishedTransaction,
  setFinishedTransaction,
  completeTransactionProcess,
  lastEventTxHash,
  setLastEventTxHash,
  refreshBalance,
  crosschainInvestHash,
  crossChainTxId,
  transactionStateBeforeTabSwitch,
  isBlockPIActive,
}: {
  setStep: Function;
  setAction: Function;
  inputToken: Token;
  inputBalance: Balance;
  action: Action;
  vaultData: VaultData;
  setTransactionCompleted: (value: boolean) => void;
  activeChain: Chain;
  actions: Action[];
  setCrosschainInvestHash: Function;
  setcrossChainTxId: Function;
  setInputBalance: Function;
  step: number;
  transactionStepFeedback: TransactionStepMessages;
  setTransactionStepFeedback: (
    newData:
      | TransactionStepMessages
      | ((prev: TransactionStepMessages) => TransactionStepMessages)
  ) => void;
  updateTransactionStepFeedback: (
    actionIndex: Action,
    data: Partial<TransactionStepFeedback>
  ) => void;
  label: string;
  setLabel: (label: string) => void;
  errorMessage: string;
  lastTransactionStepFeedback: TransactionStepMessages;
  setLastTransactionStepFeedback: (feedback: TransactionStepMessages) => void;
  isTransactionStarted: boolean;
  setIsTransactionStarted: (started: boolean) => void;
  isTransactionProcessing: boolean;
  setIsTransactionProcessing: (processing: boolean) => void;
  finishedTransaction: boolean;
  setFinishedTransaction: (finished: boolean) => void;
  completeTransactionProcess: (snapshot: TransactionStepMessages) => void;
  lastEventTxHash: string;
  setLastEventTxHash: (data: string) => void;
  refreshBalance: Function;
  crosschainInvestHash: string;
  crossChainTxId: string;
  transactionStateBeforeTabSwitch: {
    transactionStepFeedback: TransactionStepMessages;
    isTransactionStarted: boolean;
    isTransactionProcessing: boolean;
    finishedTransaction: boolean;
    crosschainInvestHash: string;
    crossChainTxId: string;
  } | null;
  isBlockPIActive: boolean;
}): JSX.Element {
  const activeAccount = useActiveAccount();
  const walletContext = useWallet();
  const { selectedChain } = useMultiChain();

    useEffect(() => {
    console.log("%c Called SWITCH!!", "color: blue");
    
    // Skip traditional action-based feedback updates when BlockPI is actively managing feedback
    if (isBlockPIActive) {
      console.log("[Traditional Feedback] Skipping action-based feedback update - BlockPI is active");
      return;
    }
    
    // FIXED: Prevent traditional feedback from running after transaction completion
    if (finishedTransaction) {
      console.log("[Traditional Feedback] Skipping action-based feedback update - transaction finished");
      return;
    }
    
    // FIXED: Prevent traditional feedback from overriding completed steps
    if (Object.keys(transactionStepFeedback).length > 0) {
      const hasCompletedSteps = Object.values(transactionStepFeedback).some(
        feedback => feedback?.status === TransactionStepStatus.completed
      );
      if (hasCompletedSteps && (action === Action.depositConfirmed || action === Action.withdrawconfirmed)) {
        console.log("[Traditional Feedback] Skipping confirmed action - completed steps exist, likely BlockPI managed");
        return;
      }
    }
    
    let newTransactionStepFeedback;
    let targetAction: Action;
    let description: string;
    console.log("lastEventTxHash", lastEventTxHash);
    const localLastEventTxHash = lastEventTxHash;
    setLastEventTxHash("");
    switch (action) {
      case Action.depositApprove:
        setTransactionStepFeedback({
          [Action.depositApprove]: {
            label: "Approve",
            description: "Transaction approval required",
            status: TransactionStepStatus.pending,
          },
        });
        setLabel("Approve");
        break;
      case Action.depositApproveConfirmed:
        setTransactionStepFeedback({
          [Action.depositApprove]: {
            label: "Approve",
            description: "Approval completed",
            status: TransactionStepStatus.completed,
          },
        });
        setIsTransactionProcessing(false);
        break;
      case Action.deposit:
        setLabel("Deposit");
        break;
      case Action.depositConfirmed:
        // FIXED: Don't override if already completed by BlockPI
        if (transactionStepFeedback[Action.depositConfirmed]?.status === TransactionStepStatus.completed) {
          console.log("[Traditional Feedback] Skipping depositConfirmed - already completed by BlockPI");
          break;
        }
        console.log("[Traditional Feedback] Setting depositConfirmed to processing");
        setTransactionStepFeedback((prev) => ({
          ...prev,
          [Action.deposit]: {
            label: "Deposit",
            description: "Initial deposit transaction on local chain completed",
            status: TransactionStepStatus.completed,
            txHash: localLastEventTxHash,
          },
          [Action.depositConfirmed]: {
            label: "Deposit",
            description: "Cross chain transfer to vault in progress",
            status: TransactionStepStatus.processing,
          },
        }));
        break;
      case Action.withdrawconfirmed:
        // FIXED: Don't override if already completed by BlockPI
        if (transactionStepFeedback[Action.withdrawconfirmed]?.status === TransactionStepStatus.completed) {
          console.log("[Traditional Feedback] Skipping withdrawconfirmed - already completed by BlockPI");
          break;
        }
        setTransactionStepFeedback((prev) => ({
          ...prev,
          [Action.withdraw]: {
            label: "Withdraw",
            description:
              "Initial withdraw transaction on local chain completed",
            status: TransactionStepStatus.completed,
            txHash: localLastEventTxHash,
          },
          [Action.withdrawconfirmed]: {
            label: "Withdraw",
            description: "Cross chain request to vault in progress",
            status: TransactionStepStatus.processing,
          },
        }));
        break;
      case Action.crosschainInvest:
        if (isZetachain(activeChain.id)) {
          setTransactionStepFeedback((prev) => ({
            ...prev,
            [Action.deposit]: {
              label: "Deposit",
              description: `Initial deposit transaction on ${activeChain.name} completed`,
              status: TransactionStepStatus.completed,
              txHash: localLastEventTxHash,
            },
            [Action.crosschainInvest]: {
              label: "Deposit",
              description:
                "Cross chain transfer and investment of funds in progress",
              status: TransactionStepStatus.processing,
            },
          }));
        } else {
          setTransactionStepFeedback((prev) => ({
            ...prev,
            [Action.depositConfirmed]: {
              label: "Deposit",
              description: "Cross chain transfer to vault completed",
              status: TransactionStepStatus.completed,
              txHash: localLastEventTxHash,
            },
            [Action.crosschainInvest]: {
              label: "Deposit",
              description:
                "Cross chain transfer and investment of funds in progress",
              status: TransactionStepStatus.processing,
            },
          }));
        }
        break;
      case Action.FundsInvest:
        setTransactionStepFeedback((prev) => ({
          ...prev,
          [Action.crosschainInvest]: {
            label: "Deposit",
            description:
              "Cross chain transfer and investment of funds completed",
            status: TransactionStepStatus.completed,
            txHash: localLastEventTxHash,
          },
          [Action.FundsInvest]: {
            label: "Deposit",
            description:
              "Final confirmation and issue of shares by vault in progress",
            status: TransactionStepStatus.processing,
          },
        }));
        break;
      case Action.deposited:
        trackEvent("Deposit Crosschain Complete", {
          vaultSymbol: vaultData.symbol,
          vault: vaultData.id,
        });
        if (isZetachain(vaultData.protocol.chainId)) {
          if (isZetachain(activeChain.id)) {
            newTransactionStepFeedback = {
              ...transactionStepFeedback,
              [Action.deposit]: {
                label: "Deposit",
                description: "Deposit completed",
                status: TransactionStepStatus.completed,
                txHash: localLastEventTxHash,
              },
            };
          } else {
            newTransactionStepFeedback = {
              ...transactionStepFeedback,
              [Action.depositConfirmed]: {
                label: "Deposit",
                description: "Cross chain transfer to vault completed",
                status: TransactionStepStatus.completed,
                txHash: localLastEventTxHash,
              },
              [Action.deposited]: {
                label: "Deposit",
                description: "Funds invested and shares issued",
                status: TransactionStepStatus.completed,
                txHash: localLastEventTxHash,
              },
            };
          }
        } else {
          newTransactionStepFeedback = {
            ...transactionStepFeedback,
            [Action.FundsInvest]: {
              label: "Deposit",
              description:
                "Final confirmation completed, shares issued by vault",
              status: TransactionStepStatus.completed,
              txHash: localLastEventTxHash,
            },
          };
        }
        setTransactionStepFeedback(newTransactionStepFeedback);
        completeTransactionProcess(newTransactionStepFeedback);
        break;
      case Action.InvestConfirmFailed:
        newTransactionStepFeedback = {
          ...transactionStepFeedback,
          [Action.FundsInvest]: {
            label: "Deposit",
            description: "Final confirmation failed",
            status: TransactionStepStatus.error,
            txHash: localLastEventTxHash,
          },
        };
        setTransactionStepFeedback(newTransactionStepFeedback);
        completeTransactionProcess(newTransactionStepFeedback);
        break;
      case Action.CrossChainDepositFailed:
        newTransactionStepFeedback = {
          ...transactionStepFeedback,
          [Action.depositConfirmed]: {
            label: "Deposit",
            description: "Cross chain transfer to vault failed",
            status: TransactionStepStatus.error,
            txHash: localLastEventTxHash,
          },
        };
        setTransactionStepFeedback(newTransactionStepFeedback);
        completeTransactionProcess(newTransactionStepFeedback);
        break;
      case Action.CrossChainWithdrawFailed:
        newTransactionStepFeedback = {
          ...transactionStepFeedback,
          [Action.withdrawconfirmed]: {
            label: "Withdraw",
            description: "Cross chain request to vault failed",
            status: TransactionStepStatus.error,
            txHash: localLastEventTxHash,
          },
        };
        setTransactionStepFeedback(newTransactionStepFeedback);
        completeTransactionProcess(newTransactionStepFeedback);
        break;
      case Action.withdraw:
        setLabel("Withdraw");
        break;
      case Action.DivestSent:
        if (isZetachain(activeChain.id)) {
          targetAction = Action.withdraw;
          description = `Initial withdraw transaction on ${activeChain.name} completed`;
        } else {
          targetAction = Action.withdrawconfirmed;
          description = "Cross chain request to vault completed";
        }
        setTransactionStepFeedback((prev) => ({
          ...prev,
          [targetAction]: {
            label: "Withdraw",
            description: description,
            status: TransactionStepStatus.completed,
            txHash: localLastEventTxHash,
          },
          [Action.DivestSent]: {
            label: "Withdraw",
            description: "Divestment of funds from strategy completed",
            status: TransactionStepStatus.completed,
            txHash: localLastEventTxHash,
          },
        }));
        break;
      case Action.ReturnFundsToUserSent:
        if (isZetachain(vaultData.protocol.chainId)) {
          targetAction = Action.withdrawconfirmed;
          description = "Cross chain request to vault completed";
        } else {
          targetAction = Action.FundsDivested;
          description = "Withdrawal confirmation completed";
        }
        setTransactionStepFeedback((prev) => ({
          ...prev,
          [targetAction]: {
            label: "Withdraw",
            description: description,
            status: TransactionStepStatus.completed,
            txHash: localLastEventTxHash,
          },
          [Action.ReturnFundsToUserSent]: {
            label: "Withdraw",
            description: "Return of funds in progress",
            status: TransactionStepStatus.processing,
          },
        }));
        break;
      case Action.FundsDivested:
        if (isZetachain(activeChain.id)) {
          description =
            "Withdrawal confirmation and return of funds in progress";
        } else {
          description = "Withdrawal confirmation in progress";
        }
        setTransactionStepFeedback((prev) => ({
          ...prev,
          [Action.DivestSent]: {
            label: "Withdraw",
            description: "Divestment of funds from strategy completed",
            status: TransactionStepStatus.processing,
          },
          [Action.FundsDivested]: {
            label: "Withdraw",
            description: description,
            status: TransactionStepStatus.processing,
          },
        }));
        break;
      case Action.withdrew:
        if (isZetachain(activeChain.id)) {
          if (isZetachain(vaultData.protocol.chainId)) {
            targetAction = Action.withdraw;
            description = "Withdraw completed";
          } else {
            targetAction = Action.FundsDivested;
            description = "Withdrawal confirmation completed, funds returned";
          }
        } else {
          targetAction = Action.ReturnFundsToUserSent;
          description = "Return of funds completed";
        }
        newTransactionStepFeedback = {
          ...transactionStepFeedback,
          [targetAction]: {
            label: "Withdraw",
            description: description,
            status: TransactionStepStatus.completed,
            txHash: localLastEventTxHash,
          },
        };
        setTransactionStepFeedback(newTransactionStepFeedback);
        completeTransactionProcess(newTransactionStepFeedback);
        break;
      case Action.CrossChainInvestFailed:
        setTransactionStepFeedback((prev) => ({
          ...prev,
          [Action.crosschainInvest]: {
            label: "Deposit",
            description: "Cross chain transfer and investment of funds failed",
            status: TransactionStepStatus.error,
            txHash: localLastEventTxHash,
          },
          [Action.FundsReturnedError]: {
            label: "Deposit",
            description: "Return of funds in progress",
            status: TransactionStepStatus.processing,
          },
        }));
        break;
      case Action.FundsReturnedError:
        newTransactionStepFeedback = {
          ...transactionStepFeedback,
          [Action.FundsReturnedError]: {
            label: "Deposit",
            description: "Return of funds completed",
            status: TransactionStepStatus.completed,
            txHash: localLastEventTxHash,
          },
        };
        setTransactionStepFeedback(newTransactionStepFeedback);
        completeTransactionProcess(newTransactionStepFeedback);
        break;
      case Action.DivestFailed:
        newTransactionStepFeedback = {
          ...transactionStepFeedback,
          [Action.DivestSent]: {
            label: "Withdraw",
            description:
              "Divestment of funds from strategy failed, please try again later",
            status: TransactionStepStatus.error,
            txHash: localLastEventTxHash,
          },
        };
        setTransactionStepFeedback(newTransactionStepFeedback);
        completeTransactionProcess(newTransactionStepFeedback);
        break;
      case Action.ReturnFundsFromStrategyFailed:
        newTransactionStepFeedback = {
          ...transactionStepFeedback,
          [Action.FundsDivested]: {
            label: "Withdraw",
            description:
              "Withdrawal confirmation failed, please try again later",
            status: TransactionStepStatus.error,
            txHash: localLastEventTxHash,
          },
        };
        setTransactionStepFeedback(newTransactionStepFeedback);
        completeTransactionProcess(newTransactionStepFeedback);
        break;
      case Action.ReturnFundsToUserFailed:
        newTransactionStepFeedback = {
          ...transactionStepFeedback,
          [Action.ReturnFundsToUserSent]: {
            label: "Withdraw",
            description: "Return of funds failed, please try again later",
            status: TransactionStepStatus.error,
            txHash: localLastEventTxHash,
          },
        };
        setTransactionStepFeedback(newTransactionStepFeedback);
        completeTransactionProcess(newTransactionStepFeedback);
        break;
    }
  }, [action, actions, isBlockPIActive]);

  async function interactionPostHook(success: boolean) {
    if (success) {
      if (actions[step + 1] == Action.depositApproveConfirmed) {
        const nextStep = step + 1;
        setAction(actions[nextStep]);
        setStep(nextStep);
        setTimeout(() => {
          setAction(actions[nextStep + 1]);
          setStep(nextStep + 1);
        }, 100);
      }
      if (
        action == Action.deposit &&
        actions[step + 1] == Action.depositConfirmed
      ) {
        const nextStep = step + 1;
        setAction(actions[nextStep]);
        setStep(nextStep);
      }
      if (
        action == Action.withdraw &&
        actions[step + 1] == Action.withdrawconfirmed
      ) {
        const nextStep = step + 1;
        setAction(actions[nextStep]);
        setStep(nextStep);
      }
    } else {
      if (action == Action.depositApprove) {
        updateTransactionStepFeedback(action, {
          status: TransactionStepStatus.error,
          description: "Approval transaction failed, please try again",
        });
      }
      if (action == Action.deposit) {
        setTransactionStepFeedback((prev) => ({
          ...prev,
          [action]: {
            label: "Deposit",
            description: "Local transaction failed, please try again",
            status: TransactionStepStatus.error,
          },
        }));
      }
      if (action == Action.withdraw) {
        setTransactionStepFeedback((prev) => ({
          ...prev,
          [action]: {
            label: "Withdraw",
            description: "Local transaction failed, please try again",
            status: TransactionStepStatus.error,
          },
        }));
      }
      setIsTransactionProcessing(false);
    }
  }

  const handleMainAction = async () => {
    if (isTransactionProcessing) return;
    setIsTransactionProcessing(true);
    
    // Only clear feedback for completely new transactions, not continued ones
    if ((action === Action.deposit || action === Action.withdraw) && Object.keys(transactionStepFeedback).length === 0) {
      console.log('[UI] Starting new transaction - ensuring clean state');
      setTransactionStepFeedback({});
      setLastTransactionStepFeedback({});
    }
    
    if (action == Action.depositApprove) {
      trackEvent("Approve Clicked", {
        vaultSymbol: vaultData.symbol,
        token: inputToken.symbol,
      });
      updateTransactionStepFeedback(action, {
        status: TransactionStepStatus.processing,
        description: "Approval in progress",
      });
    } else {
      // Is either deposit or withdrawal action
      // This marks event listeners as enabled
      setIsTransactionStarted(true);
    }
    if (action == Action.deposit) {
      trackEvent("Deposit Clicked", {
        vaultSymbol: vaultData.symbol,
        amount: inputBalance.formatted,
      });
      let description;
      if (isZetachain(activeChain.id)) {
        if (isZetachain(vaultData.protocol.chainId)) {
          description = "Deposit in progress";
        } else {
          description = `Initial deposit transaction on ${activeChain.name} in progress`;
        }
      } else {
        description = "Initial deposit transaction on local chain in progress";
      }
      
      console.log('[UI] Setting deposit loading state:', description);
      updateTransactionStepFeedback(action, {
        label: "Deposit",
        description,
        status: TransactionStepStatus.processing,
      });
    }
    if (action == Action.withdraw) {
      let description;
      if (isZetachain(vaultData.protocol.chainId)) {
        if (isZetachain(activeChain.id)) {
          description = `Withdrawing ${inputBalance.formatted} ${vaultData.inputToken.symbol}`;
        } else {
          description = `Initial withdraw transaction on local chain in progress`;
        }
      } else {
        description = `Initial withdraw transaction on ${activeChain.name} in progress`;
      }
      updateTransactionStepFeedback(action, {
        label: "Withdraw",
        description: description,
        status: TransactionStepStatus.processing,
      });
    }

    const success = await handleInteraction(
      vaultData,
      inputBalance,
      inputToken,
      activeAccount!,
      walletContext,
      setTransactionCompleted,
      activeChain,
      action,
      setCrosschainInvestHash,
      setcrossChainTxId,
      setInputBalance,
      setLastEventTxHash
    )();
    await interactionPostHook(!!success);
  };

  useEffect(() => {
    console.log("processActionsFeedback", transactionStepFeedback);
    console.log("lastProcessActionsFeedback", lastTransactionStepFeedback);
  }, [lastTransactionStepFeedback, transactionStepFeedback]);

  function handleDone() {
    console.log('[UI] handleDone called - clearing all transaction state');
    
    // Clear all transaction-related state
    setLastTransactionStepFeedback({});
    setTransactionStepFeedback({}); // Clear current feedback
    setFinishedTransaction(false);
    setTransactionCompleted(false);
    setIsTransactionProcessing(false);
    setIsTransactionStarted(false);
    setCrosschainInvestHash("");
    setcrossChainTxId("");
    setLabel(""); // Clear button label
    
    // Clear localStorage items
    localStorage.removeItem('pendingDepositTransaction');
    localStorage.removeItem('pendingWithdrawTransaction');
    localStorage.removeItem('amana_current_transaction_feedback');
    localStorage.removeItem('amana_transaction_progress');
    localStorage.removeItem('amana_sequence_progress');
    localStorage.removeItem('amana_transaction_error');
    
    // Clear sessionStorage
    sessionStorage.removeItem('amana_transaction_state');
    
    refreshBalance();
    
    console.log('[UI] All transaction state cleared');
  }

  return (
    <>
      {(
        // Show UI only if we have valid input amount OR there's an active/finished transaction
        (Number(inputBalance.formatted) > 0 && actions.length && !errorMessage) ||
        // OR if there's an active transaction
        (crosschainInvestHash.length > 0 || isTransactionStarted || isTransactionProcessing) ||
        // OR if transaction is finished and we have feedback to show
        (finishedTransaction && (Object.keys(transactionStepFeedback).length > 0 || Object.keys(lastTransactionStepFeedback).length > 0))
      ) && (
        <>
          <p className="text-white text-start text-2xl font-bold leading-none mb-3">
            {label}
          </p>
          {
            <>
              {(Object.keys(Action) as Array<keyof typeof Action>)
                .map((key) => key as unknown as Action)
                .map((item, index) => {
                  // Use saved state if available (during tab switch restoration)
                  const feedbackData = transactionStateBeforeTabSwitch ? 
                    transactionStateBeforeTabSwitch.transactionStepFeedback :
                    finishedTransaction ? lastTransactionStepFeedback : transactionStepFeedback;
                  
                  if (feedbackData[item]) {
                    const actionFeedback = feedbackData[item];
                    return (
                      <div
                        className="flex flex-col gap-2 mb-2 last:mb-4"
                        key={index}
                      >
                        <div className="flex gap-2 items-center">
                          <div className="w-6 h-6 rounded-full bg-gray-800 flex-center [&:has(.pending-state)]:bg-[transparent] [&:has(.pending-state)]:border-none">
                            {((actionStatus) => {
                              switch (actionStatus) {
                                case TransactionStepStatus.pending:
                                  return (
                                    <div className="w-4 h-4 bg-java-600 rounded-full animate-[ping_1.5s_ease-in-out_infinite]" />
                                  );
                                case TransactionStepStatus.error:
                                  return (
                                    <AiOutlineExclamation
                                      className="text-red-600"
                                      size={16}
                                    />
                                  );
                                case TransactionStepStatus.processing:
                                  return (
                                    <MoonLoader
                                      color="yellow"
                                      size={18}
                                      speedMultiplier={0.3}
                                      className="pending-state"
                                    />
                                  );
                                case TransactionStepStatus.completed:
                                  return (
                                    <AiOutlineCheck
                                      className="text-green-400"
                                      size={16}
                                    />
                                  );
                                default:
                                  return null;
                              }
                            })(actionFeedback.status)}
                          </div>
                          <p className="text-white text-start">
                            {actionFeedback.description}
                          </p>
                          {actionFeedback?.txHash && (
                            <Link
                              href={actionFeedback.txHash}
                              className="flex items-center gap-1 group text-white hover:text-blue-600"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ArrowTopRightOnSquareIcon
                                width="20"
                                height="20"
                                className="size-5"
                              />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
            </>
          }
          {finishedTransaction ? (
            <MainActionButton label="Done" handleClick={handleDone} />
          ) : (
            <MainActionButton
              disabled={isTransactionProcessing || (crosschainInvestHash.length > 0 && !finishedTransaction)}
              label={label}
              handleClick={handleMainAction}
            />
          )}
        </>
      )}
    </>
  );
}

function handleInteraction(
  vaultData: VaultData,
  inputBalance: Balance,
  inputToken: Token,
  activeAccount: Account,
  walletContext: WalletContextState | any,
  setTransactionCompleted: (value: boolean) => void,
  activeChain: Chain,
  action: Action,
  setCrosschainInvestHash: Function,
  setcrossChainTxId: Function,
  setInputBalance: Function,
  setLastEventTxHash: Function
) {
  console.log("inputToken in handleInteraction: ", inputToken.symbol, {
    action,
  });
  switch (action) {
    case Action.depositApprove:
      return async () => {
        const depositAmount = inputBalance.value;
        const result = await Approvedeposit(
          vaultData.id as Address,
          inputToken.address as Address,
          activeAccount,
          activeChain,
          depositAmount
        );
        return result;
      };
    case Action.deposit:
      return async () => {
        const result = await handleDepositTransaction(
          vaultData,
          inputBalance,
          inputToken,
          walletContext,
          activeAccount,
          setTransactionCompleted,
          activeChain,
          setCrosschainInvestHash,
          setcrossChainTxId,
          setInputBalance,
          setLastEventTxHash
        );
        return result;
      };
    case Action.withdraw:
      return async () => {
        const result = await handleWithdrawTransaction(
          vaultData,
          inputBalance,
          inputToken,
          walletContext,
          activeAccount,
          setTransactionCompleted,
          activeChain,
          setCrosschainInvestHash,
          setcrossChainTxId,
          setInputBalance,
          setLastEventTxHash
        );
        return result;
      };
    default:
      return () => {
        return false;
      };
  }
}

