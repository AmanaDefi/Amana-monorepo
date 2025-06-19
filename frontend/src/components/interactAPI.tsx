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
  getAssetsFromShares,
} from "@/actions/actions";
import MainActionButton from "@/components/button/MainActionButton";
import { MoonLoader } from "react-spinners";
import { AiOutlineCheck, AiOutlineExclamation } from "react-icons/ai";
import { isZetachain } from "@/utils/utils";
import {
  CHAIN_ID,
  CHAINS_EXPLORER_BASE_URL_MAINNET,
} from "@/constants/chainConfig";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import {
  SendUserOperationWithEOA,
  useSendUserOperation,
  useSmartAccountClient,
  useUser,
  UseUserResult,
} from "@account-kit/react";
import { useWallet, WalletContextState } from "@solana/wallet-adapter-react";
import { trackEvent } from "@/utils/trackEvent";
import Blockpi from "@/service/blockpi";
import { showWarningToast } from "@/toasts";
import {
  CheckTheTxIsInProgress,
  getLocalStorageObject,
  updateLocalStorageObject,
} from "@/utils/localStorageUtils";
import { Address, Chain } from "viem";
import { getPublicClient } from "@/utils/getPublicClient";
import Button from "./Button";
import { useTransactionStore } from "@/store/transactionStore";

function isHex(value: string): value is `0x${string}` {
  return typeof value === "string" && value.startsWith("0x");
}

const handleDepositTransaction = async (
  vaultData: VaultData,
  inputBalance: Balance,
  inputToken: Token,
  walletContext: WalletContextState,
  activeAccount: UseUserResult,
  setTransactionCompleted: (value: boolean) => void,
  activeChain: any,
  setCrosschainInvestHash: Function,
  setcrossChainTxId: Function,
  setInputBalance: Function,
  setLastEventTxHash: Function,
  sendUserOperation: Function,
) => {
  console.log("deposit", activeAccount);
  if (!activeAccount) return;
  console.log("=== DEPOSIT TRANSACTION START ===");
  console.log("Active Chain ID:", activeChain.id);
  console.log("Vault Strategy Chain ID:", vaultData.protocol.chainId);
  console.log("Active Chain Name:", activeChain.name);

  setTransactionCompleted(false);
  updateLocalStorageObject(vaultData.id, { transactionCompleted: false });

  try {
    const depositAmount = inputBalance.value;
    console.log(
      "[Deposit Debug] vault=",
      vaultData.id.toString(),
      "tokenAmount=",
      depositAmount.toString(),
      "usdAmount=",
      inputBalance.formattedUSD ||
        (Number(inputBalance.formatted) * (inputToken.price || 0)).toFixed(2),
    );

    console.log("🚀 [DEPOSIT] About to call executeDeposit...");
    const receipt = await executeDeposit(
      vaultData,
      inputToken,
      walletContext,
      activeAccount,
      activeChain,
      depositAmount,
      setcrossChainTxId,
      sendUserOperation,
    );
    if (!receipt || !receipt.transactionHash) {
      throw new Error("Failed Tx");
    }

    console.log("✅ [DEPOSIT] executeDeposit completed successfully!");
    console.log("📋 [DEPOSIT] Receipt received:", receipt);
    console.log(
      "🔗 [DEPOSIT] Receipt.transactionHash:",
      receipt.transactionHash,
    );
    console.log("🆔 [DEPOSIT] Receipt type:", typeof receipt.transactionHash);
    console.log(
      "📏 [DEPOSIT] Receipt hash length:",
      receipt.transactionHash?.length,
    );

    // 🔧 ARCHITECTURAL FIX: Wrap analytics in its own try-catch so it can't break core functionality
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
          activeChain.id === CHAIN_ID.solana
            ? walletContext.publicKey?.toBase58()
            : activeAccount.address,
        chain: activeChain.id,
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
      CHAINS_EXPLORER_BASE_URL_MAINNET[activeChain.id] ?? "";
    updateLocalStorageObject(vaultData.id, {
      lastEventTxHash: `${activeChainExplorerBaseUrl}/tx/${receipt.transactionHash}`,
      crosschainInvestHash: receipt.transactionHash ?? "",
    });
    if (activeChain.id === CHAIN_ID.solana) {
      // Solana handling - no waitForReceipt needed
      console.log(
        "🌊 [SOLANA] Solana transaction handling - receipt confirmed on-chain",
      );
    } else {
      console.log("EVM transaction, waiting for receipt confirmation");

      const publicClient = getPublicClient(activeChain.id);
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
      // Type 1: Direct deposit from Zetachain to vault with Zetachain strategy
      // No BlockPI tracking needed - direct transaction
      console.log("=== TYPE 1 TRANSACTION DETECTED ===");
      console.log(`Direct Zetachain transaction, no BlockPI tracking needed`);
      setCrosschainInvestHash(receipt.transactionHash);
      console.log(
        "setCrosschainInvestHash called with:",
        receipt.transactionHash,
      );
    } else if (!isUserOnZetachain) {
      // Type 3 & 4: Cross-chain deposits from non-Zetachain chains
      // The receipt.transactionHash is the localhash for BlockPI tracking
      console.log("=== TYPE 3/4 TRANSACTION DETECTED ===");
      console.log(
        `Cross-chain from ${activeChain.name}, setting localhash: ${receipt.transactionHash}`,
      );
      setCrosschainInvestHash(receipt.transactionHash);
      console.log(
        "setCrosschainInvestHash called with:",
        receipt.transactionHash,
      );
    } else {
      // Fallback - set the hash anyway
      console.log("=== FALLBACK TRANSACTION ===");
      console.log(`Setting hash: ${receipt.transactionHash}`);
      setCrosschainInvestHash(receipt.transactionHash);
      console.log(
        "setCrosschainInvestHash called with:",
        receipt.transactionHash,
      );
    }

    console.log("🎉 [DEPOSIT] DEPOSIT TRANSACTION RETURNING TRUE ===");
    return true;
  } catch (error: any) {
    console.error("❌ [DEPOSIT] DEPOSIT TRANSACTION FAILED ===");
    console.error("🔥 [DEPOSIT] Error details:", error);
    console.error("🔥 [DEPOSIT] Error message:", error.message);
    console.error("🔥 [DEPOSIT] Error stack:", error.stack);

    // 🔧 ARCHITECTURAL FIX: Only track actual transaction failures, not analytics failures
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
    } catch (analyticsError) {
      console.warn(
        "📊 [ANALYTICS] Failed to track deposit failure event:",
        analyticsError,
      );
    }

    console.log("🔴 [DEPOSIT] DEPOSIT TRANSACTION RETURNING FALSE ===");
    return false;
  }
};

