import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Action,
  Balance,
  Token,
  TransactionStepMessages,
  TransactionStepStatus,
  VaultData,
} from "@/types/types";
import {
  Approvedeposit,
  executeDeposit,
  executeWithdrawal,
} from "@/actions/actions";
import { MoonLoader } from "react-spinners";
import { AiOutlineCheck, AiOutlineExclamation } from "react-icons/ai";
import { isZetachain } from "@/utils/utils";
import {
  CHAIN_ID,
  CHAINS_EXPLORER_BASE_URL_MAINNET,
} from "@/constants/chainConfig";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useWallet, WalletContextState } from "@solana/wallet-adapter-react";
import { trackEvent } from "@/utils/trackEvent";
import Blockpi from "@/service/blockpi";
import { showErrorToast, showWarningToast } from "@/toasts";
import {
  CheckTheTxIsInProgress,
  getLocalStorageObject,
  updateLocalStorageObject,
} from "@/utils/localStorageUtils";
import { Address, Chain } from "viem";
import { getPublicClient } from "@/utils/getPublicClient";
import Button from "./common/Button";
import { useTransactionStore } from "@/store/transactionStore";
import { ConnectedWallet } from "@privy-io/react-auth";
import { useAuthStore } from "@/store/authStore";
import { zetachain } from "viem/chains";
import { useMultiChain } from "@/providers/MultiChainProvider";
import {
  useTokenPrices,
  TokenPriceContextType,
} from "@/providers/TokenPriceProvider";

function isHex(value: string): value is `0x${string}` {
  return typeof value === "string" && value.startsWith("0x");
}

const handleDepositTransaction = async (
  vaultData: VaultData,
  inputBalance: Balance,
  inputToken: Token,
  walletContext: WalletContextState,
  activeAccount: ConnectedWallet,
  setTransactionCompleted: (value: boolean) => void,
  activeChain: any,
  setCrosschainInvestHash: Function,
  setcrossChainTxId: Function,
  setInputBalance: Function,
  setLastEventTxHash: Function,
  setFailedOnConfirmation: (value: boolean) => void,
  setFailedTransaction: (failed: boolean) => void,
  priceContext: TokenPriceContextType,
) => {
  if (!activeAccount) return;
  console.log("=== DEPOSIT TRANSACTION START ===");
  console.log("Active Chain ID:", activeChain?.id);
  console.log("Vault Strategy Chain ID:", vaultData.protocol.chainId);
  console.log("Active Chain Name:", activeChain?.name);
  setTransactionCompleted(false);
  updateLocalStorageObject(vaultData.id, { transactionCompleted: false });

  try {
    const depositAmount = inputBalance.value;

    const receipt: { transactionHash: string | null; status?: string } =
      await executeDeposit(
        vaultData,
        inputToken,
        walletContext,
        activeAccount,
        activeChain,
        depositAmount,
        setcrossChainTxId,
        priceContext,
      );
    if (
      !receipt ||
      !receipt.transactionHash ||
      (receipt?.status && receipt?.status !== "success")
    ) {
      setFailedOnConfirmation(true);
      updateLocalStorageObject(vaultData.id, {
        vaultId: vaultData.id,
        transactionStepFeedback:
          useTransactionStore.getState().transactionStepFeedback,
        lastTransactionStepFeedback:
          useTransactionStore.getState().transactionStepFeedback,
      });
      throw new Error("Failed Tx");
    }

    try {
      trackEvent("Deposit Initiated", {
        vaultSymbol: vaultData.symbol,
        vault: vaultData.id.toString(),
        amount: depositAmount.toString(),
        inputToken: inputToken.symbol,
        amountUSD:
          inputBalance.formattedUSD ||
          (Number(inputBalance.formatted) * (inputToken.price || 0)).toFixed(2),
        user:
          activeChain?.id === CHAIN_ID.solana
            ? walletContext.publicKey?.toBase58()
            : activeAccount.address,
        chain: activeChain?.id,
      });
    } catch (analyticsError) {
      // 📊 Analytics failures should not affect core transaction logic
      console.warn(
        "📊 [ANALYTICS] Failed to track deposit event:",
        analyticsError,
      );
    }

    console.log("=== DEPOSIT TRANSACTION RECEIPT RECEIVED ===");
    console.log("Receipt:", receipt);
    console.log("Receipt.transactionHash:", receipt.transactionHash);

    const activeChainExplorerBaseUrl =
      CHAINS_EXPLORER_BASE_URL_MAINNET[activeChain?.id] ?? "";
    updateLocalStorageObject(vaultData.id, {
      lastEventTxHash: `${activeChainExplorerBaseUrl}/tx/${receipt.transactionHash}`,
      crosschainInvestHash: receipt.transactionHash ?? "",
    });
    if (activeChain?.id === CHAIN_ID.solana) {
      // Solana handling - no waitForReceipt needed
      console.log(
        "🌊 [SOLANA] Solana transaction handling - receipt confirmed on-chain",
      );
    } else {
      console.log("EVM transaction, waiting for receipt confirmation");

      const publicClient = getPublicClient(activeChain?.id);
      if (
        publicClient &&
        receipt.transactionHash &&
        isHex(receipt.transactionHash)
      ) {
        await publicClient.waitForTransactionReceipt({
          hash: receipt.transactionHash,
        });
        console.log("Receipt confirmed");
      }
    }

    setLastEventTxHash(
      `${activeChainExplorerBaseUrl}/tx/${receipt.transactionHash}`,
    );
    console.log(
      "Explorer URL set:",
      `${activeChainExplorerBaseUrl}/tx/${receipt.transactionHash}`,
    );

    // Enhanced logic for determining transaction type and setting correct hash for BlockPI
    const isUserOnZetachain = isZetachain(activeChain?.id);
    const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);

    console.log("=== TRANSACTION TYPE DETECTION ===");
    console.log(`User on Zetachain: ${isUserOnZetachain}`);
    console.log(`Vault strategy on Zetachain: ${isVaultOnZetachain}`);
    console.log(`Active Chain ID: ${activeChain?.id}`);
    console.log(`Vault Strategy Chain ID: ${vaultData.protocol.chainId}`);
    console.log(`Receipt hash: ${receipt.transactionHash}`);

    if (isUserOnZetachain && !isVaultOnZetachain) {
      // Type 2: Direct deposit from Zetachain to vault with non-Zetachain strategy
      // The receipt.transactionHash IS the localhash for BlockPI tracking
      console.log("=== TYPE 2 TRANSACTION DETECTED ===");
      console.log(`Setting localhash for BlockPI: ${receipt.transactionHash}`);
      console.log(
        `This should trigger BlockPI tracking once action becomes depositConfirmed`,
      );
      setCrosschainInvestHash(receipt.transactionHash);
      console.log(
        "setCrosschainInvestHash called with:",
        receipt.transactionHash,
      );
    } else if (isUserOnZetachain && isVaultOnZetachain) {
      setCrosschainInvestHash(receipt.transactionHash);
    } else if (!isUserOnZetachain) {
      setCrosschainInvestHash(receipt.transactionHash);
    } else {
      setCrosschainInvestHash(receipt.transactionHash);
    }

    return true;
  } catch (error: any) {
    console.log("catch error", error);
    try {
      if (!error.message.includes("User denied transaction")) {
        trackEvent("Deposit Failed", {
          vaultSymbol: vaultData.symbol,
          vault: vaultData.id.toString(),
          amount: inputBalance.value.toString(),
          amountUSD:
            inputBalance.formattedUSD ||
            (Number(inputBalance.formatted) * (inputToken.price || 0)).toFixed(
              2,
            ),
        });
      }
      if (
        error?.message?.toLowerCase().includes("wallet timeout") &&
        activeAccount.walletClientType !== "privy"
      ) {
        showErrorToast(
          "It looks like the confirmation request in your wallet has timed out. You can still approve it, but our app won't be able to track its progress from here.",
        );
      }
    } catch (analyticsError) {}

    return false;
  }
};

