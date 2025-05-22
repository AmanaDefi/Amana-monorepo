import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import Blockpi, { TransactionProgress, TransactionStep } from "@/service/blockpi";

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

  // Replace useInboundToCctxData with useEffect for transaction tracking
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const trackTransaction = async () => {
      if (!crosschainInvestHash || action !== Action.crosschainInvest) return;
      
      try {
        const progress = await blockpi.trackTransactionProgress(crosschainInvestHash);
        setTransactionProgress(progress);
        
        // Handle transaction completion
        if (progress.isComplete) {
          if (progress.error) {
            // Handle error case
            const nextStep = actions.findIndex(
              (el) => el == Action.CrossChainInvestFailed
            );
            setAction(actions[nextStep]);
            setStep(nextStep);
          } else {
            // Handle success case
            const nextStep = actions.findIndex(
              (el) => el == Action.FundsInvest
            );
            setAction(actions[nextStep]);
            setStep(nextStep);
          }
        }
        
        // Continue tracking if not complete
        if (!progress.isComplete) {
          timeoutId = setTimeout(trackTransaction, 5000);
        }
      } catch (error) {
        console.error("[BlockPI] Error tracking transaction:", error);
        timeoutId = setTimeout(trackTransaction, 5000);
      }
    };

    if (crosschainInvestHash && action === Action.crosschainInvest) {
      trackTransaction();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [crosschainInvestHash, action, actions, setAction, setStep]);

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
    setTransactionStepFeedback({});

    setTransactionCompleted(true);
    setInputBalance({
      value: 0,
      formatted: "0",
      formattedUSD: "0",
    });
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

  // Track user interaction to release last transaction logs
  // START

  function resetTransactionState() {
    setFinishedTransaction(false);
    setIsTransactionProcessing(false);
    setIsTransactionStarted(false);
    setCrosschainInvestHash("");
    setcrossChainTxId("");
  }
  useEffect(() => {
    if (Number(_inputBalance.value) > 0) {
      resetTransactionState();
    }
  }, [_inputBalance.value]);

  useEffect(() => {
    resetTransactionState();
  }, [_inputToken]);

  useEffect(() => {
    resetTransactionState();
  }, [isDeposit]);

  // END

  // Helper: Update UI for step status
  function updateFirstCrossChainStepStatus(
    status: string | undefined,
    cctxUrl: string | undefined,
    setTransactionStepFeedback: (feedback: TransactionStepMessages) => void
  ) {
    let feedback: TransactionStepMessages = {};
    if (status === "PendingOutbound") {
      feedback[Action.depositConfirmed] = {
        label: "Deposit",
        description: "Cross-chain transfer: initiating outbound (pending)",
        status: TransactionStepStatus.processing,
        txHash: cctxUrl
      };
    } else if (status === "OutboundMined" || status === "Success") {
      feedback[Action.depositConfirmed] = {
        label: "Deposit",
        description: "Cross-chain transfer: outbound mined (completed)",
        status: TransactionStepStatus.completed,
        txHash: cctxUrl
      };
    } else if (status === "Reverted" || status === "Aborted" || status === "Failed") {
      feedback[Action.depositConfirmed] = {
        label: "Deposit",
        description: `Cross-chain transfer failed: ${status}`,
        status: TransactionStepStatus.error,
        txHash: cctxUrl
      };
    } else if (status) {
      feedback[Action.depositConfirmed] = {
        label: "Deposit",
        description: `Cross-chain transfer: ${status}`,
        status: TransactionStepStatus.processing,
        txHash: cctxUrl
      };
    }
    setTransactionStepFeedback(feedback);
  }

  useEffect(() => {
    // Only run for the first cross-chain step after local transaction
    if (!crosschainInvestHash || action !== Action.depositConfirmed) return;
    let cancelled = false;
    
    // Save transaction state to localStorage for persistence across refreshes
    localStorage.setItem('pendingDepositTransaction', JSON.stringify({
      hash: crosschainInvestHash,
      txId: crossChainTxId,
      timestamp: Date.now()
    }));

    async function pollBlockPIForFirstStep() {
      let attempt = 0;
      const maxAttempts = 30; // Allow for up to 10+ minutes of polling
      let backoffDelay = 3000; // Start with 3 seconds
      let consecutiveErrors = 0;

      while (!cancelled && attempt < maxAttempts) {
        try {
          console.log(`[BlockPI] Attempt ${attempt+1}/${maxAttempts} - Calling inboundHashToCctx for ${crosschainInvestHash}`);
          
          // Update UI with current attempt info
          let attemptFeedback: TransactionStepMessages = {};
          attemptFeedback[Action.depositConfirmed] = {
            label: "Deposit",
            description: `Cross-chain transfer in progress (attempt ${attempt+1}/${maxAttempts})`,
            status: TransactionStepStatus.processing,
            txHash: lastEventTxHash
          };
          setTransactionStepFeedback(attemptFeedback);
          
          const inboundRes = await blockpi.getInboundHashToCctxData(crosschainInvestHash);
          const cctxIndex = inboundRes?.inboundHashToCctx?.cctx_index?.[0];
          
          if (!cctxIndex) {
            consecutiveErrors++;
            
            // If too many consecutive errors, consider falling back to RPC
            if (consecutiveErrors > 10) {
              console.log("[BlockPI] Too many consecutive errors, falling back to RPC-based monitoring");
              // The existing event-based monitoring in this component will serve as the fallback
              return;
            }
            
            attempt++;
            // Exponential backoff with a cap
            backoffDelay = Math.min(backoffDelay * 1.5, 30000); // Increase delay, max 30sec
            console.log(`[BlockPI] No cctx_index found yet, waiting ${backoffDelay/1000}s before retry`);
            await new Promise(res => setTimeout(res, backoffDelay));
            continue;
          }
          
          // Reset consecutive errors since we got a valid response
          consecutiveErrors = 0;
          
          // STEP 2: Now get the actual transaction status using the cctx endpoint
          console.log(`[BlockPI] Found cctx_index: ${cctxIndex}, calling cctx endpoint`);
          
          // Use the BLOCKPI_URL from blockpi instance to construct the URL
          const cctxUrl = `${blockpi.api.defaults.baseURL}/cctx/${cctxIndex}`;
          
          const cctxRes = await blockpi.getCctxData(cctxIndex);
          const status = cctxRes?.CrossChainTx?.cctx_status?.status;
          
          console.log(`[BlockPI] First cross-chain step status for ${crosschainInvestHash} (cctx: ${cctxIndex}):`, status);
          updateFirstCrossChainStepStatus(status, cctxUrl, setTransactionStepFeedback);
          
          if (status === "OutboundMined" || status === "Success" || status === "Reverted" || status === "Aborted" || status === "Failed") {
            // Clear the localStorage entry on terminal state
            localStorage.removeItem('pendingDepositTransaction');
            
            // If successful, update UI with success message
            if (status === "OutboundMined" || status === "Success") {
              console.log("[BlockPI] Transaction completed successfully");
            } else {
              console.log(`[BlockPI] Transaction failed with status: ${status}`);
            }
            
            // Stop polling on terminal state
            return;
          }
          
          // If we get here, we need to continue polling with backoff
          attempt++;
          backoffDelay = Math.min(backoffDelay * 1.5, 30000);
          await new Promise(res => setTimeout(res, backoffDelay));
          
        } catch (err) {
          console.error(`[BlockPI] API error for ${crosschainInvestHash}:`, err);
          attempt++;
          consecutiveErrors++;
          backoffDelay = Math.min(backoffDelay * 1.5, 30000);
          await new Promise(res => setTimeout(res, backoffDelay));
        }
      }
      
      if (attempt >= maxAttempts) {
        console.log("[BlockPI] Max polling attempts reached, falling back to RPC");
        // The existing event-based monitoring will continue
      }
    }

    pollBlockPIForFirstStep();
    return () => { cancelled = true; };
  }, [crosschainInvestHash, action, crossChainTxId, lastEventTxHash, setTransactionStepFeedback]);

  // Helper: Update UI for withdrawal step status
  function updateFirstWithdrawStepStatus(
    status: string | undefined,
    cctxUrl: string | undefined,
    setTransactionStepFeedback: (feedback: TransactionStepMessages) => void
  ) {
    let feedback: TransactionStepMessages = {};
    if (status === "PendingOutbound") {
      feedback[Action.withdrawconfirmed] = {
        label: "Withdraw",
        description: "Cross-chain withdraw request: initiating outbound (pending)",
        status: TransactionStepStatus.processing,
        txHash: cctxUrl
      };
    } else if (status === "OutboundMined" || status === "Success") {
      feedback[Action.withdrawconfirmed] = {
        label: "Withdraw",
        description: "Cross-chain withdraw request: outbound mined (completed)",
        status: TransactionStepStatus.completed,
        txHash: cctxUrl
      };
    } else if (status === "Reverted" || status === "Aborted" || status === "Failed") {
      feedback[Action.withdrawconfirmed] = {
        label: "Withdraw",
        description: `Cross-chain withdraw request failed: ${status}`,
        status: TransactionStepStatus.error,
        txHash: cctxUrl
      };
    } else if (status) {
      feedback[Action.withdrawconfirmed] = {
        label: "Withdraw",
        description: `Cross-chain withdraw request: ${status}`,
        status: TransactionStepStatus.processing,
        txHash: cctxUrl
      };
    }
    setTransactionStepFeedback(feedback);
  }

  // BlockPI integration for withdraw flow
  useEffect(() => {
    // Only run for the first cross-chain step after local withdraw transaction
    if (!crosschainInvestHash || action !== Action.withdrawconfirmed) return;
    let cancelled = false;
    
    // Save transaction state to localStorage for persistence across refreshes
    localStorage.setItem('pendingWithdrawTransaction', JSON.stringify({
      hash: crosschainInvestHash,
      txId: crossChainTxId,
      timestamp: Date.now()
    }));

    async function pollBlockPIForWithdrawStep() {
      let attempt = 0;
      const maxAttempts = 30; // Allow for up to 10+ minutes of polling
      let backoffDelay = 3000; // Start with 3 seconds
      let consecutiveErrors = 0;

      while (!cancelled && attempt < maxAttempts) {
        try {
          console.log(`[BlockPI] Attempt ${attempt+1}/${maxAttempts} - Calling inboundHashToCctx for withdraw ${crosschainInvestHash}`);
          
          // Update UI with current attempt info
          let attemptFeedback: TransactionStepMessages = {};
          attemptFeedback[Action.withdrawconfirmed] = {
            label: "Withdraw",
            description: `Cross-chain withdraw request in progress (attempt ${attempt+1}/${maxAttempts})`,
            status: TransactionStepStatus.processing,
            txHash: lastEventTxHash
          };
          setTransactionStepFeedback(attemptFeedback);
          
          const inboundRes = await blockpi.getInboundHashToCctxData(crosschainInvestHash);
          const cctxIndex = inboundRes?.inboundHashToCctx?.cctx_index?.[0];
          
          if (!cctxIndex) {
            consecutiveErrors++;
            
            // If too many consecutive errors, consider falling back to RPC
            if (consecutiveErrors > 10) {
              console.log("[BlockPI] Too many consecutive errors, falling back to RPC-based monitoring");
              // The existing event-based monitoring in this component will serve as the fallback
              return;
            }
            
            attempt++;
            // Exponential backoff with a cap
            backoffDelay = Math.min(backoffDelay * 1.5, 30000); // Increase delay, max 30sec
            console.log(`[BlockPI] No cctx_index found yet for withdraw, waiting ${backoffDelay/1000}s before retry`);
            await new Promise(res => setTimeout(res, backoffDelay));
            continue;
          }
          
          // Reset consecutive errors since we got a valid response
          consecutiveErrors = 0;
          
          // STEP 2: Now get the actual transaction status using the cctx endpoint
          console.log(`[BlockPI] Found cctx_index: ${cctxIndex} for withdraw, calling cctx endpoint`);
          
          // Use the BLOCKPI_URL from blockpi instance to construct the URL
          const cctxUrl = `${blockpi.api.defaults.baseURL}/cctx/${cctxIndex}`;
          
          const cctxRes = await blockpi.getCctxData(cctxIndex);
          const status = cctxRes?.CrossChainTx?.cctx_status?.status;
          
          console.log(`[BlockPI] Withdraw cross-chain step status for ${crosschainInvestHash} (cctx: ${cctxIndex}):`, status);
          updateFirstWithdrawStepStatus(status, cctxUrl, setTransactionStepFeedback);
          
          if (status === "OutboundMined" || status === "Success" || status === "Reverted" || status === "Aborted" || status === "Failed") {
            // Clear the localStorage entry on terminal state
            localStorage.removeItem('pendingWithdrawTransaction');
            
            // If successful, update UI with success message
            if (status === "OutboundMined" || status === "Success") {
              console.log("[BlockPI] Withdraw transaction completed successfully");
            } else {
              console.log(`[BlockPI] Withdraw transaction failed with status: ${status}`);
            }
            
            // Stop polling on terminal state
            return;
          }
          
          // If we get here, we need to continue polling with backoff
          attempt++;
          backoffDelay = Math.min(backoffDelay * 1.5, 30000);
          await new Promise(res => setTimeout(res, backoffDelay));
          
        } catch (err) {
          console.error(`[BlockPI] API error for withdraw ${crosschainInvestHash}:`, err);
          attempt++;
          consecutiveErrors++;
          backoffDelay = Math.min(backoffDelay * 1.5, 30000);
          await new Promise(res => setTimeout(res, backoffDelay));
        }
      }
      
      if (attempt >= maxAttempts) {
        console.log("[BlockPI] Max polling attempts reached for withdraw, falling back to RPC");
        // The existing event-based monitoring will continue
      }
    }

    pollBlockPIForWithdrawStep();
    return () => { cancelled = true; };
  }, [crosschainInvestHash, action, crossChainTxId, lastEventTxHash, setTransactionStepFeedback]);

  // Check for pending transactions on component mount
  useEffect(() => {
    // Check for pending deposit transactions
    const pendingDepositTx = localStorage.getItem('pendingDepositTransaction');
    if (pendingDepositTx) {
      try {
        const { hash, txId, timestamp } = JSON.parse(pendingDepositTx);
        
        // Only resume if transaction is less than 20 minutes old
        if (Date.now() - timestamp < 20 * 60 * 1000) {
          console.log('[BlockPI] Resuming pending deposit transaction:', hash);
          setCrosschainInvestHash(hash);
          setcrossChainTxId(txId);
          
          // Set action to depositConfirmed to trigger the polling effect
          const nextStep = actions.findIndex((el) => el == Action.depositConfirmed);
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
        const { hash, txId, timestamp } = JSON.parse(pendingWithdrawTx);
        
        // Only resume if transaction is less than 20 minutes old
        if (Date.now() - timestamp < 20 * 60 * 1000) {
          console.log('[BlockPI] Resuming pending withdraw transaction:', hash);
          setCrosschainInvestHash(hash);
          setcrossChainTxId(txId);
          
          // Set action to withdrawconfirmed to trigger the polling effect
          const nextStep = actions.findIndex((el) => el == Action.withdrawconfirmed);
          if (nextStep >= 0) {
            setAction(actions[nextStep]);
            setStep(nextStep);
          }
        } else {
          console.log('[BlockPI] Found stale withdraw transaction, removing from localStorage');
          localStorage.removeItem('pendingWithdrawTransaction');
        }
      } catch (error) {
        console.error('[BlockPI] Error parsing pending withdraw transaction:', error);
        localStorage.removeItem('pendingWithdrawTransaction');
      }
    }
  }, [actions, setCrosschainInvestHash, setcrossChainTxId, setAction, setStep]);

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
}): JSX.Element {
  const activeAccount = useActiveAccount();
  const walletContext = useWallet();
  const { selectedChain } = useMultiChain();

  useEffect(() => {
    console.log("%c Called SWITCH!!", "color: blue");
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
            status: TransactionStepStatus.completed,
            txHash: localLastEventTxHash,
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
  }, [action, actions]);

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
    setLastTransactionStepFeedback({});
    setFinishedTransaction(false);
    refreshBalance();
  }

  return (
    <>
      {((Number(inputBalance.formatted) > 0 && actions.length) ||
        finishedTransaction) &&
        !errorMessage && (
          <>
            <p className="text-white text-start text-2xl font-bold leading-none mb-3">
              {label}
            </p>
            {
              <>
                {(Object.keys(Action) as Array<keyof typeof Action>)
                  .map((key) => key as unknown as Action)
                  .map((item, index) => {
                    const feedbackData = finishedTransaction
                      ? lastTransactionStepFeedback
                      : transactionStepFeedback;
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
                disabled={isTransactionProcessing}
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
