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
import { TestCctxSimulation } from './TestCctxSimulation';

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

  const { data: cctxData, refetch: refetchCctx } = useInboundToCctxData(crosschainInvestHash, action);

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
      cctxData?.CrossChainTxs &&
      cctxData.CrossChainTxs[0].cctx_status.status != "SUCCESS"
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
  }, [vaultEvents, crosschainInvestHash, cctxData]);

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

  return (
    <div className="w-full flex flex-col mt-5">
      {(() => {
        return process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-4 bg-gray-800 rounded-lg">
            <TestCctxSimulation refetch={refetchCctx} />
          </div>
        );
      })()}
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
            description: "Divestment of funds from strategy in progress",
            status: TransactionStepStatus.processing,
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