const handleWithdrawTransaction = async (
  vaultData: VaultData,
  inputBalance: Balance,
  withdrawToken: Token,
  walletContext: WalletContextState,
  activeAccount: ConnectedWallet,
  setTransactionCompleted: (value: boolean) => void,
  activeChain: any,
  setCrosschainInvestHash: Function,
  setcrossChainTxId: Function,
  setInputBalance: Function,
  setLastEventTxHash: Function,
  setFailedOnConfirmation: (value: boolean) => void,
  setFailedTransaction: (failed: boolean) => void,
) => {
  setTransactionCompleted(false);
  updateLocalStorageObject(vaultData.id, { transactionCompleted: false });

  let withdrawZRC20;
  if (activeChain?.id === 7001 || activeChain?.id === 7000) {
    withdrawZRC20 = vaultData.inputToken;
  } else {
    withdrawZRC20 = withdrawToken.ZRC20equivalent;
  }
  if (!withdrawToken || !withdrawZRC20) {
    throw new Error("Withdraw token not found");
  }

  try {
    const withdrawAssetAmount = inputBalance.value;
    const withdrawAmountFormatted =
      Number(withdrawAssetAmount) / 10 ** withdrawToken.decimals;
    const amountUSD = (
      withdrawAmountFormatted * (withdrawToken.price || 0)
    ).toFixed(2);

    const receipt: { transactionHash: string | null; status?: string } =
      await executeWithdrawal(
        vaultData,
        walletContext,
        activeAccount,
        activeChain,
        withdrawAssetAmount,
        withdrawToken.address as Address,
        withdrawZRC20 as Token,
        setcrossChainTxId,
      );

    if (
      !receipt ||
      !receipt.transactionHash ||
      (receipt?.status && receipt?.status !== "success")
    ) {
      setFailedOnConfirmation(true);
      updateLocalStorageObject(vaultData.id, {
        vaultId: vaultData.id,
        transactionStepFeedback:
          useTransactionStore.getState().transactionStepFeedback,
        lastTransactionStepFeedback:
          useTransactionStore.getState().transactionStepFeedback,
      });
      throw new Error("Failed Tx");
    }

    if (activeChain?.id === CHAIN_ID.solana) {
    } else {
      const publicClient = getPublicClient(activeChain?.id);
      if (
        publicClient &&
        receipt?.transactionHash &&
        isHex(receipt.transactionHash)
      ) {
        await publicClient.waitForTransactionReceipt({
          hash: receipt.transactionHash,
        });
        console.log("Receipt confirmed");
      }
    }

    const activeChainExplorerBaseUrl =
      CHAINS_EXPLORER_BASE_URL_MAINNET[activeChain?.id] ?? "";
    setLastEventTxHash(
      `${activeChainExplorerBaseUrl}/tx/${receipt.transactionHash}`,
    );

    const isUserOnZetachain = isZetachain(activeChain?.id);
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
      trackEvent("Withdraw Failed", {
        vault: vaultData.id.toString(),
        vaultSymbol: vaultData.symbol,
      });
    } catch (analyticsError) {
      console.warn(
        "📊 [ANALYTICS] Failed to track withdraw failure event:",
        analyticsError,
      );
    }

    if (
      error?.message?.toLowerCase().includes("wallet timeout") &&
      activeAccount.walletClientType !== "privy"
    ) {
      showErrorToast(
        "It looks like the confirmation request in your wallet has timed out. You can still approve it, but our app won't be able to track its progress from here.",
      );
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
  hideStepsDisplay = false,
  setLabel,
  label,
  outputAmountFormatted,
}: {
  step: number;
  setStep: Function;
  action: Action;
  setAction: Function;
  _inputToken?: Token;
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
  hideStepsDisplay?: boolean;
  setLabel: Dispatch<SetStateAction<string>>;
  label: string;
  outputAmountFormatted: string;
}): JSX.Element {
  // Core transaction state
  const [crosschainInvestHash, setCrosschainInvestHash] = useState("");
  const [crossChainTxId, setcrossChainTxId] = useState<string>("");
  const [isTransactionStarted, setIsTransactionStarted] = useState(false);
  const [lastEventTxHash, setLastEventTxHash] = useState("");
  const {
    setFinishedTransaction,
    setFailedTransaction,
    setLastDepositInfo,
    setLastTransactionStepFeedback,
    setTransactionStepFeedback,
    transactionStepFeedback,
    lastTransactionStepFeedback,
    finishedTransaction,
    isTransactionProcessing,
    setIsTransactionProcessing,
    setIsFailedOnCOnfirmation,

    setCurrentInputBalance,
    setCurrentErrorMessage,
    setCrosschainInvestHash: setStoreCrosschainInvestHash,
    setCurrentVaultId,
  } = useTransactionStore();

  // BlockPI-only feedback system

  useEffect(() => {
    if (vaultData?.id) {
      const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);
      const vaultTxData = getLocalStorageObject(vaultData.id);

      if (isTxInProgress && vaultTxData) {
        setCrosschainInvestHash(vaultTxData?.crosschainInvestHash ?? "");
        setcrossChainTxId(vaultTxData?.crossChainTxId ?? "");
        setIsTransactionStarted(vaultTxData?.isTransactionStarted ?? false);
        setIsTransactionProcessing(
          vaultTxData?.isTransactionProcessing ?? false,
        );
        setFinishedTransaction(vaultTxData?.finishedTransaction ?? false);
        setLastEventTxHash(vaultTxData?.lastEventTxHash ?? "");
        setTransactionStepFeedback(vaultTxData?.transactionStepFeedback ?? {});
        setLastTransactionStepFeedback(
          vaultTxData?.lastTransactionStepFeedback ?? {},
        );
      }
    }
  }, [
    vaultData.id,
    setIsTransactionProcessing,
    setFinishedTransaction,
    setLastEventTxHash,
    setTransactionStepFeedback,
    setLastTransactionStepFeedback,
  ]);

  const blockpi = useMemo(() => new Blockpi(), []);

  // Simple ref to track component lifecycle for cleanup
  const isComponentActiveRef = useRef(true);

  // Ref to prevent multiple concurrent tracking processes
  const isTrackingActiveRef = useRef(false);

  // Add the function here so it has access to all the component state
  function completeTransactionProcess(
    feedbackSnapshot: TransactionStepMessages,
  ) {
    // Use direct implementation instead of TransactionStateManager
    const txType = isDeposit ? "deposit" : "withdrawal";

    // Determine if this is a Type 2 transaction
    const isUserOnZetachain = isZetachain(activeChain?.id);
    const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
    const isType2Transaction = isUserOnZetachain && !isVaultOnZetachain;

    // Note: Transaction completion is now handled by the simple approach

    // 1. Mark all steps as completed
    let actionMapping, stepDescriptions;

    if (isType2Transaction) {
      // Type 2 transactions (3 steps)
      actionMapping = isDeposit
        ? [
            Action.deposit, // Step 0: Initial transaction on Zetachain
            Action.crosschainInvest, // Step 1: Cross chain to strategy
            Action.deposited, // Step 2: Complete (funds back to Zetachain)
          ]
        : [
            Action.withdraw, // Step 0: Initial transaction on Zetachain
            Action.DivestSent, // Step 1: Cross chain to strategy
            Action.withdrew, // Step 2: Complete (funds back to Zetachain)
          ];

      stepDescriptions = isDeposit
        ? [
            "Initial deposit transaction on zetachain completed",
            "Cross chain transfer and investment of funds completed",
            "Final confirmation completed, shares issued by vault",
          ]
        : [
            "Initial withdraw transaction on zetachain completed",
            "Divestment of funds from strategy completed",
            "Withdrawal confirmation completed, funds returned",
          ];
    } else {
      // Type 4 and other transactions (5-6 steps)
      actionMapping = isDeposit
        ? [
            Action.deposit, // Step 0
            Action.depositConfirmed, // Step 1
            Action.crosschainInvest, // Step 2
            Action.FundsInvest, // Step 3
            Action.ReturnFundsToUserSent, // Step 4
            Action.FundsReturned, // Step 5 - Confirmation message from strategy to vault
            Action.deposited, // Step 6 - Minting of shares on vault
          ]
        : [
            Action.withdraw, // Step 0
            Action.withdrawconfirmed, // Step 1
            Action.DivestSent, // Step 2
            Action.FundsDivested, // Step 3
            Action.ReturnFundsToUserSent, // Step 4
            Action.withdrew, // Step 5
          ];

      stepDescriptions = isDeposit
        ? [
            "Initial deposit transaction on local chain completed",
            "Cross chain transfer of funds to vault completed",
            "Transfer of funds from vault to strategy completed",
            "Investment of funds into yield source completed",
            "Confirmation message from strategy to vault completed",
            "Minting of shares on vault completed",
          ]
        : [
            "Initial withdraw transaction on local chain completed",
            "Cross chain request to vault completed",
            "Request from vault to strategy completed",
            "Divestment of funds from yield source completed",
            "Return of funds from strategy to vault completed",
            "Return of funds from vault to user completed",
          ];
    }

    console.log(`[Transaction Complete] Marking all steps as completed`);

    // Update all steps to completed
    useTransactionStore.setState((prev) => {
      const updatedFeedback = { ...prev.transactionStepFeedback };

      actionMapping.forEach((actionKey, index) => {
        if (actionKey) {
          updatedFeedback[actionKey] = {
            ...prev.transactionStepFeedback[actionKey],

            label: isDeposit ? "Deposit" : "Withdraw",
            description: stepDescriptions[index],
            status: TransactionStepStatus.completed,
          };
        }
      });

      updateLocalStorageObject(vaultData.id, {
        vaultId: vaultData.id,
        transactionStepFeedback: updatedFeedback,
      });

      return { transactionStepFeedback: updatedFeedback };
    });

    // 2. Set the final UI state
    const finalAction = isDeposit ? Action.deposited : Action.withdrew;

    console.log(
      `[Transaction Complete] Setting final action to ${finalAction}`,
    );
    setAction(finalAction);
    setIsFailedOnCOnfirmation(false);

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
      type: txType,
    });
  }

  useEffect(() => {
    const isTxIsInProggress = CheckTheTxIsInProgress(vaultData?.id);
    if (isTxIsInProggress) return;

    if (
      !isTransactionStarted &&
      !isTransactionProcessing &&
      !finishedTransaction
    ) {
      setAction(_action);
      setStep(0);
      updateLocalStorageObject(vaultData.id, {
        action: _action,
        isTransactionProcessing: false,
        isTransactionStarted: false,
        step: 0,
      });
      setIsFailedOnCOnfirmation(false);
    }

    if (
      !isTransactionStarted &&
      !isTransactionProcessing &&
      !finishedTransaction
    ) {
      setIsTransactionProcessing(false);
      setIsTransactionStarted(false);
    }

    const hasCompletedTransactionSteps =
      Object.keys(transactionStepFeedback).length > 0 ||
      Object.keys(lastTransactionStepFeedback).length > 0;

    if (!finishedTransaction && !hasCompletedTransactionSteps) {
      setFinishedTransaction(false);
    }
  }, [actions, _action, vaultData.id, setAction, setStep]);

  useEffect(() => {
    if (action === undefined || finishedTransaction || !crosschainInvestHash) {
      return;
    }

    if (isTrackingActiveRef.current) {
      return;
    }

    const isDepositConfirmed =
      action === Action.depositConfirmed || action === Action.deposit;
    const isWithdrawConfirmed =
      action === Action.withdrawconfirmed || action === Action.withdraw;

    if (!isDepositConfirmed && !isWithdrawConfirmed) {
      return;
    }

    const transactionType: "deposit" | "withdrawal" = isDepositConfirmed
      ? "deposit"
      : "withdrawal";
    const isUserOnZetachain = isZetachain(activeChain?.id);
    const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
    const isType2 = isUserOnZetachain && !isVaultOnZetachain;

    if (isUserOnZetachain && isVaultOnZetachain) {
      setTimeout(() => {
        const finalAction =
          transactionType === "deposit" ? Action.deposited : Action.withdrew;
        const nextStep = actions.findIndex((el) => el === finalAction);
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
          ? transactionType === "deposit"
            ? [Action.deposit, Action.crosschainInvest, Action.deposited]
            : [Action.withdraw, Action.DivestSent, Action.withdrew]
          : transactionType === "deposit"
            ? [
                Action.deposit,
                Action.depositConfirmed,
                Action.crosschainInvest,
                Action.FundsInvest,
                Action.ReturnFundsToUserSent,
                Action.FundsReturned,
                Action.deposited,
              ]
            : [
                Action.withdraw,
                Action.withdrawconfirmed,
                Action.DivestSent,
                Action.FundsDivested,
                Action.ReturnFundsToUserSent,
                Action.withdrew,
              ];

        const onStepComplete = (stepIndex: number, stepData: any) => {
          const actionKey = actionMapping[stepIndex];
          if (!actionKey) return;

          if (!isComponentActiveRef.current) {
            console.log(
              `[BlockPI] Ignoring step update for vault ${vaultData.id} - component inactive`,
            );
            return;
          }

          const currentVaultData = getLocalStorageObject(vaultData.id);
          if (
            currentVaultData?.vaultId &&
            currentVaultData.vaultId !== vaultData.id
          ) {
            console.log(
              `[BlockPI] Ignoring step update - vault ID mismatch: expected ${vaultData.id}, got ${currentVaultData.vaultId}`,
            );
            return;
          }

          const currentTxHash = getLocalStorageObject(
            vaultData.id,
          )?.crosschainInvestHash;
          if (currentTxHash && currentTxHash !== crosschainInvestHash) {
            console.log(
              `[BlockPI] Ignoring step update - hash mismatch for vault ${vaultData.id}`,
            );
            return;
          }

          useTransactionStore.setState((prev) => {
            updateLocalStorageObject(vaultData.id, {
              vaultId: vaultData.id,
              transactionStepFeedback: {
                ...prev.transactionStepFeedback,
                [actionKey]: {
                  label: transactionType === "deposit" ? "Deposit" : "Withdraw",
                  description: stepData.description,
                  status:
                    stepData.status === "completed"
                      ? TransactionStepStatus.completed
                      : stepData.status === "error"
                        ? TransactionStepStatus.error
                        : TransactionStepStatus.processing,
                  txHash: stepData.txHash,
                  isWaitingTooLong: stepData.isWaitingTooLong,
                },
              },
            });

            return {
              transactionStepFeedback: {
                ...prev.transactionStepFeedback,
                [actionKey]: {
                  label: transactionType === "deposit" ? "Deposit" : "Withdraw",
                  description: stepData.description,
                  status:
                    stepData.status === "completed"
                      ? TransactionStepStatus.completed
                      : stepData.status === "error"
                        ? TransactionStepStatus.error
                        : TransactionStepStatus.processing,
                  txHash: stepData.txHash,
                  isWaitingTooLong: stepData.isWaitingTooLong,
                },
              },
            };
          });

          if (
            stepData.status === "completed" &&
            stepIndex < actionMapping.length
          ) {
            setStep(stepIndex);
            updateLocalStorageObject(vaultData.id, {
              vaultId: vaultData.id,
              step: stepIndex,
            });
          }
        };

        const result = await blockpi.trackTransactionSequenceWithProgress(
          crosschainInvestHash,
          transactionType,
          onStepComplete,
          {
            isType2,
            totalSteps: isType2 ? 3 : transactionType === "deposit" ? 6 : 6,
          },
          activeChain?.id,
          vaultData.protocol.chainId,
        );

if (result.success) {
  const currentFeedback = useTransactionStore.getState().transactionStepFeedback;
  const hasFailedSteps = Object.values(currentFeedback).some(
    step => step && step.status === TransactionStepStatus.error
  );

  if (hasFailedSteps) {
    useTransactionStore.setState((prev) => {
      setLastTransactionStepFeedback(prev.transactionStepFeedback);
      updateLocalStorageObject(vaultData.id, null);
      return { transactionStepFeedback: prev.transactionStepFeedback };
    });

    setFinishedTransaction(true);
    setIsTransactionProcessing(false);
    setIsTransactionStarted(false);
    return;
  }

  const finalAction =
    transactionType === "deposit" ? Action.deposited : Action.withdrew;

  let updatedFeedback: any;

  useTransactionStore.setState((prev) => {
    updatedFeedback = { ...prev.transactionStepFeedback };

    if (!updatedFeedback[finalAction]) {
      const finalDescription = isDeposit
        ? "Final confirmation completed, shares issued by vault"
        : "Withdrawal confirmation completed, funds returned";

      const finalTxHash =
        Object.values(prev.transactionStepFeedback)
          .reverse()
          .find(
            (step) =>
              step &&
              step.status === TransactionStepStatus.completed &&
              step.txHash,
          )?.txHash || crosschainInvestHash;

      updatedFeedback[finalAction] = {
        label: transactionType === "deposit" ? "Deposit" : "Withdraw",
        description: finalDescription,
        status: TransactionStepStatus.completed,
        txHash: finalTxHash,
      };
    }

    setLastTransactionStepFeedback(updatedFeedback);

    return { transactionStepFeedback: updatedFeedback };
  });

  setAction(finalAction);
  setStep(actionMapping.length - 1);

  setFinishedTransaction(true);
  setIsTransactionProcessing(false);
  setIsFailedOnCOnfirmation(false);
  setTransactionCompleted(true);

  updateLocalStorageObject(vaultData.id, {
    vaultId: vaultData.id,
    finishedTransaction: true,
    isTransactionProcessing: false,
    isTransactionStarted: false,
    transactionStepFeedback: updatedFeedback, 
    lastTransactionStepFeedback: updatedFeedback,
  });

  setTimeout(() => {
    refreshBalance();
  }, 2000);

  trackEvent("Transaction Crosschain Complete", {
    vaultSymbol: vaultData.symbol,
    vault: vaultData.id,
    type: transactionType,
  });
        } else {
          useTransactionStore.setState((prev) => {
            setLastTransactionStepFeedback(prev.transactionStepFeedback);
            updateLocalStorageObject(vaultData.id, {
              vaultId: vaultData.id,
              failedTransaction: true,
              transactionStepFeedback: prev.transactionStepFeedback,
              lastTransactionStepFeedback: prev.transactionStepFeedback,
            });
            return { transactionStepFeedback: prev.transactionStepFeedback };
          });
          setFailedTransaction(true);
          setFinishedTransaction(true);
          setIsTransactionProcessing(false);
          setIsTransactionStarted(false);
        }
      } catch (error) {
        console.error("[BlockPI Progressive] Error during tracking:", error);
        setIsTransactionProcessing(false);
        setIsTransactionStarted(false);

        updateLocalStorageObject(vaultData.id, {
          isTransactionProcessing: false,
          isTransactionStarted: false,
        });
      } finally {
        isTrackingActiveRef.current = false;
      }
    };

    const timeoutId = setTimeout(trackTransaction, 100);

    return () => {
      clearTimeout(timeoutId);
      isTrackingActiveRef.current = false;
    };
  }, [
    crosschainInvestHash,
    action,
    finishedTransaction,
    actions,
    activeChain?.id,
    blockpi,
    setAction,
    setStep,
    vaultData,
  ]);

  useEffect(() => {
    return () => {
      isComponentActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    setCurrentInputBalance(_inputBalance);
  }, [_inputBalance, setCurrentInputBalance]);

  useEffect(() => {
    setCurrentErrorMessage(errorMessage);
  }, [errorMessage, setCurrentErrorMessage]);

  useEffect(() => {
    setStoreCrosschainInvestHash(crosschainInvestHash);
  }, [crosschainInvestHash, setStoreCrosschainInvestHash]);

  useEffect(() => {
    return () => {
      isComponentActiveRef.current = false;
      isTrackingActiveRef.current = false;
      console.log(`[BlockPI] Component unmounted for vault ${vaultData.id}`);
    };
  }, [vaultData.id]);

  useEffect(() => {
    isComponentActiveRef.current = true;
    console.log(`[BlockPI] Component activated for vault ${vaultData.id}`);

    return () => {
      isComponentActiveRef.current = false;
      console.log(`[BlockPI] Component deactivated for vault ${vaultData.id}`);
    };
  }, [vaultData.id]);

  return (
    <div className="w-full flex flex-col">
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
        isDeposit={isDeposit}
        hideStepsDisplay={hideStepsDisplay}
        outputAmountFormatted={outputAmountFormatted}
        setCurrentVaultId={setCurrentVaultId}
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
  setLastEventTxHash,
  refreshBalance,
  crosschainInvestHash,
  isComponentActiveRef,
  isTrackingActiveRef,
  isDeposit,
  hideStepsDisplay = false,
  lastEventTxHash,
  outputAmountFormatted,
  setCurrentVaultId,
}: {
  setStep: Function;
  setAction: Function;
  inputToken?: Token;
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
  setTransactionStepFeedback: (newData: TransactionStepMessages) => void;
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
  isDeposit: boolean;
  hideStepsDisplay?: boolean;
  outputAmountFormatted: string;
  setCurrentVaultId: (vaultId: string | null) => void;
}): JSX.Element {
  const walletContext = useWallet();
  const prevLebel = useRef(label);
  const { openStep, setChain } = useAuthStore();
  const { selectedChain, activeEvmWallet: activeAccount } = useMultiChain();
  const [isMobile, setIsMobile] = useState(false);
  const { setIsFailedOnCOnfirmation, setFailedTransaction } =
    useTransactionStore();
  const priceContext = useTokenPrices();

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window?.innerWidth < 1024);
    };

    checkIsMobile();

    window?.addEventListener("resize", checkIsMobile);

    return () => {
      window?.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  const { isButtonDisabled, setLastDepositInfo, setLastWithdrawInfo } =
    useTransactionStore();

  // Simplified feedback update for local transactions only
  function updateLocalTransactionFeedback(
    actionKey: Action,
    status: TransactionStepStatus,
    description: string,
    txHash?: string,
  ) {
    useTransactionStore.setState((prev) => {
      const updated = { ...prev.transactionStepFeedback };
      updated[actionKey] = {
        label:
          actionKey === Action.depositApprove
            ? "Approve"
            : actionKey === Action.deposit
              ? "Deposit"
              : "Withdraw",
        description,
        status,
        txHash: txHash || updated[actionKey]?.txHash, // Preserve existing txHash if none provided
      };
      updateLocalStorageObject(vaultData.id, {
        vaultId: vaultData.id,
        transactionStepFeedback: updated,
      });

      return { transactionStepFeedback: updated };
    });
  }

  async function interactionPostHook(
    success: boolean,
    needCallMainAction?: boolean,
  ) {
    if (success) {
      if (actions[step + 1] == Action.depositApproveConfirmed) {
        updateLocalTransactionFeedback(
          Action.depositApprove,
          TransactionStepStatus.completed,
          "Approval transaction confirmed",
        );

        setIsTransactionProcessing(false);

        const nextStep = step + 1;
        setAction(actions[nextStep]);
        setStep(nextStep);
        updateLocalStorageObject(vaultData.id, {
          vaultId: vaultData.id,
          isTransactionProcessing: false,
          action: actions[nextStep],
          step: nextStep,
        });
        setTimeout(() => {
          setAction(actions[nextStep + 1]);
          setStep(nextStep + 1);
          updateLocalStorageObject(vaultData.id, {
            action: actions[nextStep + 1],
            step: nextStep + 1,
          });
          if (needCallMainAction) {
            handleMainAction(actions[nextStep + 1]);
          }
        }, 100);
      }
      const isDepositFlow = action == Action.deposit;
      const hasDepositConfirmed = actions[step + 1] == Action.depositConfirmed;
      const isType2Flow = isDepositFlow && !hasDepositConfirmed;

      const isUserOnZetachain = isZetachain(activeChain?.id);
      const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);

      let successMessage;
      if (isUserOnZetachain && !isVaultOnZetachain) {
        successMessage = "Initial deposit transaction on Zetachain completed";
      } else if (isUserOnZetachain && isVaultOnZetachain) {
        successMessage = "Deposit transaction completed";
      } else {
        const chainName = activeChain?.name || "local chain";
        successMessage = `Initial deposit transaction on ${chainName} completed`;
      }

      updateLocalTransactionFeedback(
        Action.deposit,
        TransactionStepStatus.completed,
        successMessage,
        lastEventTxHash,
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

          updateLocalTransactionFeedback(
            actions[nextStep],
            TransactionStepStatus.processing,
            "Cross chain transfer in progress...",
          );
        }, 50);
      } else if (isType2Flow) {
        setTimeout(() => {
          setAction(Action.depositConfirmed);
        }, 50);
      }
    }

    if (
      action == Action.withdraw &&
      actions[step + 1] == Action.withdrawconfirmed &&
      success
    ) {
      const isUserOnZetachain = isZetachain(activeChain?.id);
      const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);

      let successMessage;
      if (isUserOnZetachain && !isVaultOnZetachain) {
        successMessage = "Initial withdraw transaction on Zetachain completed";
      } else if (isUserOnZetachain && isVaultOnZetachain) {
        successMessage = "Withdraw transaction completed";
      } else {
        const chainName = activeChain?.name || "local chain";
        successMessage = `Initial withdraw transaction on ${chainName} completed`;
      }

      updateLocalTransactionFeedback(
        Action.withdraw,
        TransactionStepStatus.completed,
        successMessage,
        lastEventTxHash,
      );

      setIsTransactionProcessing(false);

      const nextStep = step + 1;
      setAction(actions[nextStep]);
      setStep(nextStep);
      updateLocalStorageObject(vaultData.id, {
        vaultId: vaultData.id,
        action: actions[nextStep],
        step: nextStep,
        isTransactionProcessing: false,
      });
    } else {
      if (action == Action.depositApprove) {
        updateLocalTransactionFeedback(
          action,
          TransactionStepStatus.error,
          "Approval transaction failed, please try again",
        );
      }
      if (action == Action.deposit) {
        updateLocalTransactionFeedback(
          action,
          TransactionStepStatus.error,
          "Local transaction failed, please try again",
        );
      }
      if (action == Action.withdraw) {
        updateLocalTransactionFeedback(
          action,
          TransactionStepStatus.error,
          "Local transaction failed, please try again",
        );
      }

      // Reset transaction state to allow retry
      const currentFeedback =
        useTransactionStore.getState().transactionStepFeedback;
      updateLocalStorageObject(vaultData.id, {
        vaultId: vaultData.id,
        isTransactionProcessing: false,
        isTransactionStarted: false,
        transactionStepFeedback: currentFeedback,
        lastTransactionStepFeedback: currentFeedback,
      });

      setIsTransactionProcessing(false);
      setIsTransactionStarted(false);
      setLastTransactionStepFeedback(currentFeedback);
    }
  }

  async function handleMainAction(directAction?: Action) {
    const currenAction = directAction ?? action;
    setIsFailedOnCOnfirmation(false);
    setFailedTransaction(false);

    if (isTransactionProcessing || !inputToken) {
      return;
    }

    setIsTransactionProcessing(true);
    updateLocalStorageObject(vaultData.id, {
      vaultId: vaultData.id,
      isTransactionProcessing: true,
      failedTransaction: false,
    });

    isComponentActiveRef.current = true;

    // Show warning toast to inform users not to leave the page during transaction processing
    if (currenAction === Action.deposit || currenAction === Action.withdraw) {
      setCurrentVaultId(vaultData.id);
      showWarningToast(
        "📌 Please stay on this page to monitor progress across all networks!",
      );
    }

    if (currenAction == Action.depositApprove) {
      trackEvent("Approve Clicked", {
        vaultSymbol: vaultData.symbol,
        token: inputToken.symbol,
      });
      updateLocalTransactionFeedback(
        currenAction,
        TransactionStepStatus.processing,
        "Approval in progress",
      );
    } else {
      setIsTransactionStarted(true);
      updateLocalStorageObject(vaultData.id, {
        vaultId: vaultData.id,
        isTransactionStarted: true,
      });
    }

    if (currenAction == Action.deposit) {
      trackEvent("Deposit Clicked", {
        vaultSymbol: vaultData.symbol,
        amount: inputBalance.formatted,
      });

      // Determine transaction type for better UI feedback
      const isUserOnZetachain = isZetachain(activeChain?.id);
      const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);

      let description;
      if (isUserOnZetachain && !isVaultOnZetachain) {
        description = "Initial deposit transaction on Zetachain in progress";
      } else if (isUserOnZetachain && isVaultOnZetachain) {
        description = "Deposit in progress";
      } else {
        description = `Initial deposit transaction on ${activeChain?.name} in progress`;
      }

      updateLocalTransactionFeedback(
        currenAction,
        TransactionStepStatus.processing,
        description,
      );
    }

    if (currenAction == Action.withdraw) {
      // Determine withdrawal transaction type for better UI feedback
      const isUserOnZetachain = isZetachain(activeChain?.id);
      const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);

      let description;
      if (isUserOnZetachain && !isVaultOnZetachain) {
        description = "Initial withdraw transaction on zetachain in progress";
      } else if (isUserOnZetachain && isVaultOnZetachain) {
        description = `Withdrawing ${inputBalance.formatted} ${vaultData.inputToken.symbol}`;
      } else {
        description = `Initial withdraw transaction on ${activeChain?.name} in progress`;
      }

      updateLocalTransactionFeedback(
        currenAction,
        TransactionStepStatus.processing,
        description,
      );
    }
    if (!priceContext) {
      console.error("Price context is not available");
      return;
    }
    const success = await handleInteraction(
      vaultData,
      inputBalance,
      inputToken,
      activeAccount!,
      walletContext,
      setTransactionCompleted,
      activeChain,
      currenAction,
      setCrosschainInvestHash,
      setcrossChainTxId,
      setInputBalance,
      setLastEventTxHash,
      setIsFailedOnCOnfirmation,
      priceContext,
    )();

    await interactionPostHook(!!success, !currenAction);
  }

  // const handleDone = useCallback(() => {
  //   // Mark component as inactive to prevent any ongoing BlockPI updates
  //   isComponentActiveRef.current = false;
  //   isTrackingActiveRef.current = false;

  //   // Clear component state
  //   setLastTransactionStepFeedback({});
  //   setTransactionStepFeedback({});
  //   setFinishedTransaction(false);
  //   setCurrentVaultId(null);

  //   setTransactionCompleted(true);

  //   setIsTransactionProcessing(false);
  //   setIsTransactionStarted(false);
  //   setCrosschainInvestHash("");
  //   setcrossChainTxId("");

  //   // Reactivate component after clearing
  //   setTimeout(() => {
  //     isComponentActiveRef.current = true;
  //   }, 100);

  //   refreshBalance();
  // }, [refreshBalance, vaultData?.id, setCurrentVaultId]);

  const handleWalletConnect = () => {
    setChain(activeChain);
    if (activeChain?.id === zetachain.id || !activeChain) {
      openStep(isMobile ? "mobileOptionsA" : "optionsA");
    } else {
      if (
        (selectedChain === "solana" &&
          activeChain?.id !== CHAIN_ID["solana"]) ||
        (selectedChain === "evm" && activeChain?.id === CHAIN_ID["solana"])
      ) {
        if (selectedChain === "evm" && activeAccount?.address) {
          const confirmResult = confirm("Your EVM wallet will be disconnected");
          if (!confirmResult) return;
        } else if (selectedChain === "solana") {
          const confirmResult = confirm(
            "Your Solana wallet will be disconnected",
          );
          if (!confirmResult) return;
        }
      }
      openStep("connectInChosenChain");
    }
  };

  return (
    <>
      {!hideStepsDisplay && (
        <>
          {renderTransactionSteps(
            finishedTransaction,
            lastTransactionStepFeedback,
            transactionStepFeedback,
          )}
        </>
      )}

      {/* {finishedTransaction &&
      (Object.keys(lastTransactionStepFeedback).length > 0 ||
        Object.keys(transactionStepFeedback).length > 0) ? (
        <Button
          variant="special"
          className="w-full mt-10 md:mt-[47px] !max-h-[48px] md:!max-h-[54px]"
          onClick={handleDone}
        >
          Done
        </Button>
      ) : ( */}
      {(() => {
        const isDisabledByProcessing = isTransactionProcessing;
        const isDisabledByHash =
          crosschainInvestHash?.length > 0 && !finishedTransaction;

        const isDisabledByValidation =
          !inputToken ||
          !inputBalance.formatted ||
          Number(inputBalance.formatted) <= 0 ||
          !!errorMessage;

        const isConnectWalletSHown =
          (!activeAccount && !walletContext.publicKey) ||
          (activeAccount?.walletClientType === "privy" &&
            activeChain?.id !== zetachain.id) ||
          (walletContext.publicKey && activeChain?.id !== CHAIN_ID["solana"]) ||
          (activeAccount?.address && activeChain?.id === CHAIN_ID["solana"]);

        const isDisabled = !isConnectWalletSHown
          ? isButtonDisabled ||
            isDisabledByProcessing ||
            isDisabledByHash ||
            isDisabledByValidation
          : false;

        return (
          <Button
            variant="special"
            disabled={isDisabled}
            className="w-full mt-10 md:mt-[47px] !text-[16px] !font-bold !font-gotham !max-h-[48px] md:!max-h-[54px]"
            onClick={() => {
              !isConnectWalletSHown
                ? handleMainAction()
                : handleWalletConnect();
            }}
          >
            {!isConnectWalletSHown
              ? (label ?? (isDeposit ? "Invest" : "Withdraw"))
              : "Connect wallet"}
          </Button>
        );
      })()}
    </>
  );

  function renderTransactionSteps(
    finishedTransaction: boolean,
    lastTransactionStepFeedback: TransactionStepMessages,
    transactionStepFeedback: TransactionStepMessages,
  ) {
    return (Object.keys(Action) as Array<keyof typeof Action>)
      .map((key) => key as unknown as Action)
      .map((item, index) => {
        const feedbackData = finishedTransaction
          ? lastTransactionStepFeedback
          : transactionStepFeedback;

        if (feedbackData[item]) {
          const actionFeedback = feedbackData[item];
          const isWaitingTooLong = actionFeedback.isWaitingTooLong === true;

          return (
            <div className="flex flex-col gap-2 mb-2 last:mb-4" key={index}>
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
                      This step is taking longer than expected. The network
                      might be congested.
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
                {actionFeedback?.txHash &&
                  actionFeedback.status === TransactionStepStatus.completed && (
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

  function handleInteraction(
    vaultData: VaultData,
    inputBalance: Balance,
    inputToken: Token,
    activeAccount: ConnectedWallet,
    walletContext: WalletContextState | any,
    setTransactionCompleted: (value: boolean) => void,
    activeChain: Chain,
    action: Action,
    setCrosschainInvestHash: Function,
    setcrossChainTxId: Function,
    setInputBalance: Function,
    setLastEventTxHash: Function,
    setFailedOnConfirmation: (value: boolean) => void,
    priceContext: TokenPriceContextType,
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
            depositAmount,
          );
          return result;
        };
      case Action.deposit:
        return async () => {
          setLastDepositInfo({
            inputAmount: inputBalance.formatted,
            outputAmount: outputAmountFormatted,
            inputSymbol: inputToken?.symbol || "",
            outputSymbol: vaultData.symbol,
          });
          updateLocalStorageObject(vaultData.id, {
            finalTransactionData: {
              inputAmount: inputBalance.formatted,
              outputAmount: outputAmountFormatted,
              inputSymbol: inputToken?.symbol || "",
              outputSymbol: vaultData.symbol,
              isDeposit: true,
              timestamp: Date.now(),
            },
          });
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
            setLastEventTxHash,
            setFailedOnConfirmation,
            setFailedTransaction,
            priceContext,
          );
          return result;
        };
      case Action.withdraw:
        return async () => {
          setLastWithdrawInfo({
            inputAmount: inputBalance.formatted,
            outputAmount: outputAmountFormatted,
            inputSymbol: inputToken?.symbol || "",
            outputSymbol: vaultData.symbol,
          });
          updateLocalStorageObject(vaultData.id, {
            finalTransactionData: {
              inputAmount: inputBalance.formatted,
              outputAmount: outputAmountFormatted,
              inputSymbol: inputToken?.symbol || "",
              outputSymbol: vaultData.symbol,
              isDeposit: false, 
              timestamp: Date.now(),
            },
          });
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
            setLastEventTxHash,
            setFailedOnConfirmation,
            setFailedTransaction,
          );
          return result;
        };
      default:
        return () => {
          return false;
        };
    }
  }
}
