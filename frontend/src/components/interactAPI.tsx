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
  console.log("=== DEPOSIT TRANSACTION START ===");
  console.log("Active Chain ID:", activeChain.id);
  console.log("Vault Strategy Chain ID:", vaultData.protocol.chainId);
  console.log("Active Chain Name:", activeChain.name);
  
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

    console.log("=== DEPOSIT TRANSACTION RECEIPT RECEIVED ===");
    console.log("Receipt:", receipt);
    console.log("Receipt.transactionHash:", receipt.transactionHash);
    
    if (activeChain.id === CHAIN_ID.solana) {
      // Solana handling
      console.log("Solana transaction handling");
    } else {
      console.log("EVM transaction, waiting for receipt confirmation");
      const receiptObject = {
        transactionHash: receipt.transactionHash as `0x${string}`,
        client,
        chain: activeChain,
      };
      await waitForReceipt(receiptObject);
      console.log("Receipt confirmed");
    }

    const activeChainExplorerBaseUrl = CHAINS_EXPLORER_BASE_URL_MAINNET[activeChain.id] ?? "";
    setLastEventTxHash(`${activeChainExplorerBaseUrl}/tx/${receipt.transactionHash}`);
    console.log("Explorer URL set:", `${activeChainExplorerBaseUrl}/tx/${receipt.transactionHash}`);
    
    // Enhanced logic for determining transaction type and setting correct hash for BlockPI
    const isUserOnZetachain = isZetachain(activeChain.id);
    const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
    
    console.log("=== TRANSACTION TYPE DETECTION ===");
    console.log(`User on Zetachain: ${isUserOnZetachain}`);
    console.log(`Vault strategy on Zetachain: ${isVaultOnZetachain}`);
    console.log(`Active Chain ID: ${activeChain.id}`);
    console.log(`Vault Strategy Chain ID: ${vaultData.protocol.chainId}`);
    console.log(`Receipt hash: ${receipt.transactionHash}`);
    
    if (isUserOnZetachain && !isVaultOnZetachain) {
      // Type 2: Direct deposit from Zetachain to vault with non-Zetachain strategy
      // The receipt.transactionHash IS the localhash for BlockPI tracking
      console.log("=== TYPE 2 TRANSACTION DETECTED ===");
      console.log(`Setting localhash for BlockPI: ${receipt.transactionHash}`);
      console.log(`This should trigger BlockPI tracking once action becomes depositConfirmed`);
      setCrosschainInvestHash(receipt.transactionHash);
      console.log("setCrosschainInvestHash called with:", receipt.transactionHash);
    } else if (isUserOnZetachain && isVaultOnZetachain) {
      // Type 1: Direct deposit from Zetachain to vault with Zetachain strategy
      // No BlockPI tracking needed - direct transaction
      console.log("=== TYPE 1 TRANSACTION DETECTED ===");
      console.log(`Direct Zetachain transaction, no BlockPI tracking needed`);
      setCrosschainInvestHash(receipt.transactionHash);
      console.log("setCrosschainInvestHash called with:", receipt.transactionHash);
    } else if (!isUserOnZetachain) {
      // Type 3 & 4: Cross-chain deposits from non-Zetachain chains
      // The receipt.transactionHash is the localhash for BlockPI tracking
      console.log("=== TYPE 3/4 TRANSACTION DETECTED ===");
      console.log(`Cross-chain from ${activeChain.name}, setting localhash: ${receipt.transactionHash}`);
      setCrosschainInvestHash(receipt.transactionHash);
      console.log("setCrosschainInvestHash called with:", receipt.transactionHash);
    } else {
      // Fallback - set the hash anyway
      console.log("=== FALLBACK TRANSACTION ===");
      console.log(`Setting hash: ${receipt.transactionHash}`);
      setCrosschainInvestHash(receipt.transactionHash);
      console.log("setCrosschainInvestHash called with:", receipt.transactionHash);
    }

    console.log("=== DEPOSIT TRANSACTION RETURNING TRUE ===");
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
    
    // Enhanced logic for determining withdrawal transaction type and setting correct hash for BlockPI
    const isUserOnZetachain = isZetachain(activeChain.id);
    const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
    
    console.log(`[Withdrawal Type Detection] User on Zetachain: ${isUserOnZetachain}, Vault strategy on Zetachain: ${isVaultOnZetachain}`);
    
    if (isUserOnZetachain && !isVaultOnZetachain) {
      // Type 2: Direct withdrawal from Zetachain from vault with non-Zetachain strategy
      // The receipt.transactionHash IS the localhash for BlockPI tracking
      console.log(`[Type 2 Withdrawal] Setting localhash for BlockPI: ${receipt.transactionHash}`);
      setCrosschainInvestHash(receipt.transactionHash);
    } else if (isUserOnZetachain && isVaultOnZetachain) {
      // Type 1: Direct withdrawal from Zetachain from vault with Zetachain strategy
      // No BlockPI tracking needed - direct transaction
      console.log(`[Type 1 Withdrawal] Direct Zetachain transaction, no BlockPI tracking needed`);
      setCrosschainInvestHash(receipt.transactionHash);
    } else if (!isUserOnZetachain) {
      // Type 3 & 4: Cross-chain withdrawals from non-Zetachain chains
      // The receipt.transactionHash is the localhash for BlockPI tracking
      console.log(`[Type 3/4 Withdrawal] Cross-chain from ${activeChain.name}, setting localhash: ${receipt.transactionHash}`);
      setCrosschainInvestHash(receipt.transactionHash);
    } else {
      // Fallback - set the hash anyway
      setCrosschainInvestHash(receipt.transactionHash);
    }
    
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

  // Button label management based on current action
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
        // Keep existing label for other states
        break;
    }
  }, [action, setLabel]);

  // Add the function here so it has access to all the component state
  function completeTransactionProcess(feedbackSnapshot: TransactionStepMessages) {
    console.log('[Transaction Complete] Starting completion process');
    
    // Use direct implementation instead of TransactionStateManager
    const txType = isDeposit ? 'deposit' : 'withdrawal';
    console.log(`[Transaction Complete] Processing ${txType} completion`);
    
    // 1. Mark all steps as completed
    const actionMapping = isDeposit ? [
      Action.deposit,           // Step 0
      Action.depositConfirmed,  // Step 1
      Action.crosschainInvest,  // Step 2
      Action.FundsInvest,       // Step 3
      Action.deposited          // Step 4
    ] : [
      Action.withdraw,              // Step 0
      Action.withdrawconfirmed,     // Step 1
      Action.DivestSent,           // Step 2
      Action.FundsDivested,        // Step 3
      Action.ReturnFundsToUserSent, // Step 4
      Action.withdrew              // Step 5
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
    
    console.log(`[Transaction Complete] Marking all steps as completed`);
    
    // Update all steps to completed
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
    
    // 2. Set the final UI state
    const finalAction = isDeposit ? Action.deposited : Action.withdrew;
    
    console.log(`[Transaction Complete] Setting final action to ${finalAction}`);
    setAction(finalAction);
    
    // 3. Trigger the completed UI state with "Done" button
    setFinishedTransaction(true);
    
    // 4. Clear transaction state to enable new transactions
    setIsTransactionProcessing(false);
    setIsTransactionStarted(false);
    setCrosschainInvestHash("");
    setcrossChainTxId("");
    
    // 5. Save the final feedback state for display
    setLastTransactionStepFeedback(feedbackSnapshot);
    
    // 6. Track completion event
    trackEvent("Transaction Crosschain Complete", {
      vaultSymbol: vaultData.symbol,
      vault: vaultData.id,
      type: txType
    });
  }

  useEffect(() => {
    setAction(_action);
    setStep(0);
    
    // Reset transaction processing states when actions change (new vault)
    setIsTransactionProcessing(false);
    setIsTransactionStarted(false);
    setFinishedTransaction(false);
  }, [actions]);

  // Replace the entire BlockPI useEffect with a clean implementation
  useEffect(() => {
    console.log("=== BLOCKPI EFFECT TRIGGERED ===");
    console.log("crosschainInvestHash:", crosschainInvestHash);
    console.log("action:", action);
    console.log("action enum value:", Action[action] || "undefined");
    
    // CRITICAL: Don't proceed if action is undefined
    if (action === undefined) {
      console.log("=== ACTION IS UNDEFINED, SKIPPING BLOCKPI TRACKING ===");
      return;
    }
    
    let cancelled = false;
    
    const trackTransactionSequence = async () => {
      console.log("=== TRACK TRANSACTION SEQUENCE CALLED ===");
      
      if (!crosschainInvestHash || !action) {
        console.log("=== EARLY RETURN - MISSING HASH OR ACTION ===");
        return;
      }
      
      // Only start BlockPI tracking for confirmed transactions
      if (action !== Action.depositConfirmed && action !== Action.withdrawconfirmed) {
        console.log("=== SKIPPING TRACKING - WRONG ACTION ===");
        return;
      }
      
      console.log("=== PROCEEDING WITH BLOCKPI TRACKING ===");
      
      // Check if component is still active
      if (!isComponentActiveRef.current) {
        console.log('[BlockPI] Component inactive, skipping tracking');
        return;
      }
      
      // Determine if this is a Type 1 transaction (no cross-chain needed)
      const isUserOnZetachain = isZetachain(activeChain.id);
      const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
      
      console.log('[BlockPI Debug] Transaction type analysis:', {
        isUserOnZetachain,
        isVaultOnZetachain,
        activeChainId: activeChain.id,
        vaultChainId: vaultData.protocol.chainId
      });
      
      if (isUserOnZetachain && isVaultOnZetachain) {
        console.log('[BlockPI] Type 1 transaction detected - no cross-chain tracking needed');
        // For Type 1 transactions, move directly to final step
        const transactionType: 'deposit' | 'withdrawal' = action === Action.depositConfirmed ? 'deposit' : 'withdrawal';
        setTimeout(() => {
          if (isComponentActiveRef.current) {
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
        }, 1000);
        return;
      }
      
      const transactionType: 'deposit' | 'withdrawal' = action === Action.depositConfirmed ? 'deposit' : 'withdrawal';
      
      console.log('[BlockPI Debug] Proceeding with BlockPI tracking for:', {
        transactionType,
        hash: crosschainInvestHash
      });
      
              try {
          console.log(`[BlockPI] Starting ${transactionType} tracking for ${crosschainInvestHash}`);
          
          // CRITICAL: Store transaction details in window object to preserve across React renders
          if (typeof window !== 'undefined') {
            // @ts-ignore - Adding custom property to window
            window.__blockpiActiveTransaction = {
              hash: crosschainInvestHash,
              type: transactionType,
              timestamp: Date.now()
            };
          }
          
          // Create step callback function with timestamp logging
        const stepUpdateCallback = (stepIndex: number, status: 'pending' | 'processing' | 'completed' | 'error', data?: any) => {
          if (cancelled || !isComponentActiveRef.current) {
            console.log(`[BlockPI] Callback cancelled`);
            return;
          }
          
          console.log(`[BlockPI] Step update callback: stepIndex=${stepIndex}, status=${status}, timestamp=${Date.now()}`);
          
          // Handle step updates directly
          if (typeof stepIndex !== 'number' || stepIndex < 0) {
            console.error(`[UI Safety] Invalid step index: ${stepIndex}`);
            return;
          }
          
          // Map BlockPI steps to Action enum
          const actionMapping = transactionType === 'deposit' ? [
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
          
          // Get action key for this step
          if (stepIndex >= actionMapping.length) {
            console.error(`[UI Safety] Step index ${stepIndex} out of bounds for action mapping`);
            return;
          }
          
          const actionKey = actionMapping[stepIndex];
          if (!actionKey) {
            console.error(`[UI Safety] No action mapping for step ${stepIndex}`);
            return;
          }
          
          // Get step description
          const stepDescriptions = transactionType === 'deposit' ? [
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
          
          const description = `${stepDescriptions[stepIndex] || `Step ${stepIndex + 1}`} ${statusText}`;
          
          // Get transaction hash if available
          let txHash: string | undefined = undefined;
          if (data) {
            if (stepIndex === 0) {
              txHash = data.localHash || data.hash;
            } else if (data.cctxIndex) {
              txHash = `${process.env.NEXT_PUBLIC_BLOCKPI_URL}/cctx/${data.cctxIndex}`;
            } else if (data.hash) {
              txHash = data.hash;
            }
          }
          
          // Get transaction status
          let stepStatus: TransactionStepStatus;
          if (status === 'completed') {
            stepStatus = TransactionStepStatus.completed;
          } else if (status === 'error') {
            stepStatus = TransactionStepStatus.error;
          } else if (status === 'processing') {
            stepStatus = TransactionStepStatus.processing;
          } else {
            stepStatus = TransactionStepStatus.pending;
          }
          
          // Update UI feedback without using localStorage
          setTransactionStepFeedback(prev => {
            const updatedFeedback = { ...prev };
            
            // Always mark all previous steps as completed
            if ((status === 'completed' || status === 'processing') && stepIndex > 0) {
              for (let i = 0; i < stepIndex; i++) {
                const prevActionKey = actionMapping[i];
                if (prevActionKey) {
                  updatedFeedback[prevActionKey] = {
                    label: transactionType === 'deposit' ? "Deposit" : "Withdraw",
                    description: `${stepDescriptions[i] || `Step ${i + 1}`} completed`,
                    status: TransactionStepStatus.completed,
                    txHash: updatedFeedback[prevActionKey]?.txHash
                  };
                }
              }
            }
            
            // Update current step
            updatedFeedback[actionKey] = {
              label: transactionType === 'deposit' ? "Deposit" : "Withdraw",
              description,
              status: stepStatus,
              txHash
            };
            
            return updatedFeedback;
          });
          
          // Update UI state if necessary
          if ((status === 'completed' || status === 'processing') && stepIndex > step) {
            console.log(`[UI Safety] Advancing UI from step ${step} to step ${stepIndex}`);
            setStep(stepIndex);
            setAction(actionMapping[stepIndex]);
          }
        };
        
        // IMPORTANT: Force a fresh API call by adding a timestamp parameter
        const progress = await blockpi.trackTransactionSequence(
          crosschainInvestHash,
          transactionType,
          stepUpdateCallback,
          Date.now() // Pass timestamp to force fresh API call
        );
        
        // Handle completion
        if (progress.isComplete) {
          console.log(`[BlockPI] ${transactionType} sequence completed successfully`);
          
          const actionMapping = transactionType === 'deposit' ? [
            Action.deposit,
            Action.depositConfirmed,
            Action.crosschainInvest,
            Action.FundsInvest,
            Action.deposited
          ] : [
            Action.withdraw,
            Action.withdrawconfirmed,
            Action.DivestSent,
            Action.FundsDivested,
            Action.ReturnFundsToUserSent,
            Action.withdrew
          ];
          
          const stepDescriptions = transactionType === 'deposit' ? [
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
          
          console.log(`[BlockPI Completion] Updating all steps to completed`);
          
          // Update all steps to completed using functional update
          setTransactionStepFeedback(prev => {
            const updatedFeedback = { ...prev };
            
            actionMapping.forEach((actionKey, index) => {
              if (actionKey) {
                updatedFeedback[actionKey] = {
                  label: transactionType === 'deposit' ? "Deposit" : "Withdraw",
                  description: stepDescriptions[index],
                  status: TransactionStepStatus.completed,
                  txHash: updatedFeedback[actionKey]?.txHash
                };
              }
            });
            
            // Also save the completed state for the Done button
            setLastTransactionStepFeedback(updatedFeedback);
            
            return updatedFeedback;
          });
          
          // Set final action and completion state
          const finalAction = transactionType === 'deposit' ? Action.deposited : Action.withdrew;
          console.log(`[BlockPI Completion] Setting final action to ${finalAction}`);
          setAction(finalAction);
          
          // Move to completion state
          console.log(`[BlockPI Completion] Setting completion state`);
          setFinishedTransaction(true);
          setIsTransactionProcessing(false);
          setIsTransactionStarted(false);
          
          // Track completion
          trackEvent("Transaction Crosschain Complete", {
            vaultSymbol: vaultData.symbol,
            vault: vaultData.id,
            type: transactionType
          });
        } else if (progress.error) {
          console.error(`[BlockPI] ${transactionType} sequence failed:`, progress.error);
          
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
      } catch (error) {
        console.error(`[BlockPI] Error in ${transactionType} sequence tracking:`, error);
      }
    };

    // CRITICAL FIX: For Type 2 transactions, check action numeric value as well
    if (crosschainInvestHash && 
        (action === Action.depositConfirmed || 
         action === Action.withdrawconfirmed || 
         action === 10 || // Action.depositConfirmed numeric value
         action === 16    // Action.withdrawconfirmed numeric value
        )) {
      console.log("=== TRIGGERING TRACK TRANSACTION SEQUENCE ===");
      console.log("Current action value:", action);
      console.log("Action.depositConfirmed value:", Action.depositConfirmed);
      
      // Use setTimeout to ensure this runs after all state updates are processed
      setTimeout(() => {
        if (crosschainInvestHash) {
          console.log("=== TRANSACTION SEQUENCE STARTING ===");
          trackTransactionSequence();
        }
      }, 100);
    }

    return () => {
      cancelled = true;
    };
  // CRITICAL FIX: Add dependency on vaultData to prevent stale captures
  }, [crosschainInvestHash, action, blockpi, vaultData.id, vaultData.protocol.chainId, activeChain.id]);

  // No longer restoring transaction state from localStorage
  // This ensures we always start fresh and rely only on API responses

  // No longer attempting to restore state from localStorage
  // Always starting transactions fresh with direct API calls

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
    
    setTransactionStepFeedback((prev) => {
      // CRITICAL FIX: Preserve existing completed steps
      const updated = { ...prev };
      
      // Only update the specific action, don't overwrite the entire state
      updated[actionKey] = {
        label: actionKey === Action.depositApprove ? "Approve" : 
               actionKey === Action.deposit ? "Deposit" : "Withdraw",
        description,
        status,
        txHash: txHash || updated[actionKey]?.txHash // Preserve existing txHash if none provided
      };
      
      console.log(`[Local Feedback] Updated ${actionKey} while preserving other steps:`, updated);
      return updated;
    });
  }

  async function interactionPostHook(success: boolean) {
    console.log("=== INTERACTION POST HOOK CALLED ===");
    console.log("Success:", success);
    console.log("Current action:", action);
    console.log("Current step:", step);
    console.log("Actions array:", actions);
    
    if (success) {
      console.log("=== SUCCESS BRANCH ===");
      
      if (actions[step + 1] == Action.depositApproveConfirmed) {
        console.log("=== APPROVAL CONFIRMED BRANCH ===");
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
        console.log("=== DEPOSIT TO DEPOSIT CONFIRMED TRANSITION ===");
        console.log('Current step:', step, 'Next step:', step + 1);
        console.log('Next action should be:', actions[step + 1]);
        
        // Update deposit feedback to completed before moving to next step
        const isUserOnZetachain = isZetachain(activeChain.id);
        const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
        
        let successMessage;
        if (isUserOnZetachain && !isVaultOnZetachain) {
          // Type 2: Direct deposit from Zetachain to vault with non-Zetachain strategy
          successMessage = "Initial deposit transaction on Zetachain completed";
          console.log('[Action Transition] Type 2 detected - BlockPI should start after action change');
        } else if (isUserOnZetachain && isVaultOnZetachain) {
          // Type 1: Direct deposit from Zetachain to vault with Zetachain strategy
          successMessage = "Deposit transaction completed";
          console.log('[Action Transition] Type 1 detected - no BlockPI needed');
        } else {
          // Type 3 & 4: Cross-chain deposits
          successMessage = "Local deposit transaction confirmed";
          console.log('[Action Transition] Type 3/4 detected - BlockPI should start after action change');
        }
        
        updateLocalTransactionFeedback(
          Action.deposit,
          TransactionStepStatus.completed,
          successMessage
        );
        
        // Reset transaction processing state - BlockPI will take over
        setIsTransactionProcessing(false);
        console.log("Set isTransactionProcessing to false");
        
        const nextStep = step + 1;
        console.log('Setting action to:', actions[nextStep], 'and step to:', nextStep);
        
        // CRITICAL FIX: Ensure the next action exists before updating state
        if (actions[nextStep] === undefined) {
          console.error(`CRITICAL ERROR: Action at index ${nextStep} is undefined. actions array:`, actions);
          return; // Don't update state if the next action is undefined
        }
        
        // Set both state updates in a single render cycle to prevent inconsistency
        setTimeout(() => {
          console.log(`SAFE UPDATE: Setting action to ${actions[nextStep]} and step to ${nextStep}`);
          setAction(actions[nextStep]);
          setStep(nextStep);
          console.log("Action and step updated in sync - this should trigger BlockPI effect");
        }, 50);
      }
      if (action == Action.withdraw && actions[step + 1] == Action.withdrawconfirmed) {
        // Update withdraw feedback to completed before moving to next step
        const isUserOnZetachain = isZetachain(activeChain.id);
        const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
        
        let successMessage;
        if (isUserOnZetachain && !isVaultOnZetachain) {
          // Type 2: Direct withdrawal from Zetachain from vault with non-Zetachain strategy
          successMessage = "Initial withdraw transaction on Zetachain completed";
        } else if (isUserOnZetachain && isVaultOnZetachain) {
          // Type 1: Direct withdrawal from Zetachain from vault with Zetachain strategy
          successMessage = "Withdraw transaction completed";
        } else {
          // Type 3 & 4: Cross-chain withdrawals
          successMessage = "Local withdraw transaction confirmed";
        }
        
        updateLocalTransactionFeedback(
          Action.withdraw,
          TransactionStepStatus.completed,
          successMessage
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
    console.log("=== HANDLE MAIN ACTION CALLED ===");
    console.log("Current action:", action);
    console.log("isTransactionProcessing:", isTransactionProcessing);
    
    if (isTransactionProcessing) {
      console.log("=== EARLY RETURN - ALREADY PROCESSING ===");
      return;
    }
    
    setIsTransactionProcessing(true);
    console.log("Set isTransactionProcessing to true");
    
    // Ensure component is marked as active for new transactions
    isComponentActiveRef.current = true;
    console.log("Set component as active");
    
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
      
      // Determine transaction type for better UI feedback
      const isUserOnZetachain = isZetachain(activeChain.id);
      const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
      
      let description;
      if (isUserOnZetachain && !isVaultOnZetachain) {
        // Type 2: Direct deposit from Zetachain to vault with non-Zetachain strategy
        description = "Initial deposit transaction on Zetachain in progress";
      } else if (isUserOnZetachain && isVaultOnZetachain) {
        // Type 1: Direct deposit from Zetachain to vault with Zetachain strategy
        description = "Deposit in progress";
      } else {
        // Type 3 & 4: Cross-chain deposits
        description = `Initial deposit transaction on ${activeChain.name} in progress`;
      }
      
      updateLocalTransactionFeedback(
        action,
        TransactionStepStatus.processing,
        description
      );
    }

    if (action == Action.withdraw) {
      // Determine withdrawal transaction type for better UI feedback
      const isUserOnZetachain = isZetachain(activeChain.id);
      const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
      
      let description;
      if (isUserOnZetachain && !isVaultOnZetachain) {
        // Type 2: Direct withdrawal from Zetachain from vault with non-Zetachain strategy
        description = "Initial withdraw transaction on Zetachain in progress";
      } else if (isUserOnZetachain && isVaultOnZetachain) {
        // Type 1: Direct withdrawal from Zetachain from vault with Zetachain strategy
        description = `Withdrawing ${inputBalance.formatted} ${vaultData.inputToken.symbol}`;
      } else {
        // Type 3 & 4: Cross-chain withdrawals
        description = `Initial withdraw transaction on ${activeChain.name} in progress`;
      }
      
      updateLocalTransactionFeedback(
        action,
        TransactionStepStatus.processing,
        description
      );
    }

    console.log("=== CALLING HANDLE INTERACTION ===");
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
    
    console.log("=== HANDLE INTERACTION COMPLETED ===");
    console.log("Success result:", success);
    
    console.log("=== CALLING INTERACTION POST HOOK ===");
    await interactionPostHook(!!success);
  };

  function handleDone() {
    console.log('[UI] handleDone called - clearing all transaction state');
    
    // Mark component as inactive to prevent any ongoing BlockPI updates
    isComponentActiveRef.current = false;
    
    // Clear component state
    setLastTransactionStepFeedback({});
    setTransactionStepFeedback({});
    setFinishedTransaction(false);
    setTransactionCompleted(false);
    setIsTransactionProcessing(false);
    setIsTransactionStarted(false);
    setCrosschainInvestHash("");
    setcrossChainTxId("");
    setLabel("");
    
    // Reactivate component after clearing
    setTimeout(() => {
      isComponentActiveRef.current = true;
    }, 100);
    
    // Refresh balance
    refreshBalance();
    console.log('[UI] All transaction state cleared, component reactivated');
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