const handleWithdrawTransaction = async (
  vaultData: VaultData,
  inputBalance: Balance,
  withdrawToken: Token,
  walletContext: WalletContextState,
  activeAccount: UseUserResult,
  setTransactionCompleted: (value: boolean) => void,
  activeChain: any,
  setCrosschainInvestHash: Function,
  setcrossChainTxId: Function,
  setInputBalance: Function,
  setLastEventTxHash: Function,
  sendUserOperation: Function,
) => {
  if (!activeAccount) return;
  console.log("=== WITHDRAW TRANSACTION START ===");
  setTransactionCompleted(false);
  updateLocalStorageObject(vaultData.id, { transactionCompleted: false });

  let withdrawZRC20;
  if (activeChain.id === 7001 || activeChain.id === 7000) {
    withdrawZRC20 = vaultData.inputToken;
  } else {
    withdrawZRC20 = withdrawToken.ZRC20equivalent;
  }
  console.log("Withdraw ZRC20:", withdrawZRC20);
  if (!withdrawToken || !withdrawZRC20) {
    throw new Error("Withdraw token not found");
  }

  try {
    const withdrawAssetAmount = inputBalance.value;
    console.log(
      "[Withdraw Debug] vault=",
      vaultData.id.toString(),
      "assetAmount=",
      withdrawAssetAmount.toString(),
      "usdAmount=",
      inputBalance.formattedUSD ||
        (Number(inputBalance.formatted) * (withdrawToken.price || 0)).toFixed(
          2,
        ),
    );

    // 🔄 FIXED: No longer converting from shares to assets since withdrawAssetAmount IS already in asset terms
    const withdrawAmountFormatted =
      Number(withdrawAssetAmount) / 10 ** withdrawToken.decimals;
    console.log(
      "[Withdraw Debug] withdrawAmountFormatted=",
      withdrawAmountFormatted.toString(),
    );
    const amountUSD = (
      withdrawAmountFormatted * (withdrawToken.price || 0)
    ).toFixed(2);
    console.log("[Withdraw Debug] amountUSD=", amountUSD);

    // trackEvent("Withdraw Submitted", {
    //   vaultSymbol: vaultData.symbol,
    //   vault: vaultData.id.toString(),
    //   amount: withdrawAssetAmount.toString(),
    //   amountUSD: amountUSD,
    //   withdrawToken: withdrawToken.symbol,
    //   user: activeAccount.address,
    //   chain: activeChain.id,
    // });
    console.log("=== WITHDRAW TRANSACTION RECEIPT START ===");
    const receipt = await executeWithdrawal(
      vaultData,
      walletContext,
      activeAccount,
      activeChain,
      withdrawAssetAmount,
      withdrawToken.address as Address,
      withdrawZRC20 as Token,
      setcrossChainTxId,
      sendUserOperation,
    );

    if (!receipt.transactionHash) {
      throw new Error("error withdraw tx");
    }

    const activeChainExplorerBaseUrl =
      CHAINS_EXPLORER_BASE_URL_MAINNET[activeChain.id] ?? "";
    updateLocalStorageObject(vaultData.id, {
      lastEventTxHash: `${activeChainExplorerBaseUrl}/tx/${receipt.transactionHash}`,
      crosschainInvestHash: receipt.transactionHash ?? "",
    });
    console.log("=== WITHDRAW TRANSACTION RECEIPT RECEIVED ===");
    if (activeChain.id === CHAIN_ID.solana) {
      // Solana handling
    } else {
      const publicClient = getPublicClient(activeChain.id);
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

    setLastEventTxHash(
      `${activeChainExplorerBaseUrl}/tx/${receipt.transactionHash}`,
    );

    // Enhanced logic for determining withdrawal transaction type and setting correct hash for BlockPI
    const isUserOnZetachain = isZetachain(activeChain.id);
    const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);

    console.log(
      `[Withdrawal Type Detection] User on Zetachain: ${isUserOnZetachain}, Vault strategy on Zetachain: ${isVaultOnZetachain}`,
    );
    if (isUserOnZetachain && !isVaultOnZetachain) {
      // Type 2: Direct withdrawal from Zetachain from vault with non-Zetachain strategy
      // The receipt.transactionHash IS the localhash for BlockPI tracking
      console.log(
        `[Type 2 Withdrawal] Setting localhash for BlockPI: ${receipt.transactionHash}`,
      );
      setCrosschainInvestHash(receipt.transactionHash);
    } else if (isUserOnZetachain && isVaultOnZetachain) {
      // Type 1: Direct withdrawal from Zetachain from vault with Zetachain strategy
      // No BlockPI tracking needed - direct transaction
      console.log(
        `[Type 1 Withdrawal] Direct Zetachain transaction, no BlockPI tracking needed`,
      );
      setCrosschainInvestHash(receipt.transactionHash);
    } else if (!isUserOnZetachain) {
      // Type 3 & 4: Cross-chain withdrawals from non-Zetachain chains
      // The receipt.transactionHash is the localhash for BlockPI tracking
      console.log(
        `[Type 3/4 Withdrawal] Cross-chain from ${activeChain.name}, setting localhash: ${receipt.transactionHash}`,
      );
      setCrosschainInvestHash(receipt.transactionHash);
    } else {
      // Fallback - set the hash anyway
      setCrosschainInvestHash(receipt.transactionHash);
    }

    return true;
  } catch (error) {
    // 🔧 ARCHITECTURAL FIX: Wrap analytics in its own try-catch so it can't break core functionality
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
  hideStepsDisplay?: boolean;
  setLabel: Dispatch<SetStateAction<string>>;
  label: string;
}): JSX.Element {
  const activeAccount = useUser();
  // Core transaction state
  const [crosschainInvestHash, setCrosschainInvestHash] = useState("");
  const [crossChainTxId, setcrossChainTxId] = useState<string>("");
  const [isTransactionStarted, setIsTransactionStarted] = useState(false);
  const [lastEventTxHash, setLastEventTxHash] = useState("");
  const {
    setFinishedTransaction,
    setLastTransactionStepFeedback,
    setTransactionStepFeedback,
    transactionStepFeedback,
    lastTransactionStepFeedback,
    finishedTransaction,
    isTransactionProcessing,
    setIsTransactionProcessing,
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
  }, [vaultData.id]);

  const blockpi = useMemo(() => new Blockpi(), []);

  // Simple ref to track component lifecycle for cleanup
  const isComponentActiveRef = useRef(true);

  // Ref to prevent multiple concurrent tracking processes
  const isTrackingActiveRef = useRef(false);

  // Add the function here so it has access to all the component state
  function completeTransactionProcess(
    feedbackSnapshot: TransactionStepMessages,
  ) {
    console.log("[Transaction Complete] Starting completion process");

    // Use direct implementation instead of TransactionStateManager
    const txType = isDeposit ? "deposit" : "withdrawal";
    console.log(`[Transaction Complete] Processing ${txType} completion`);

    // Determine if this is a Type 2 transaction
    const isUserOnZetachain = isZetachain(activeChain.id);
    const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
    const isType2Transaction = isUserOnZetachain && !isVaultOnZetachain;

    console.log(
      `[Transaction Complete] Transaction type: ${isType2Transaction ? "Type 2" : "Type 4 or other"}`,
    );

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

    // 3. Trigger the completed UI state with "Done" button
    setFinishedTransaction(true);

    // 4. Clear transaction state to enable new transactions
    setIsTransactionProcessing(false);
    setIsTransactionStarted(false);
    setCrosschainInvestHash("");
    setcrossChainTxId("");
    updateLocalStorageObject(vaultData.id, {
      action: finalAction,
      isTransactionProcessing: false,
      isTransactionStarted: false,
      crosschainInvestHash: "",
      crossChainTxId: "",
      finishedTransaction: true,
      lastTransactionStepFeedback: feedbackSnapshot,
    });

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

    console.log("🔧 [DONE-BUTTON-DEBUG] actions useEffect triggered", {
      actionsLength: actions.length,
      finishedTransaction,
      hasTransactionSteps:
        Object.keys(transactionStepFeedback).length > 0 ||
        Object.keys(lastTransactionStepFeedback).length > 0,
      isTransactionStarted,
      isTransactionProcessing,
    });

    // 🔧 CRITICAL FIX: Don't reset action/step if we're in the middle of a transaction
    // This prevents the button label from going back to "Approve" during transaction flow
    if (
      !isTransactionStarted &&
      !isTransactionProcessing &&
      !finishedTransaction
    ) {
      console.log("🔧 [DONE-BUTTON-DEBUG] Safe to reset action and step");
      setAction(_action);
      setStep(0);
      updateLocalStorageObject(vaultData.id, {
        action: _action,
        isTransactionProcessing: false,
        isTransactionStarted: false,
        step: 0,
      });
    } else {
      console.log(
        "🔧 [DONE-BUTTON-DEBUG] NOT resetting action/step - transaction in progress or completed",
        {
          isTransactionStarted,
          isTransactionProcessing,
          finishedTransaction,
        },
      );
    }

    // Reset transaction processing states when actions change (new vault)
    // Only reset if we're truly changing vaults (not during transaction flow)
    if (
      !isTransactionStarted &&
      !isTransactionProcessing &&
      !finishedTransaction
    ) {
      setIsTransactionProcessing(false);
      setIsTransactionStarted(false);
    }

    // 🚨 CRITICAL FIX: Don't reset finishedTransaction if we have completed transaction steps
    // This prevents the Done button from disappearing after successful completion
    const hasCompletedTransactionSteps =
      Object.keys(transactionStepFeedback).length > 0 ||
      Object.keys(lastTransactionStepFeedback).length > 0;

    if (!finishedTransaction && !hasCompletedTransactionSteps) {
      console.log(
        "🔧 [DONE-BUTTON-DEBUG] Resetting finishedTransaction to false (no completed transaction)",
      );
      setFinishedTransaction(false);
    } else {
      console.log(
        "🔧 [DONE-BUTTON-DEBUG] NOT resetting finishedTransaction - preserving completed state",
        {
          finishedTransaction,
          hasCompletedTransactionSteps,
        },
      );
    }
  }, [actions, _action, vaultData.id, setAction, setStep]);

  // Simplified BlockPI tracking without complex callbacks
  useEffect(() => {
    console.log("=== SIMPLIFIED BLOCKPI EFFECT ===");
    console.log("crosschainInvestHash:", crosschainInvestHash);
    console.log("action:", action, `(${Action[action]})`);
    console.log("isTrackingActive:", isTrackingActiveRef.current);
    console.log("finishedTransaction:", finishedTransaction);
    console.log("🔍 [DONE-BUTTON-DEBUG] Effect conditions check:");
    console.log(
      "🔍 [DONE-BUTTON-DEBUG] - action === undefined:",
      action === undefined,
    );
    console.log(
      "🔍 [DONE-BUTTON-DEBUG] - finishedTransaction:",
      finishedTransaction,
    );
    console.log(
      "🔍 [DONE-BUTTON-DEBUG] - !crosschainInvestHash:",
      !crosschainInvestHash,
    );
    console.log(
      "🔍 [DONE-BUTTON-DEBUG] - isTrackingActiveRef.current:",
      isTrackingActiveRef.current,
    );

    // Only proceed if we have the right conditions
    if (action === undefined || finishedTransaction || !crosschainInvestHash) {
      console.log("=== SKIPPING TRACKING ===", {
        action,
        finishedTransaction,
        hasHash: !!crosschainInvestHash,
      });
      console.log(
        "🔍 [DONE-BUTTON-DEBUG] SKIPPING - one of the skip conditions is true",
      );
      return;
    }

    // CRITICAL FIX: Prevent multiple concurrent tracking processes
    if (isTrackingActiveRef.current) {
      console.log("=== TRACKING ALREADY ACTIVE - SKIPPING ===");
      console.log("🔍 [DONE-BUTTON-DEBUG] SKIPPING - tracking already active");
      return;
    }

    // Check if this is the right action to start tracking
    const isDepositConfirmed =
      action === Action.depositConfirmed || action === Action.deposit;
    const isWithdrawConfirmed =
      action === Action.withdrawconfirmed || action === Action.withdraw;

    console.log("🔍 [DONE-BUTTON-DEBUG] Action checks:");
    console.log(
      "🔍 [DONE-BUTTON-DEBUG] - isDepositConfirmed:",
      isDepositConfirmed,
    );
    console.log(
      "🔍 [DONE-BUTTON-DEBUG] - isWithdrawConfirmed:",
      isWithdrawConfirmed,
    );

    if (!isDepositConfirmed && !isWithdrawConfirmed) {
      console.log("=== WRONG ACTION FOR TRACKING ===", action);
      console.log(
        "🔍 [DONE-BUTTON-DEBUG] SKIPPING - wrong action for tracking",
      );
      return;
    }

    // Determine transaction details
    const transactionType: "deposit" | "withdrawal" = isDepositConfirmed
      ? "deposit"
      : "withdrawal";
    const isUserOnZetachain = isZetachain(activeChain?.id);
    const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);
    const isType2 = isUserOnZetachain && !isVaultOnZetachain;

    console.log(
      `[BlockPI Simple] Starting ${transactionType} tracking (Type2: ${isType2})`,
    );

    // Skip tracking for Type 1 transactions
    if (isUserOnZetachain && isVaultOnZetachain) {
      console.log("[BlockPI Simple] Type 1 - moving directly to completion");
      console.log(
        "🎯 [DONE-BUTTON-DEBUG] Type 1 transaction - setting finishedTransaction to true directly",
      );
      setTimeout(() => {
        const finalAction =
          transactionType === "deposit" ? Action.deposited : Action.withdrew;
        const nextStep = actions.findIndex((el) => el === finalAction);
        console.log(
          "🎯 [DONE-BUTTON-DEBUG] Type 1 finalAction:",
          finalAction,
          `(${Action[finalAction]})`,
        );
        console.log("🎯 [DONE-BUTTON-DEBUG] Type 1 nextStep:", nextStep);
        if (nextStep >= 0) {
          setAction(finalAction);
          setStep(nextStep);
          console.log(
            "🎯 [DONE-BUTTON-DEBUG] Type 1 - Calling setFinishedTransaction(true)",
          );
          setFinishedTransaction(true);

          updateLocalStorageObject(vaultData.id, {
            action: finalAction,
            step: nextStep,
            finishedTransaction: true,
            transactionCompleted: true,
          });
          console.log(
            "🎯 [DONE-BUTTON-DEBUG] Type 1 - Called setFinishedTransaction(true) - Done button should appear",
          );

          // 🔄 NEW: Trigger automatic balance refresh for Type 1 transactions
          console.log(
            "🎯 [AUTO-REFRESH-TYPE1] Type 1 transaction completed - triggering automatic balance refresh...",
            {
              finalAction,
              transactionType,
              timestamp: new Date().toISOString(),
            },
          );

          // Set transactionCompleted to true to trigger balance refresh
          console.log("setTransactionCompleted useEffect");
          setTransactionCompleted(true);

          // Also call manual refresh for good measure
          setTimeout(() => {
            console.log(
              "💰 [AUTO-REFRESH-TYPE1] Calling manual refreshBalance after Type 1 transaction completion...",
              {
                timestamp: new Date().toISOString(),
              },
            );
            refreshBalance();
          }, 2000); // Wait 2 seconds for the blockchain to update
        }
      }, 1000);
      return;
    }

    // Start the progressive tracking with real-time updates
    const trackTransaction = async () => {
      try {
        // Mark tracking as active to prevent concurrent processes
        isTrackingActiveRef.current = true;
        console.log("[BlockPI Progressive] Starting transaction tracking...");

        // Define action mapping once
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

        // Define callback for real-time step updates
        const onStepComplete = (stepIndex: number, stepData: any) => {
          console.log(
            `[UI Progressive] Step ${stepIndex + 1} completed, updating UI`,
          );

          const actionKey = actionMapping[stepIndex];
          console.log("actionKey", actionKey, actionMapping);
          if (!actionKey) return;

          // Update just this step in real-time
          useTransactionStore.setState((prev) => {
            updateLocalStorageObject(vaultData.id, {
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

          // CRITICAL FIX: Only update step/action for completed steps, and avoid triggering useEffect
          if (
            stepData.status === "completed" &&
            stepIndex < actionMapping.length
          ) {
            // Only update step, avoid updating action to prevent useEffect retrigger
            setStep(stepIndex);
            updateLocalStorageObject(vaultData.id, {
              step: stepIndex,
            });
            console.log(
              `[UI Progressive] Updated step to ${stepIndex}, avoiding action update to prevent useEffect retrigger`,
            );
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
          activeChain.id,
          vaultData.protocol.chainId,
        );

        console.log("[BlockPI Progressive] Final result:", result);
        console.log("[BlockPI Progressive] result.success:", result.success);
        console.log(
          "[BlockPI Progressive] result.completedSteps:",
          result.completedSteps,
        );
        console.log(
          "[BlockPI Progressive] result.totalSteps:",
          result.totalSteps,
        );

        if (result.success) {
          console.log(
            "🎉 [DONE-BUTTON-DEBUG] BlockPI tracking SUCCESS - setting finishedTransaction to true",
          );
          console.log(
            "🎉 [DONE-BUTTON-DEBUG] transactionType:",
            transactionType,
          );
          console.log(
            "🎉 [DONE-BUTTON-DEBUG] About to call setFinishedTransaction(true)",
          );

          // Move to final completed state
          const finalAction =
            transactionType === "deposit" ? Action.deposited : Action.withdrew;
          console.log(
            "🎉 [DONE-BUTTON-DEBUG] finalAction:",
            finalAction,
            `(${Action[finalAction]})`,
          );

          setAction(finalAction);
          setStep(actionMapping.length - 1);

          // IMPORTANT: Capture current transaction steps before switching to finished state
          useTransactionStore.setState((prev) => {
            setLastTransactionStepFeedback(prev.transactionStepFeedback);
            updateLocalStorageObject(vaultData.id, {
              transactionStepFeedback: prev.transactionStepFeedback,
              lastTransactionStepFeedback: prev.transactionStepFeedback,
            });

            return { transactionStepFeedback: prev.transactionStepFeedback };
          });

          setFinishedTransaction(true);
          console.log(
            "🎉 [DONE-BUTTON-DEBUG] Called setFinishedTransaction(true) - Done button should appear",
          );
          setIsTransactionProcessing(false);

          updateLocalStorageObject(vaultData.id, {
            step: actionMapping.length - 1,
            action: finalAction,
            finishedTransaction: true,
            isTransactionProcessing: false,
          });

          // 🔄 NEW: Trigger automatic balance refresh when transaction completes
          console.log(
            "🎯 [AUTO-REFRESH] Transaction completed successfully - triggering automatic balance refresh...",
            {
              finalAction,
              transactionType,
              timestamp: new Date().toISOString(),
            },
          );

          // Set transactionCompleted to true to trigger balance refresh
          console.log("setTransactionCompleted result.success");
          setTransactionCompleted(true);

          // Also call manual refresh for good measure
          setTimeout(() => {
            console.log(
              "💰 [AUTO-REFRESH] Calling manual refreshBalance after transaction completion...",
              {
                timestamp: new Date().toISOString(),
              },
            );
            refreshBalance();
          }, 2000); // Wait 2 seconds for the blockchain to update

          trackEvent("Transaction Crosschain Complete", {
            vaultSymbol: vaultData.symbol,
            vault: vaultData.id,
            type: transactionType,
          });
        } else {
          // Handle error
          console.error(
            "[BlockPI Progressive] Transaction failed:",
            result.error,
          );

          console.error(
            "[BlockPI Progressive] Transaction failed:",
            result.error,
          );
          console.log(
            "❌ [DONE-BUTTON-DEBUG] BlockPI tracking FAILED - setting finishedTransaction to true for error case",
          );

          // IMPORTANT: Capture current transaction steps before clearing state (for failed transactions)
          useTransactionStore.setState((prev) => {
            setLastTransactionStepFeedback(prev.transactionStepFeedback);
            updateLocalStorageObject(vaultData.id, {
              transactionStepFeedback: prev.transactionStepFeedback,
              lastTransactionStepFeedback: prev.transactionStepFeedback,
              finishedTransaction: true,
              isTransactionProcessing: false,
              isTransactionStarted: false,
            });

            return { transactionStepFeedback: prev.transactionStepFeedback };
          });

          console.log(
            "❌ [DONE-BUTTON-DEBUG] Calling setFinishedTransaction(true) for failed transaction",
          );
          setFinishedTransaction(true); // Show "Done" button even for failures
          console.log(
            "❌ [DONE-BUTTON-DEBUG] Called setFinishedTransaction(true) - Done button should appear for failed transaction",
          );
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
        // CRITICAL FIX: Always mark tracking as inactive when done, regardless of success/failure
        console.log("[BlockPI Progressive] Marking tracking as inactive");
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
    activeChain.id,
    blockpi,
    setAction,
    setStep,
    vaultData,
  ]);

  // No longer restoring transaction state from localStorage
  // This ensures we always start fresh and rely only on API responses

  // Track finishedTransaction state changes
  useEffect(() => {
    console.log(
      "🔍 [DONE-BUTTON-DEBUG] finishedTransaction state changed to:",
      finishedTransaction,
    );
    if (finishedTransaction) {
      console.log(
        "🔍 [DONE-BUTTON-DEBUG] finishedTransaction is now TRUE - Done button should be visible",
      );
      console.log("🔍 [DONE-BUTTON-DEBUG] Current state snapshot:", {
        finishedTransaction,
        transactionStepFeedbackKeys: Object.keys(transactionStepFeedback),
        lastTransactionStepFeedbackKeys: Object.keys(
          lastTransactionStepFeedback,
        ),
        isTransactionProcessing,
        isTransactionStarted,
        crosschainInvestHash: !!crosschainInvestHash,
      });
    } else {
      console.log(
        "🚨 [DONE-BUTTON-DEBUG] finishedTransaction was set to FALSE - this is why Done button disappears!",
      );
      console.trace(
        "🚨 [DONE-BUTTON-DEBUG] Stack trace for finishedTransaction=false:",
      );
    }
  }, [finishedTransaction]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      console.log("[Component] Unmounting - marking component as inactive");
      isComponentActiveRef.current = false;
    };
  }, []);

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
}): JSX.Element {
  const activeAccount = useUser();
  const walletContext = useWallet();
  const prevLebel = useRef(label);
  const { client: scaClient } = useSmartAccountClient({
    type: "MultiOwnerModularAccount",
  });
  const { sendUserOperation } = useSendUserOperation({
    client: scaClient,
    waitForTxn: true,
    onError: (error) => {
      let errorMessage = error.message;

      const detailsIndex = errorMessage.indexOf("Details:");
      if (detailsIndex !== -1) {
        errorMessage = errorMessage.slice(detailsIndex);
      }
    },
  });
  // Simplified feedback update for local transactions only
  function updateLocalTransactionFeedback(
    actionKey: Action,
    status: TransactionStepStatus,
    description: string,
    txHash?: string,
  ) {
    console.log(
      `[Local Feedback] Updating ${actionKey} with status: ${status}`,
    );

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
        transactionStepFeedback: updated,
      });

      return { transactionStepFeedback: updated };
    });
  }

  async function interactionPostHook(success: boolean) {
    console.log("=== INTERACTION POST HOOK CALLED ===");
    console.log("🔍 [POST-HOOK] Success:", success);
    console.log(
      "🎯 [POST-HOOK] Current action:",
      action,
      `(${Action[action]})`,
    );
    console.log("📍 [POST-HOOK] Current step:", step);
    console.log(
      "📋 [POST-HOOK] Actions array:",
      actions.map((a, i) => `${i}: ${Action[a]}`),
    );
    console.log(
      "➡️ [POST-HOOK] Next action would be:",
      actions[step + 1] ? Action[actions[step + 1]] : "undefined",
    );

    if (success) {
      console.log("✅ [POST-HOOK] === SUCCESS BRANCH ===");

      // Check approval flow
      if (actions[step + 1] == Action.depositApproveConfirmed) {
        console.log("💰 [POST-HOOK] === APPROVAL CONFIRMED BRANCH ===");
        // Update approval feedback to completed before moving to next step
        updateLocalTransactionFeedback(
          Action.depositApprove,
          TransactionStepStatus.completed,
          "Approval transaction confirmed",
        );

        // Reset transaction processing state to allow next transaction
        setIsTransactionProcessing(false);

        const nextStep = step + 1;
        setAction(actions[nextStep]);
        setStep(nextStep);
        updateLocalStorageObject(vaultData.id, {
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
        }, 100);
      }

      // Check deposit flow
      console.log("🔍 [POST-HOOK] Checking deposit conditions:");
      console.log(
        "🔍 [POST-HOOK] - action == Action.deposit:",
        action == Action.deposit,
      );
      console.log(
        "🔍 [POST-HOOK] - actions[step + 1]:",
        actions[step + 1],
        actions[step + 1] ? `(${Action[actions[step + 1]]})` : "undefined",
      );
      console.log(
        "🔍 [POST-HOOK] - Action.depositConfirmed:",
        Action.depositConfirmed,
      );
      console.log(
        "🔍 [POST-HOOK] - actions[step + 1] == Action.depositConfirmed:",
        actions[step + 1] == Action.depositConfirmed,
      );

      // 🔧 CRITICAL FIX: Handle both Type 2 and Type 4 deposit transactions
      // Type 2: action=deposit, next might be crosschainInvest or deposited directly
      // Type 4: action=deposit, next should be depositConfirmed
      const isDepositFlow = action == Action.deposit;
      const hasDepositConfirmed = actions[step + 1] == Action.depositConfirmed;
      const isType2Flow = isDepositFlow && !hasDepositConfirmed; // Type 2 doesn't have depositConfirmed

      console.log("🔍 [POST-HOOK] Flow analysis:");
      console.log("🔍 [POST-HOOK] - isDepositFlow:", isDepositFlow);
      console.log("🔍 [POST-HOOK] - hasDepositConfirmed:", hasDepositConfirmed);
      console.log("🔍 [POST-HOOK] - isType2Flow:", isType2Flow);

      if (isDepositFlow && (hasDepositConfirmed || isType2Flow)) {
        console.log(
          "🏦 [POST-HOOK] === DEPOSIT TO DEPOSIT CONFIRMED TRANSITION ===",
        );
        console.log(
          "📍 [POST-HOOK] Current step:",
          step,
          "Next step:",
          step + 1,
        );
        console.log(
          "➡️ [POST-HOOK] Next action should be:",
          actions[step + 1],
          `(${Action[actions[step + 1]]})`,
        );

        // Update deposit feedback to completed before moving to next step
        const isUserOnZetachain = isZetachain(activeChain.id);
        const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);

        console.log("🔍 [POST-HOOK] Chain analysis:");
        console.log("🔍 [POST-HOOK] - isUserOnZetachain:", isUserOnZetachain);
        console.log("🔍 [POST-HOOK] - isVaultOnZetachain:", isVaultOnZetachain);
        console.log("🔍 [POST-HOOK] - activeChain.id:", activeChain.id);
        console.log("🔍 [POST-HOOK] - activeChain.name:", activeChain.name);

        let successMessage;
        if (isUserOnZetachain && !isVaultOnZetachain) {
          // Type 2: Direct deposit from Zetachain to vault with non-Zetachain strategy
          successMessage = "Initial deposit transaction on Zetachain completed";
          console.log(
            "🔗 [POST-HOOK] Type 2 detected - BlockPI should start after action change",
          );
        } else if (isUserOnZetachain && isVaultOnZetachain) {
          // Type 1: Direct deposit from Zetachain to vault with Zetachain strategy
          successMessage = "Deposit transaction completed";
          console.log("✅ [POST-HOOK] Type 1 detected - no BlockPI needed");
        } else {
          // Type 3 & 4: Cross-chain deposits (including Solana)
          const chainName = activeChain.name || "local chain";
          successMessage = `Initial deposit transaction on ${chainName} completed`;
          console.log(
            "🌐 [POST-HOOK] Type 3/4 detected - BlockPI should start after action change",
          );
        }

        console.log("💬 [POST-HOOK] Success message:", successMessage);
        console.log("🔗 [POST-HOOK] lastEventTxHash:", lastEventTxHash);

        // CRITICAL FIX: Pass the transaction hash from lastEventTxHash for completed feedback
        updateLocalTransactionFeedback(
          Action.deposit,
          TransactionStepStatus.completed,
          successMessage,
          lastEventTxHash, // Pass the transaction hash to show in UI
        );

        // Reset transaction processing state - BlockPI will take over
        setIsTransactionProcessing(false);
        console.log("⏸️ [POST-HOOK] Set isTransactionProcessing to false");

        if (hasDepositConfirmed) {
          // Type 4 flow: move to depositConfirmed
          const nextStep = step + 1;
          console.log(
            "➡️ [POST-HOOK] Type 4: Setting action to:",
            actions[nextStep],
            `(${Action[actions[nextStep]]})`,
            "and step to:",
            nextStep,
          );

          // CRITICAL FIX: Ensure the next action exists before updating state
          if (actions[nextStep] === undefined) {
            console.error(
              `🚨 [POST-HOOK] CRITICAL ERROR: Action at index ${nextStep} is undefined. actions array:`,
              actions,
            );
            return; // Don't update state if the next action is undefined
          }

          // Set both state updates in a single render cycle to prevent inconsistency
          setTimeout(() => {
            console.log(
              `✅ [POST-HOOK] SAFE UPDATE: Setting action to ${Action[actions[nextStep]]} and step to ${nextStep}`,
            );
            setAction(actions[nextStep]);
            setStep(nextStep);
            console.log(
              "🔄 [POST-HOOK] Action and step updated in sync - this should trigger BlockPI effect",
            );
          }, 50);
        } else if (isType2Flow) {
          // Type 2 flow: transition directly to depositConfirmed for BlockPI tracking
          console.log(
            "➡️ [POST-HOOK] Type 2: Setting action to depositConfirmed for BlockPI tracking",
          );
          setTimeout(() => {
            console.log(
              `✅ [POST-HOOK] Type 2: Setting action to depositConfirmed and keeping step at ${step}`,
            );
            setAction(Action.depositConfirmed);
            // Don't increment step for Type 2, let BlockPI handle the progression
            console.log(
              "🔄 [POST-HOOK] Type 2: Action set to depositConfirmed - this should trigger BlockPI effect",
            );
          }, 50);
        }
      } else {
        console.log(
          "⏭️ [POST-HOOK] Deposit condition not met, checking withdraw...",
        );
      }

      // Check withdraw flow
      console.log("🔍 [POST-HOOK] Checking withdraw conditions:");
      console.log(
        "🔍 [POST-HOOK] - action == Action.withdraw:",
        action == Action.withdraw,
      );
      console.log(
        "🔍 [POST-HOOK] - actions[step + 1] == Action.withdrawconfirmed:",
        actions[step + 1] == Action.withdrawconfirmed,
      );

      if (
        action == Action.withdraw &&
        actions[step + 1] == Action.withdrawconfirmed
      ) {
        console.log(
          "🏧 [POST-HOOK] === WITHDRAW TO WITHDRAW CONFIRMED TRANSITION ===",
        );

        // Update withdraw feedback to completed before moving to next step
        const isUserOnZetachain = isZetachain(activeChain.id);
        const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);

        let successMessage;
        if (isUserOnZetachain && !isVaultOnZetachain) {
          // Type 2: Direct withdrawal from Zetachain from vault with non-Zetachain strategy
          successMessage =
            "Initial withdraw transaction on Zetachain completed";
        } else if (isUserOnZetachain && isVaultOnZetachain) {
          // Type 1: Direct withdrawal from Zetachain from vault with Zetachain strategy
          successMessage = "Withdraw transaction completed";
        } else {
          // Type 3 & 4: Cross-chain withdrawals (including Solana)
          const chainName = activeChain.name || "local chain";
          successMessage = `Initial withdraw transaction on ${chainName} completed`;
        }

        console.log("💬 [POST-HOOK] Withdraw success message:", successMessage);

        // CRITICAL FIX: Pass the transaction hash from lastEventTxHash for completed feedback
        updateLocalTransactionFeedback(
          Action.withdraw,
          TransactionStepStatus.completed,
          successMessage,
          lastEventTxHash, // Pass the transaction hash to show in UI
        );

        // Reset transaction processing state - BlockPI will take over
        setIsTransactionProcessing(false);

        const nextStep = step + 1;
        setAction(actions[nextStep]);
        setStep(nextStep);
        updateLocalStorageObject(vaultData.id, {
          action: actions[nextStep],
          step: nextStep,
          isTransactionProcessing: false,
        });
      } else {
        console.log("⏭️ [POST-HOOK] Withdraw condition not met");
      }

      // If no conditions were met, log it
      const depositConditionMet =
        action == Action.deposit &&
        (actions[step + 1] == Action.depositConfirmed ||
          !actions.includes(Action.depositConfirmed));
      if (
        !(actions[step + 1] == Action.depositApproveConfirmed) &&
        !depositConditionMet &&
        !(
          action == Action.withdraw &&
          actions[step + 1] == Action.withdrawconfirmed
        )
      ) {
        console.log("🤔 [POST-HOOK] NO SUCCESS CONDITIONS MET!");
        console.log(
          "🤔 [POST-HOOK] This might be why the UI shows failure even though transaction succeeded",
        );
        console.log("🤔 [POST-HOOK] Debug info:", {
          action: Action[action],
          step,
          nextAction: actions[step + 1]
            ? Action[actions[step + 1]]
            : "undefined",
          actions: actions.map((a) => Action[a]),
          depositConditionMet,
        });
      }
    } else {
      console.log("❌ [POST-HOOK] === FAILURE BRANCH ===");
      // Handle local transaction failures
      if (action == Action.depositApprove) {
        console.log("💸 [POST-HOOK] Handling deposit approve failure");
        updateLocalTransactionFeedback(
          action,
          TransactionStepStatus.error,
          "Approval transaction failed, please try again",
        );
      }
      if (action == Action.deposit) {
        console.log("🏦 [POST-HOOK] Handling deposit failure");
        updateLocalTransactionFeedback(
          action,
          TransactionStepStatus.error,
          "Local transaction failed, please try again",
        );
      }
      if (action == Action.withdraw) {
        console.log("🏧 [POST-HOOK] Handling withdraw failure");
        updateLocalTransactionFeedback(
          action,
          TransactionStepStatus.error,
          "Local transaction failed, please try again",
        );
      }

      // Reset transaction state to allow retry
      updateLocalStorageObject(vaultData.id, {
        isTransactionProcessing: false,
        isTransactionStarted: false,
        transactionStepFeedback: {},
      });
      setIsTransactionProcessing(false);
      setIsTransactionStarted(false);
      setTransactionStepFeedback({});
    }

    console.log("🏁 [POST-HOOK] === INTERACTION POST HOOK COMPLETED ===");
  }

  const handleMainAction = async () => {
    console.log("=== HANDLE MAIN ACTION CALLED ===");
    console.log(
      "🎯 [MAIN-ACTION] Current action:",
      action,
      `(${Action[action]})`,
    );
    console.log(
      "🔄 [MAIN-ACTION] isTransactionProcessing:",
      isTransactionProcessing,
    );

    if (isTransactionProcessing) {
      console.log("⏸️ [MAIN-ACTION] === EARLY RETURN - ALREADY PROCESSING ===");
      return;
    }

    setIsTransactionProcessing(true);
    updateLocalStorageObject(vaultData.id, {
      isTransactionProcessing: true,
    });
    console.log("Set isTransactionProcessing to true");

    // Ensure component is marked as active for new transactions
    isComponentActiveRef.current = true;
    console.log("Set component as active");

    // Show warning toast to inform users not to leave the page during transaction processing
    if (action === Action.deposit || action === Action.withdraw) {
      showWarningToast(
        "📌 Please stay on this page to monitor progress across all networks!",
      );
    }

    if (action == Action.depositApprove) {
      trackEvent("Approve Clicked", {
        vaultSymbol: vaultData.symbol,
        token: inputToken.symbol,
      });
      updateLocalTransactionFeedback(
        action,
        TransactionStepStatus.processing,
        "Approval in progress",
      );
    } else {
      setIsTransactionStarted(true);
      updateLocalStorageObject(vaultData.id, {
        isTransactionStarted: true,
      });
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

      console.log("🏦 [MAIN-ACTION] Deposit description:", description);
      updateLocalTransactionFeedback(
        action,
        TransactionStepStatus.processing,
        description,
      );
    }

    if (action == Action.withdraw) {
      // Determine withdrawal transaction type for better UI feedback
      const isUserOnZetachain = isZetachain(activeChain.id);
      const isVaultOnZetachain = isZetachain(vaultData.protocol.chainId);

      let description;
      if (isUserOnZetachain && !isVaultOnZetachain) {
        // Type 2: Direct withdrawal from Zetachain from vault with non-Zetachain strategy
        description = "Initial withdraw transaction on zetachain in progress";
      } else if (isUserOnZetachain && isVaultOnZetachain) {
        // Type 1: Direct withdrawal from Zetachain from vault with Zetachain strategy
        description = `Withdrawing ${inputBalance.formatted} ${vaultData.inputToken.symbol}`;
      } else {
        // Type 3 & 4: Cross-chain withdrawals
        description = `Initial withdraw transaction on ${activeChain.name} in progress`;
      }

      console.log("🏧 [MAIN-ACTION] Withdraw description:", description);
      updateLocalTransactionFeedback(
        action,
        TransactionStepStatus.processing,
        description,
      );
    }

    console.log("🔄 [MAIN-ACTION] === CALLING HANDLE INTERACTION ===");
    console.log("📋 [MAIN-ACTION] About to call handleInteraction with:");
    console.log("📋 [MAIN-ACTION] - vaultData:", vaultData.symbol);
    console.log("📋 [MAIN-ACTION] - inputBalance:", inputBalance.formatted);
    console.log("📋 [MAIN-ACTION] - inputToken:", inputToken.symbol);
    console.log("📋 [MAIN-ACTION] - activeAccount:", activeAccount?.address);
    console.log(
      "📋 [MAIN-ACTION] - walletContext public key:",
      walletContext.publicKey?.toBase58(),
    );
    console.log(
      "📋 [MAIN-ACTION] - activeChain:",
      activeChain.name,
      `(${activeChain.id})`,
    );
    console.log("📋 [MAIN-ACTION] - action:", Action[action]);

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
      setLastEventTxHash,
      sendUserOperation,
    )();

    console.log("✅ [MAIN-ACTION] === HANDLE INTERACTION COMPLETED ===");
    console.log("🎯 [MAIN-ACTION] Success result:", success);
    console.log("🆔 [MAIN-ACTION] Success result type:", typeof success);
    console.log("🔢 [MAIN-ACTION] Success result as boolean:", !!success);

    console.log("📞 [MAIN-ACTION] === CALLING INTERACTION POST HOOK ===");
    await interactionPostHook(!!success);
    console.log("🏁 [MAIN-ACTION] === MAIN ACTION COMPLETED ===");
  };

  const handleDone = useCallback(() => {
    console.log("[UI] handleDone called - clearing all transaction state");
    console.log(
      "🎯 [DONE-BUTTON-DEBUG] handleDone function executed - this means Done button was clicked!",
    );
    console.log(
      "🎯 [TRANSACTION-COMPLETE] User clicked Done button, starting cleanup...",
      {
        timestamp: new Date().toISOString(),
        transactionStepFeedback: Object.keys(transactionStepFeedback).length,
        lastTransactionStepFeedback: Object.keys(lastTransactionStepFeedback)
          .length,
        crosschainInvestHash: !!crosschainInvestHash,
        isTransactionProcessing,
        finishedTransaction,
      },
    );

    // Mark component as inactive to prevent any ongoing BlockPI updates
    isComponentActiveRef.current = false;
    // Also stop any active tracking
    isTrackingActiveRef.current = false;

    // Clear component state
    setLastTransactionStepFeedback({});
    setTransactionStepFeedback({});
    setFinishedTransaction(false);

    console.log(
      "🔄 [TRANSACTION-COMPLETE] Setting transactionCompleted to true - this should trigger balance refresh...",
      {
        timestamp: new Date().toISOString(),
      },
    );
    setTransactionCompleted(true);

    setIsTransactionProcessing(false);
    setIsTransactionStarted(false);
    setCrosschainInvestHash("");
    setcrossChainTxId("");

    updateLocalStorageObject(vaultData.id, {
      lastTransactionStepFeedback: {},
      transactionStepFeedback: {},
      finishedTransaction: false,
      transactionCompleted: false,
      isTransactionProcessing: false,
      isTransactionStarted: false,
      crosschainInvestHash: "",
      crossChainTxId: "",
    });

    // Reactivate component after clearing
    setTimeout(() => {
      isComponentActiveRef.current = true;
      console.log(
        "⏰ [TRANSACTION-COMPLETE] Component reactivated after timeout",
        {
          timestamp: new Date().toISOString(),
        },
      );
    }, 100);

    // Refresh balance
    console.log(
      "💰 [TRANSACTION-COMPLETE] Calling refreshBalance manually...",
      {
        timestamp: new Date().toISOString(),
      },
    );
    refreshBalance();
    console.log("[UI] All transaction state cleared, component reactivated");
  }, [refreshBalance]);

  useEffect(() => {
    if (prevLebel.current !== "" && prevLebel.current !== label) {
      handleDone();
    }
    prevLebel.current = label;
  }, [label, handleDone]);

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

      {finishedTransaction ? (
        <Button
          variant="special"
          className="w-full mt-[47px]"
          onClick={handleDone}
        >
          Done
        </Button>
      ) : (
        (() => {
          const isDisabledByProcessing = isTransactionProcessing;
          const isDisabledByHash =
            crosschainInvestHash?.length > 0 && !finishedTransaction;

          const isDisabledByValidation =
            !inputBalance.formatted ||
            Number(inputBalance.formatted) <= 0 ||
            !!errorMessage;

          const isDisabled =
            isDisabledByProcessing ||
            isDisabledByHash ||
            isDisabledByValidation;

          return (
            <Button
              variant="special"
              disabled={isDisabled}
              className="w-full mt-[47px] !text-[16px] !font-bold !font-gotham"
              onClick={handleMainAction}
            >
              {label ?? (isDeposit ? "Invest" : "Withdraw")}
            </Button>
          );
        })()
      )}
    </>
  );
}

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
                        <AiOutlineCheck className="text-green-400" size={16} />
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
                    This step is taking longer than expected. The network might
                    be congested.
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

function TransactionRefreshButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`mt-2 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${
        disabled
          ? "bg-gray-700 text-gray-400 cursor-not-allowed"
          : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
  activeAccount: UseUserResult,
  walletContext: WalletContextState | any,
  setTransactionCompleted: (value: boolean) => void,
  activeChain: Chain,
  action: Action,
  setCrosschainInvestHash: Function,
  setcrossChainTxId: Function,
  setInputBalance: Function,
  setLastEventTxHash: Function,
  sendUserOperation: any,
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
          depositAmount,
          sendUserOperation,
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
          setLastEventTxHash,
          sendUserOperation,
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
          setLastEventTxHash,
          sendUserOperation,
        );
        return result;
      };
    default:
      return () => {
        return false;
      };
  }
}
