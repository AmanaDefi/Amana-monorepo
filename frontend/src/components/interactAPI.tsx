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
      // Solana handling
    } else {
      const receiptObject = {
        transactionHash: receipt.transactionHash as `0x${string}`,
        client,
        chain: activeChain,
      };
      await waitForReceipt(receiptObject);
    }

    const activeChainExplorerBaseUrl = CHAINS_EXPLORER_BASE_URL_MAINNET[activeChain.id] ?? "";
    setLastEventTxHash(`${activeChainExplorerBaseUrl}/tx/${receipt.transactionHash}`);
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
    return false;
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
      // Solana handling
    } else {
      const receiptObject = {
        transactionHash: receipt.transactionHash as `0x${string}`,
        client,
        chain: activeChain,
      };
      await waitForReceipt(receiptObject);
    }
    
    const activeChainExplorerBaseUrl = CHAINS_EXPLORER_BASE_URL_MAINNET[activeChain.id] ?? "";
    setLastEventTxHash(`${activeChainExplorerBaseUrl}/tx/${receipt.transactionHash}`);
    setCrosschainInvestHash(receipt.transactionHash);
    return true;
  } catch (error) {
    trackEvent("Withdraw Failed", {
      vault: vaultData.id.toString(),
      vaultSymbol: vaultData.symbol,
    });
    return false;
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
  const pathname = usePathname();
  
  // Core transaction state
  const [crosschainInvestHash, setCrosschainInvestHash] = useState("");
  const [crossChainTxId, setcrossChainTxId] = useState<string>("");
  const [isTransactionStarted, setIsTransactionStarted] = useState(false);
  const [isTransactionProcessing, setIsTransactionProcessing] = useState(false);
  const [finishedTransaction, setFinishedTransaction] = useState(false);
  const [lastEventTxHash, setLastEventTxHash] = useState("");

  // BlockPI-only feedback system
  const [transactionStepFeedback, setTransactionStepFeedback] = useState<TransactionStepMessages>({});
  const [lastTransactionStepFeedback, setLastTransactionStepFeedback] = useState<TransactionStepMessages>({});
  
  const blockpi = useMemo(() => new Blockpi(), []);
  
  // Add ref to track if component is active to prevent stale updates
  const isComponentActiveRef = useRef(true);
  const currentTransactionRef = useRef<string>("");

  useEffect(() => {
    setAction(_action);
    setStep(0);
    
    // Reset transaction processing states when actions change (new vault)
    setIsTransactionProcessing(false);
    setIsTransactionStarted(false);
    setFinishedTransaction(false);
  }, [actions]);

  // BlockPI transaction sequence tracking
  useEffect(() => {
    let cancelled = false;
    
    const trackTransactionSequence = async () => {
      if (!crosschainInvestHash || !action) return;
      
      // Only start BlockPI tracking for confirmed transactions
      if (action !== Action.depositConfirmed && action !== Action.withdrawconfirmed) {
        console.log('[BlockPI] Skipping tracking for action:', action);
        return;
      }
      
      // Check if component is still active
      if (!isComponentActiveRef.current) {
        console.log('[BlockPI] Component inactive, skipping tracking');
        return;
      }
      
      const transactionType: 'deposit' | 'withdrawal' = action === Action.depositConfirmed ? 'deposit' : 'withdrawal';
      
      // Set current transaction reference
      currentTransactionRef.current = crosschainInvestHash;
      
      console.log('[BlockPI] Starting comprehensive transaction sequence tracking for:', crosschainInvestHash);
      
      // Save transaction state to localStorage
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
        
        const progress = await blockpi.trackTransactionSequence(
          crosschainInvestHash,
          transactionType,
          (stepIndex: number, status: 'pending' | 'processing' | 'completed' | 'error', data?: any) => {
            // Multiple cancellation checks
            if (cancelled || !isComponentActiveRef.current || currentTransactionRef.current !== crosschainInvestHash) {
              console.log(`[BlockPI] Callback cancelled: cancelled=${cancelled}, active=${isComponentActiveRef.current}, currentTx=${currentTransactionRef.current}, hash=${crosschainInvestHash}`);
              return;
            }
            
            console.log(`[BlockPI] Step update callback: stepIndex=${stepIndex}, status=${status}, type=${transactionType}`);
            updateTransactionStepFeedbackFromSequence(stepIndex, status, data, transactionType);
          }
        );
        
        // Handle completion
        if (progress.isComplete) {
          console.log(`[BlockPI] ${transactionType} sequence completed successfully`);
          
          // Check if still active before updating state
          if (!cancelled && isComponentActiveRef.current && currentTransactionRef.current === crosschainInvestHash) {
            // Mark ALL steps as completed when transaction finishes successfully
            markAllStepsAsCompleted(transactionType);
            
            localStorage.removeItem(`pending${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}Transaction`);
            localStorage.removeItem('amana_current_transaction_feedback');
            localStorage.removeItem('amana_transaction_progress');
            localStorage.removeItem('amana_sequence_progress');
            
            // Reset transaction processing state to allow new transactions
            setIsTransactionProcessing(false);
            setIsTransactionStarted(false);
            
            // Move to final step
            setTimeout(() => {
              if (!cancelled && isComponentActiveRef.current && currentTransactionRef.current === crosschainInvestHash) {
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
              }
            }, 500);
          }
        } else if (progress.error) {
          console.error(`[BlockPI] ${transactionType} sequence failed:`, progress.error);
          
          // Check if still active before updating state
          if (!cancelled && isComponentActiveRef.current && currentTransactionRef.current === crosschainInvestHash) {
            localStorage.setItem('amana_transaction_error', JSON.stringify({
              error: progress.error,
              timestamp: Date.now()
            }));
            
            // Reset transaction processing state to allow new transactions
            setIsTransactionProcessing(false);
            setIsTransactionStarted(false);
            
            // Handle error scenarios
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
        }
        
      } catch (error) {
        console.error(`[BlockPI] Error in ${transactionType} sequence tracking:`, error);
        
        localStorage.setItem('amana_transaction_error', JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }));
      }
    };

    if (crosschainInvestHash && (action === Action.depositConfirmed || action === Action.withdrawconfirmed)) {
      trackTransactionSequence();
    }

    return () => {
      cancelled = true;
    };
  }, [crosschainInvestHash, action, blockpi]);

  // Restore transaction state when component mounts
  useEffect(() => {
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
  }, []);

  // Route change detection - clear transaction states when navigating between different pages
  useEffect(() => {
    const savedRoute = localStorage.getItem('amana_current_route');
    
    if (savedRoute && savedRoute !== pathname) {
      console.log(`[Route Change] Detected route change from ${savedRoute} to ${pathname}, clearing transaction states`);
      
      // Mark component as inactive to prevent stale BlockPI updates
      isComponentActiveRef.current = false;
      currentTransactionRef.current = "";
      
      // Clear all transaction-related localStorage items
      localStorage.removeItem('pendingDepositTransaction');
      localStorage.removeItem('pendingWithdrawTransaction');
      localStorage.removeItem('amana_current_transaction_feedback');
      localStorage.removeItem('amana_transaction_progress');
      localStorage.removeItem('amana_sequence_progress');
      localStorage.removeItem('amana_transaction_error');
      
      // Reset component state
      setTransactionStepFeedback({});
      setLastTransactionStepFeedback({});
      setFinishedTransaction(false);
      setIsTransactionStarted(false);
      setIsTransactionProcessing(false);
      setCrosschainInvestHash("");
      setcrossChainTxId("");
      setTransactionCompleted(false);
      
      // Re-activate component for new route
      setTimeout(() => {
        isComponentActiveRef.current = true;
      }, 100);
    }
    
    // Save current route
    localStorage.setItem('amana_current_route', pathname);
  }, [pathname]);

  // Helper function to mark all steps as completed
  function markAllStepsAsCompleted(transactionType: 'deposit' | 'withdrawal') {
    const isDeposit = transactionType === 'deposit';
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

    const stepDescriptions = isDeposit ? [
      'Initial deposit transaction completed',
      'Cross chain transfer to vault completed',
      'Cross chain transfer to strategy completed',
      'Funds investment on strategy chain completed',
      'Investment confirmation and shares issued completed'
    ] : [
      'Initial withdraw transaction completed',
      'Cross chain request to vault completed',
      'Cross chain request to strategy completed',
      'Funds divestment on strategy chain completed',
      'Return of funds to vault completed',
      'Final withdraw to user completed'
    ];

    console.log(`[UI Feedback] Marking all ${transactionType} steps as completed`);
    
    setTransactionStepFeedback(prev => {
      const updatedFeedback = { ...prev };
      
      actionMapping.forEach((actionKey, index) => {
        if (actionKey) {
          updatedFeedback[actionKey] = {
            label: isDeposit ? "Deposit" : "Withdraw",
            description: stepDescriptions[index],
            status: TransactionStepStatus.completed,
            txHash: updatedFeedback[actionKey]?.txHash
          };
        }
      });
      
      return updatedFeedback;
    });
  }

  // Helper function to update UI feedback based on BlockPI sequence progress
  function updateTransactionStepFeedbackFromSequence(
    stepIndex: number,
    status: 'pending' | 'processing' | 'completed' | 'error',
    data?: any,
    transactionType?: 'deposit' | 'withdrawal'
  ) {
    // Check if component is still active
    if (!isComponentActiveRef.current) {
      console.log(`[UI Feedback] Component inactive, skipping feedback update for step ${stepIndex}`);
      return;
    }
    
    const isDeposit = transactionType === 'deposit';
    
    console.log(`[UI Feedback] Step ${stepIndex}, Status: ${status}, Type: ${transactionType}`);
    
    // Map BlockPI steps to Action enum
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
    
    function getStepTxHash(stepIndex: number, data?: any): string | undefined {
      if (!data) return undefined;
      
      if (stepIndex === 0) {
        return data.localHash || data.hash;
      } else if (data.cctxIndex) {
        return `${process.env.NEXT_PUBLIC_BLOCKPI_URL}/cctx/${data.cctxIndex}`;
      } else if (data.hash) {
        return data.hash;
      }
      
      return undefined;
    }
    
    const actionKey = actionMapping[stepIndex];
    if (!actionKey) {
      console.warn(`[UI Feedback] No action mapping for step ${stepIndex}`);
      return;
    }
    
    setTransactionStepFeedback(prev => {
      const existingFeedback = prev[actionKey];
      
      // Don't downgrade from completed to processing
      if (existingFeedback && 
          existingFeedback.status === TransactionStepStatus.completed && 
          status === 'processing') {
        console.log(`[UI Feedback] BLOCKED: Preventing downgrade from completed to processing for step ${stepIndex}`);
        return prev;
      }
      
      let stepStatus: TransactionStepStatus;
      let description: string;
      let txHash: string | undefined;
      
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
        return prev; // Don't show pending steps
      }
      
      const updatedFeedback = { ...prev };
      
      // IMPROVED: Mark all previous steps as completed when current step starts (processing) or completes
      if (status === 'processing' || status === 'completed') {
        console.log(`[UI Feedback] Marking steps 0-${stepIndex-1} as completed due to step ${stepIndex} ${status}`);
        for (let i = 0; i < stepIndex; i++) {
          const prevActionKey = actionMapping[i];
          if (prevActionKey && (!updatedFeedback[prevActionKey] || updatedFeedback[prevActionKey].status !== TransactionStepStatus.completed)) {
            updatedFeedback[prevActionKey] = {
              label: isDeposit ? "Deposit" : "Withdraw",
              description: getStepDescription(i, 'completed', isDeposit),
              status: TransactionStepStatus.completed,
              txHash: updatedFeedback[prevActionKey]?.txHash || getStepTxHash(i, data)
            };
            console.log(`[UI Feedback] Marked step ${i} (${prevActionKey}) as completed`);
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
      
      console.log(`[UI Feedback] Updated step ${stepIndex} (${actionKey}) to ${stepStatus}`);
      
      // Persist to localStorage
      localStorage.setItem('amana_current_transaction_feedback', JSON.stringify(updatedFeedback));
      
      return updatedFeedback;
    });
  }

  function completeTransactionProcess(feedbackSnapshot: TransactionStepMessages) {
    setIsTransactionStarted(false);
    if (finishedTransaction) return;
    setIsTransactionProcessing(false);
    setLastTransactionStepFeedback(feedbackSnapshot);
    setFinishedTransaction(true);
    
    console.log('[Transaction Complete] Freezing feedback state:', feedbackSnapshot);
    setTransactionStepFeedback({});

    setTransactionCompleted(true);
    setInputBalance({
      value: 0,
      formatted: "0",
      formattedUSD: "0",
    });
    
    setTimeout(() => {
      localStorage.removeItem('amana_current_transaction_feedback');
      localStorage.removeItem('amana_transaction_progress');
      localStorage.removeItem('amana_sequence_progress');
    }, 1000);
  }

  // Simple button label management
  useEffect(() => {
    switch (action) {
      case Action.depositApprove:
        setLabel("Approve");
        break;
      case Action.deposit:
        setLabel("Deposit");
        break;
      case Action.withdraw:
        setLabel("Withdraw");
        break;
      default:
        break;
    }
  }, [action]);

  // Handle final action states (deposited, withdrew)
  useEffect(() => {
    if (action === Action.deposited || action === Action.withdrew) {
      trackEvent("Transaction Crosschain Complete", {
        vaultSymbol: vaultData.symbol,
        vault: vaultData.id,
        type: action === Action.deposited ? 'deposit' : 'withdraw'
      });
      
      const currentFeedback = { ...transactionStepFeedback };
      completeTransactionProcess(currentFeedback);
    }
  }, [action]);

  // Check for pending transactions on component mount
  useEffect(() => {
    const checkPendingTransactions = () => {
      ['pendingDepositTransaction', 'pendingWithdrawTransaction'].forEach(key => {
        const pendingTx = localStorage.getItem(key);
        if (pendingTx) {
          try {
            const { hash, txId, timestamp, type } = JSON.parse(pendingTx);
            
            if (Date.now() - timestamp < 20 * 60 * 1000) { // 20 minutes
              console.log(`[BlockPI] Resuming pending ${type} transaction:`, hash);
              setCrosschainInvestHash(hash);
              setcrossChainTxId(txId);
              
              const actionKey = type === 'deposit' ? Action.depositConfirmed : Action.withdrawconfirmed;
              const nextStep = actions.findIndex((el) => el === actionKey);
              if (nextStep >= 0) {
                setAction(actions[nextStep]);
                setStep(nextStep);
              }
            } else {
              console.log(`[BlockPI] Found stale ${type} transaction, removing`);
              localStorage.removeItem(key);
            }
          } catch (error) {
            console.error(`[BlockPI] Error parsing pending transaction:`, error);
            localStorage.removeItem(key);
          }
        }
      });
    };

    checkPendingTransactions();
  }, [actions]);

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
        isComponentActiveRef={isComponentActiveRef}
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
  isComponentActiveRef,
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
  isComponentActiveRef: React.MutableRefObject<boolean>;
}): JSX.Element {
  const activeAccount = useActiveAccount();
  const walletContext = useWallet();
  const { selectedChain } = useMultiChain();

  // Simplified feedback update for local transactions only
  function updateLocalTransactionFeedback(
    actionKey: Action,
    status: TransactionStepStatus,
    description: string,
    txHash?: string
  ) {
    console.log(`[Local Feedback] Updating ${actionKey} with status: ${status}`);
    setTransactionStepFeedback((prev) => ({
      ...prev,
      [actionKey]: {
        label: actionKey === Action.depositApprove ? "Approve" : 
               actionKey === Action.deposit ? "Deposit" : "Withdraw",
        description,
        status,
        txHash
      },
    }));
  }

  async function interactionPostHook(success: boolean) {
    if (success) {
      if (actions[step + 1] == Action.depositApproveConfirmed) {
        // Update approval feedback to completed before moving to next step
        updateLocalTransactionFeedback(
          Action.depositApprove,
          TransactionStepStatus.completed,
          "Approval transaction confirmed"
        );
        
        // Reset transaction processing state to allow next transaction
        setIsTransactionProcessing(false);
        
        const nextStep = step + 1;
        setAction(actions[nextStep]);
        setStep(nextStep);
        setTimeout(() => {
          setAction(actions[nextStep + 1]);
          setStep(nextStep + 1);
        }, 100);
      }
      if (action == Action.deposit && actions[step + 1] == Action.depositConfirmed) {
        // Update deposit feedback to completed before moving to next step
        updateLocalTransactionFeedback(
          Action.deposit,
          TransactionStepStatus.completed,
          "Local deposit transaction confirmed"
        );
        
        // Reset transaction processing state - BlockPI will take over
        setIsTransactionProcessing(false);
        
        const nextStep = step + 1;
        setAction(actions[nextStep]);
        setStep(nextStep);
      }
      if (action == Action.withdraw && actions[step + 1] == Action.withdrawconfirmed) {
        // Update withdraw feedback to completed before moving to next step
        updateLocalTransactionFeedback(
          Action.withdraw,
          TransactionStepStatus.completed,
          "Local withdraw transaction confirmed"
        );
        
        // Reset transaction processing state - BlockPI will take over
        setIsTransactionProcessing(false);
        
        const nextStep = step + 1;
        setAction(actions[nextStep]);
        setStep(nextStep);
      }
    } else {
      // Handle local transaction failures
      if (action == Action.depositApprove) {
        updateLocalTransactionFeedback(
          action,
          TransactionStepStatus.error,
          "Approval transaction failed, please try again"
        );
      }
      if (action == Action.deposit) {
        updateLocalTransactionFeedback(
          action,
          TransactionStepStatus.error,
          "Local transaction failed, please try again"
        );
      }
      if (action == Action.withdraw) {
        updateLocalTransactionFeedback(
          action,
          TransactionStepStatus.error,
          "Local transaction failed, please try again"
        );
      }
      
      // Reset transaction state to allow retry
      setIsTransactionProcessing(false);
      setIsTransactionStarted(false);
    }
  }

  const handleMainAction = async () => {
    if (isTransactionProcessing) return;
    setIsTransactionProcessing(true);
    
    // Ensure component is marked as active for new transactions
    isComponentActiveRef.current = true;
    
    if (action == Action.depositApprove) {
      trackEvent("Approve Clicked", {
        vaultSymbol: vaultData.symbol,
        token: inputToken.symbol,
      });
      updateLocalTransactionFeedback(
        action,
        TransactionStepStatus.processing,
        "Approval in progress"
      );
    } else {
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
      
      updateLocalTransactionFeedback(
        action,
        TransactionStepStatus.processing,
        description
      );
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
      
      updateLocalTransactionFeedback(
        action,
        TransactionStepStatus.processing,
        description
      );
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

  function handleDone() {
    console.log('[UI] handleDone called - clearing all transaction state');
    
    setLastTransactionStepFeedback({});
    setTransactionStepFeedback({});
    setFinishedTransaction(false);
    setTransactionCompleted(false);
    setIsTransactionProcessing(false);
    setIsTransactionStarted(false);
    setCrosschainInvestHash("");
    setcrossChainTxId("");
    setLabel("");
    
    // Clear localStorage items
    localStorage.removeItem('pendingDepositTransaction');
    localStorage.removeItem('pendingWithdrawTransaction');
    localStorage.removeItem('amana_current_transaction_feedback');
    localStorage.removeItem('amana_transaction_progress');
    localStorage.removeItem('amana_sequence_progress');
    localStorage.removeItem('amana_transaction_error');
    localStorage.removeItem('amana_current_route'); // Clear route tracking as well
    
    refreshBalance();
    console.log('[UI] All transaction state cleared');
  }

  return (
    <>
      {(
        (Number(inputBalance.formatted) > 0 && actions.length && !errorMessage) ||
        (crosschainInvestHash.length > 0 || isTransactionStarted || isTransactionProcessing) ||
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
                  const feedbackData = finishedTransaction ? lastTransactionStepFeedback : transactionStepFeedback;
                  
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
            (() => {
              const isDisabledByProcessing = isTransactionProcessing;
              const isDisabledByHash = crosschainInvestHash.length > 0 && !finishedTransaction;
              const isDisabled = isDisabledByProcessing || isDisabledByHash;
              
              if (isDisabled) {
                console.log(`[Button Disabled] Reasons:`, {
                  isTransactionProcessing,
                  crosschainInvestHashLength: crosschainInvestHash.length,
                  finishedTransaction,
                  disabledByProcessing: isDisabledByProcessing,
                  disabledByHash: isDisabledByHash,
                  action,
                  label
                });
              }
              
              return (
                <MainActionButton
                  disabled={isDisabled}
                  label={label}
                  handleClick={handleMainAction}
                />
              );
            })()
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
  console.log("inputToken in handleInteraction: ", inputToken.symbol, { action });
  
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