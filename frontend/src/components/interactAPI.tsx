import { useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  Balance,
  Token,
  TransactionStepFeedback,
  TransactionStepMessages,
  TransactionStepStatus,
  VaultData,
} from "@/types/types";
import {
  Approvedeposit,
  executeDeposit,
  executeWithdrawal,
  getAssetsFromShares,
} from "@/actions/actions";
import { Address, Chain, waitForReceipt } from "thirdweb";
import { Account } from "thirdweb/wallets";
import MainActionButton from "@/components/button/MainActionButton";
import { client } from "@/utils/client";
import { MoonLoader } from "react-spinners";
import { AiOutlineCheck, AiOutlineExclamation } from "react-icons/ai";
import { isZetachain } from "@/utils/utils";
import {
  CHAIN_ID,
  CHAINS_EXPLORER_BASE_URL_MAINNET,
} from "@/constants/chainConfig";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useActiveAccount } from "thirdweb/react";
import {
  useWallet,
  WalletContextState,
} from "@solana/wallet-adapter-react";
import { trackEvent } from "@/utils/trackEvent";
import Blockpi from "@/service/blockpi";
import { showWarningToast } from "@/toasts";

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
    
    const receipt = await executeDeposit(
      vaultData,
      inputToken,
      walletContext,
      activeAccount,
      activeChain,
      depositAmount,
      setcrossChainTxId
    );

    try {
      trackEvent("Deposit Initiated", {
        vaultSymbol: vaultData.symbol,
        vault: vaultData.id.toString(),
        amount: depositAmount.toString(),
        inputToken: inputToken.symbol,
        amountUSD: inputBalance.formattedUSD || (Number(inputBalance.formatted) * (inputToken.price || 0)).toFixed(2),
        user: activeChain.id === CHAIN_ID.solana 
          ? walletContext.publicKey?.toBase58() 
          : activeAccount.address,
        chain: activeChain.id,
      });
    } catch (analyticsError) {
    }
    
    if (activeChain.id === CHAIN_ID.solana) {
    } else {
      const receiptObject = {
        transactionHash: receipt.transactionHash as `0x${string}`,
        client,
        chain: activeChain,
      };
      await waitForReceipt(receiptObject);
    }

    const activeChainExplorerBaseUrl = CHAINS_EXPLORER_BASE_URL_MAINNET[activeChain.id] ?? "";
    const explorerUrl = `${activeChainExplorerBaseUrl}/tx/${receipt.transactionHash}`;
    setLastEventTxHash(explorerUrl);
    
    const isUserOnZetachain = isZetachain(activeChain.id);
    const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
    
    if (isUserOnZetachain && !isVaultOnZetachain) {
      setCrosschainInvestHash(receipt.transactionHash);
    } else if (isUserOnZetachain && isVaultOnZetachain) {
      setCrosschainInvestHash(receipt.transactionHash);
    } else if (!isUserOnZetachain) {
      setCrosschainInvestHash(receipt.transactionHash);
    } else {
      setCrosschainInvestHash(receipt.transactionHash);
    }

    return true;
  } catch (error: any) {
    try {
      if (!error.message.includes("User denied transaction")) {
        trackEvent("Deposit Failed", {
          vaultSymbol: vaultData.symbol,
          vault: vaultData.id.toString(),
          amount: inputBalance.value.toString(),
          amountUSD: inputBalance.formattedUSD || (Number(inputBalance.formatted) * (inputToken.price || 0)).toFixed(2),
        });
      }
    } catch (analyticsError) {
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
    const withdrawAssetAmount = inputBalance.value;
    const withdrawAmountFormatted = Number(withdrawAssetAmount) / 10 ** withdrawToken.decimals;
    const amountUSD = (withdrawAmountFormatted * (withdrawToken.price || 0)).toFixed(2);

    const receipt = await executeWithdrawal(
      vaultData,
      walletContext,
      activeAccount,
      activeChain,
      withdrawAssetAmount,
      withdrawToken.address as Address,
      withdrawZRC20 as Token,
      setcrossChainTxId
    );
    
    if (activeChain.id === CHAIN_ID.solana) {
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
    
    const isUserOnZetachain = isZetachain(activeChain.id);
    const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
    
    if (isUserOnZetachain && !isVaultOnZetachain) {
      setCrosschainInvestHash(receipt.transactionHash);
    } else if (isUserOnZetachain && isVaultOnZetachain) {
      setCrosschainInvestHash(receipt.transactionHash);
    } else if (!isUserOnZetachain) {
      setCrosschainInvestHash(receipt.transactionHash);
    } else {
      setCrosschainInvestHash(receipt.transactionHash);
    }
    
    return true;
  } catch (error) {
    try {
      trackEvent("Withdraw Failed", {
        vault: vaultData.id.toString(),
        vaultSymbol: vaultData.symbol,
      });
    } catch (analyticsError) {
    }
    
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
  
  const [crosschainInvestHash, setCrosschainInvestHash] = useState("");
  const [crossChainTxId, setcrossChainTxId] = useState<string>("");
  const [isTransactionStarted, setIsTransactionStarted] = useState(false);
  const [isTransactionProcessing, setIsTransactionProcessing] = useState(false);
  const [finishedTransaction, setFinishedTransaction] = useState(false);
  const [lastEventTxHash, setLastEventTxHash] = useState("");
  
  const [transactionStepFeedback, setTransactionStepFeedback] = useState<TransactionStepMessages>({});
  const [lastTransactionStepFeedback, setLastTransactionStepFeedback] = useState<TransactionStepMessages>({});
  
  const blockpi = useMemo(() => new Blockpi(), []);
  
  const isComponentActiveRef = useRef(true);
  
  const isTrackingActiveRef = useRef(false);

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
  }, [action, setLabel]);

  function completeTransactionProcess(feedbackSnapshot: TransactionStepMessages) {
    const txType = isDeposit ? 'deposit' : 'withdrawal';
    
    const isUserOnZetachain = isZetachain(activeChain.id);
    const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
    const isType2Transaction = isUserOnZetachain && !isVaultOnZetachain;
    
    let actionMapping, stepDescriptions;
    
    if (isType2Transaction) {
      actionMapping = isDeposit ? [
        Action.deposit,           
        Action.crosschainInvest,  
        Action.deposited          
      ] : [
        Action.withdraw,          
        Action.DivestSent,        
        Action.withdrew           
      ];

      stepDescriptions = isDeposit ? [
        'Initial deposit transaction on zetachain completed',
        'Cross chain transfer and investment of funds completed',
        'Final confirmation completed, shares issued by vault'
      ] : [
        'Initial withdraw transaction on zetachain completed',
        'Divestment of funds from strategy completed',
        'Withdrawal confirmation completed, funds returned'
      ];
    } else {
      actionMapping = isDeposit ? [
        Action.deposit,           
        Action.depositConfirmed,  
        Action.crosschainInvest,  
        Action.FundsInvest,       
        Action.ReturnFundsToUserSent, 
        Action.FundsReturned,     
        Action.deposited          
      ] : [
        Action.withdraw,              
        Action.withdrawconfirmed,     
        Action.DivestSent,           
        Action.FundsDivested,        
        Action.ReturnFundsToUserSent, 
        Action.withdrew              
      ];

      stepDescriptions = isDeposit ? [
        'Initial deposit transaction on local chain completed',
        'Cross chain transfer of funds to vault completed',
        'Transfer of funds from vault to strategy completed',
        'Investment of funds into yield source completed',
        'Confirmation message from strategy to vault completed',
        'Minting of shares on vault completed'
      ] : [
        'Initial withdraw transaction on local chain completed',
        'Cross chain request to vault completed',
        'Request from vault to strategy completed',
        'Divestment of funds from yield source completed',
        'Return of funds from strategy to vault completed',
        'Return of funds from vault to user completed'
      ];
    }
    
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
    
    const finalAction = isDeposit ? Action.deposited : Action.withdrew;
    
    setAction(finalAction);
    
    setFinishedTransaction(true);
    
    setIsTransactionProcessing(false);
    setIsTransactionStarted(false);
    setCrosschainInvestHash("");
    setcrossChainTxId("");
    
    setLastTransactionStepFeedback(feedbackSnapshot);
    
    trackEvent("Transaction Crosschain Complete", {
      vaultSymbol: vaultData.symbol,
      vault: vaultData.id,
      type: txType
    });
  }

  useEffect(() => {
    if (!isTransactionStarted && !isTransactionProcessing && !finishedTransaction) {
      setAction(_action);
      setStep(0);
    }
    
    if (!isTransactionStarted && !isTransactionProcessing && !finishedTransaction) {
      setIsTransactionProcessing(false);
      setIsTransactionStarted(false);
    }
    
    const hasCompletedTransactionSteps = Object.keys(transactionStepFeedback).length > 0 || Object.keys(lastTransactionStepFeedback).length > 0;
    
    if (!finishedTransaction && !hasCompletedTransactionSteps) {
      setFinishedTransaction(false);
    }
  }, [actions]);

  useEffect(() => {
    if (action === undefined || finishedTransaction || !crosschainInvestHash) {
      return;
    }
    
    if (isTrackingActiveRef.current) {
      return;
    }
    
    const isDepositConfirmed = action === Action.depositConfirmed || action === Action.deposit;
    const isWithdrawConfirmed = action === Action.withdrawconfirmed || action === Action.withdraw;
    
    if (!isDepositConfirmed && !isWithdrawConfirmed) {
      return;
    }
    
    const transactionType: 'deposit' | 'withdrawal' = isDepositConfirmed ? 'deposit' : 'withdrawal';
    const isUserOnZetachain = isZetachain(activeChain.id);
    const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
    const isType2 = isUserOnZetachain && !isVaultOnZetachain;
    
    if (isUserOnZetachain && isVaultOnZetachain) {
      setTimeout(() => {
        const finalAction = transactionType === 'deposit' ? Action.deposited : Action.withdrew;
        const nextStep = actions.findIndex(el => el === finalAction);
        if (nextStep >= 0) {
          setAction(finalAction);
          setStep(nextStep);
          setFinishedTransaction(true);
          
          setTransactionCompleted(true);
          
          setTimeout(() => {
            refreshBalance();
          }, 2000);
        }
      }, 1000);
      return;
    }
    
    const trackTransaction = async () => {
      try {
        isTrackingActiveRef.current = true;
        
        const actionMapping = isType2 
          ? (transactionType === 'deposit' 
              ? [Action.deposit, Action.crosschainInvest, Action.deposited]
              : [Action.withdraw, Action.DivestSent, Action.withdrew])
          : (transactionType === 'deposit' 
              ? [Action.deposit, Action.depositConfirmed, Action.crosschainInvest, Action.FundsInvest, Action.ReturnFundsToUserSent, Action.FundsReturned, Action.deposited]
              : [Action.withdraw, Action.withdrawconfirmed, Action.DivestSent, Action.FundsDivested, Action.ReturnFundsToUserSent, Action.withdrew]);
        
        const onStepComplete = (stepIndex: number, stepData: any) => {
          const actionKey = actionMapping[stepIndex];
          if (!actionKey) return;
          
          setTransactionStepFeedback(prev => ({
            ...prev,
            [actionKey]: {
              label: transactionType === 'deposit' ? "Deposit" : "Withdraw",
              description: stepData.description,
              status: stepData.status === 'completed' ? TransactionStepStatus.completed :
                     stepData.status === 'error' ? TransactionStepStatus.error :
                     TransactionStepStatus.processing,
              txHash: stepData.txHash,
              isWaitingTooLong: stepData.isWaitingTooLong
            }
          }));
          
          if (stepData.status === 'completed' && stepIndex < actionMapping.length) {
            setStep(stepIndex);
          }
        };
        
        const result = await blockpi.trackTransactionSequenceWithProgress(
          crosschainInvestHash,
          transactionType,
          onStepComplete,
          { isType2, totalSteps: isType2 ? 3 : (transactionType === 'deposit' ? 6 : 6) },
          activeChain.id,
          vaultData.protocol.chainId
        );
        
        if (result.success) {
          const finalAction = transactionType === 'deposit' ? Action.deposited : Action.withdrew;
          
          setAction(finalAction);
          setStep(actionMapping.length - 1);
          
          setTransactionStepFeedback(currentSteps => {
            setLastTransactionStepFeedback(currentSteps);
            return currentSteps;
          });
          
          setFinishedTransaction(true);
          setIsTransactionProcessing(false);
          
          setTransactionCompleted(true);
          
          setTimeout(() => {
            refreshBalance();
          }, 2000);
          
          trackEvent("Transaction Crosschain Complete", {
            vaultSymbol: vaultData.symbol,
            vault: vaultData.id,
            type: transactionType
          });
        } else {
          setTransactionStepFeedback(currentSteps => {
            setLastTransactionStepFeedback(currentSteps);
            return currentSteps;
          });
          
          setFinishedTransaction(true);
          setIsTransactionProcessing(false);
          setIsTransactionStarted(false);
        }
        
      } catch (error) {
        setIsTransactionProcessing(false);
        setIsTransactionStarted(false);
      } finally {
        isTrackingActiveRef.current = false;
      }
    };
    
    const timeoutId = setTimeout(trackTransaction, 100);
    
    return () => {
      clearTimeout(timeoutId);
      isTrackingActiveRef.current = false;
    };
  }, [crosschainInvestHash, action, finishedTransaction]);

  useEffect(() => {
    return () => {
      isComponentActiveRef.current = false;
    };
  }, []);

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
        isTrackingActiveRef={isTrackingActiveRef}
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
  isTrackingActiveRef,
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
  isTrackingActiveRef: React.MutableRefObject<boolean>;
}): JSX.Element {
  const activeAccount = useActiveAccount();
  const walletContext = useWallet();

  function updateLocalTransactionFeedback(
    actionKey: Action,
    status: TransactionStepStatus,
    description: string,
    txHash?: string
  ) {
    setTransactionStepFeedback((prev) => {
      const updated = { ...prev };
      
      updated[actionKey] = {
        label: actionKey === Action.depositApprove ? "Approve" : 
               actionKey === Action.deposit ? "Deposit" : "Withdraw",
        description,
        status,
        txHash: txHash || updated[actionKey]?.txHash
      };
      
      return updated;
    });
  }

  async function interactionPostHook(success: boolean) {
    if (success) {
      if (actions[step + 1] == Action.depositApproveConfirmed) {
        updateLocalTransactionFeedback(
          Action.depositApprove,
          TransactionStepStatus.completed,
          "Approval transaction confirmed"
        );
        
        setIsTransactionProcessing(false);
        
        const nextStep = step + 1;
        setAction(actions[nextStep]);
        setStep(nextStep);
        setTimeout(() => {
          setAction(actions[nextStep + 1]);
          setStep(nextStep + 1);
        }, 100);
      }
      
      const isDepositFlow = action == Action.deposit;
      const hasDepositConfirmed = actions[step + 1] == Action.depositConfirmed;
      const isType2Flow = isDepositFlow && !hasDepositConfirmed;
      
      if (isDepositFlow && (hasDepositConfirmed || isType2Flow)) {
        const isUserOnZetachain = isZetachain(activeChain.id);
        const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
        
        let successMessage;
        if (isUserOnZetachain && !isVaultOnZetachain) {
          successMessage = "Initial deposit transaction on Zetachain completed";
        } else if (isUserOnZetachain && isVaultOnZetachain) {
          successMessage = "Deposit transaction completed";
        } else {
          const chainName = activeChain.name || 'local chain';
          successMessage = `Initial deposit transaction on ${chainName} completed`;
        }
        
        updateLocalTransactionFeedback(
          Action.deposit,
          TransactionStepStatus.completed,
          successMessage,
          lastEventTxHash
        );
        
        setIsTransactionProcessing(false);
        
        if (hasDepositConfirmed) {
          const nextStep = step + 1;
          
          if (actions[nextStep] === undefined) {
            return;
          }
          
          setTimeout(() => {
            setAction(actions[nextStep]);
            setStep(nextStep);
          }, 50);
        } else if (isType2Flow) {
          setTimeout(() => {
            setAction(Action.depositConfirmed);
          }, 50);
        }
      }
      
      if (action == Action.withdraw && actions[step + 1] == Action.withdrawconfirmed) {
        const isUserOnZetachain = isZetachain(activeChain.id);
        const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
        
        let successMessage;
        if (isUserOnZetachain && !isVaultOnZetachain) {
          successMessage = "Initial withdraw transaction on Zetachain completed";
        } else if (isUserOnZetachain && isVaultOnZetachain) {
          successMessage = "Withdraw transaction completed";
        } else {
          const chainName = activeChain.name || 'local chain';
          successMessage = `Initial withdraw transaction on ${chainName} completed`;
        }
        
        updateLocalTransactionFeedback(
          Action.withdraw,
          TransactionStepStatus.completed,
          successMessage,
          lastEventTxHash
        );
        
        setIsTransactionProcessing(false);
        
        const nextStep = step + 1;
        setAction(actions[nextStep]);
        setStep(nextStep);
      }
      
    } else {
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
      
      setIsTransactionProcessing(false);
      setIsTransactionStarted(false);
    }
  }

  const handleMainAction = async () => {
    if (isTransactionProcessing) {
      return;
    }
    
    setIsTransactionProcessing(true);
    
    isComponentActiveRef.current = true;
    
    if (action === Action.deposit || action === Action.withdraw) {
      showWarningToast("📌 Please stay on this page to monitor progress across all networks!");
    }
    
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
      
      const isUserOnZetachain = isZetachain(activeChain.id);
      const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
      
      let description;
      if (isUserOnZetachain && !isVaultOnZetachain) {
        description = "Initial deposit transaction on Zetachain in progress";
      } else if (isUserOnZetachain && isVaultOnZetachain) {
        description = "Deposit in progress";
      } else {
        description = `Initial deposit transaction on ${activeChain.name} in progress`;
      }
      
      updateLocalTransactionFeedback(
        action,
        TransactionStepStatus.processing,
        description
      );
    }

    if (action == Action.withdraw) {
      const isUserOnZetachain = isZetachain(activeChain.id);
      const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
      
      let description;
      if (isUserOnZetachain && !isVaultOnZetachain) {
        description = "Initial withdraw transaction on zetachain in progress";
      } else if (isUserOnZetachain && isVaultOnZetachain) {
        description = `Withdrawing ${inputBalance.formatted} ${vaultData.inputToken.symbol}`;
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
    isComponentActiveRef.current = false;
    isTrackingActiveRef.current = false;
    
    setLastTransactionStepFeedback({});
    setTransactionStepFeedback({});
    setFinishedTransaction(false);
    
    setTransactionCompleted(true);
    
    setIsTransactionProcessing(false);
    setIsTransactionStarted(false);
    setCrosschainInvestHash("");
    setcrossChainTxId("");
    setLabel("");
    
    setTimeout(() => {
      isComponentActiveRef.current = true;
    }, 100);
    
    refreshBalance();
  }

  const shouldRenderUI = (
    (Number(inputBalance.formatted) > 0 && actions.length && !errorMessage) ||
    (crosschainInvestHash.length > 0 || isTransactionStarted || isTransactionProcessing) ||
    (finishedTransaction && (Object.keys(transactionStepFeedback).length > 0 || Object.keys(lastTransactionStepFeedback).length > 0))
  );

  return (
    <>
      {shouldRenderUI && (
        <>
          <p className="text-white text-start text-2xl font-bold leading-none mb-3">
            {label}
          </p>
          {
            <>
              {renderTransactionSteps(
                finishedTransaction,
                lastTransactionStepFeedback,
                transactionStepFeedback
              )}
            </>
          }
          {(() => {
            return finishedTransaction ? (
              <MainActionButton label="Done" handleClick={handleDone} />
            ) : (
              (() => {
                const isDisabledByProcessing = isTransactionProcessing;
                const isDisabledByHash = crosschainInvestHash.length > 0 && !finishedTransaction;
                const isDisabled = isDisabledByProcessing || isDisabledByHash;
                
                return (
                  <>
                    <MainActionButton
                      disabled={isDisabled}
                      label={label}
                      handleClick={handleMainAction}
                    />
                  </>
                );
              })()
            );
          })()}
        </>
      )}
    </>
  );
}

function renderTransactionSteps(
  finishedTransaction: boolean,
  lastTransactionStepFeedback: TransactionStepMessages,
  transactionStepFeedback: TransactionStepMessages
) {
  return (Object.keys(Action) as Array<keyof typeof Action>)
    .map((key) => key as unknown as Action)
    .map((item, index) => {
      const feedbackData = finishedTransaction ? lastTransactionStepFeedback : transactionStepFeedback;
      
      if (feedbackData[item]) {
        const actionFeedback = feedbackData[item];
        const isWaitingTooLong = actionFeedback.isWaitingTooLong === true;
        
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
                          color={isWaitingTooLong ? "orange" : "yellow"}
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
              <div className="flex flex-col">
                <p className="text-white text-start">
                  {actionFeedback.description}
                </p>
                {isWaitingTooLong && (
                  <p className="text-gray-400 text-xs mt-0.5">
                    This step is taking longer than expected. The network might be congested.
                  </p>
                )}
                {actionFeedback.recoveryAttempted && (
                  <p className="text-blue-300 text-xs mt-0.5">
                    {actionFeedback.isRecovery 
                      ? "Successfully recovered and continued to next step." 
                      : "Recovery attempt unsuccessful. Please try again later."}
                  </p>
                )}
              </div>
              {actionFeedback?.txHash && actionFeedback.status === TransactionStepStatus.completed && (
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
    });
}

function TransactionRefreshButton({ onClick, disabled }: { onClick: () => void, disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`mt-2 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${
        disabled 
          ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
          : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
      }`}
    >
      <svg 
        className="w-5 h-5 mr-2" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
        />
      </svg>
      Retry Transaction Check
    </button>
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