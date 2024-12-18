import { ParseEventLogsResult, getContract, readContract, Address, prepareEvent } from "thirdweb";
import { TransactionResult, SmartVaultActionType, VaultData, Balance, Token } from "../types/types"
import { client } from "../utils/client";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { Account } from "thirdweb/wallets";
import { handleAllowance } from "@/utils/approve";
import { ZeroAddress } from "ethers";
import { useContractEvents } from "thirdweb/react";

export const formatTotalAssets = (totalAssets: string, decimals: number): string => {
  const value = Number(totalAssets) / Math.pow(10, decimals);
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const formatUSDCBalance = (usdcBalance: string): string => {
  const value = Number(usdcBalance) / Math.pow(10, 6);
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const getWalletAddressOnceCreated = (
  eventLog: ParseEventLogsResult<any, boolean> | undefined,
  transactionResult: TransactionResult | undefined,
  prevTransaction: TransactionResult | null,
  updatePrevTransaction: (transaction: TransactionResult | null) => void
): string | null => {
  if (transactionResult && transactionResult !== prevTransaction) {
    updatePrevTransaction(transactionResult);
    if (eventLog && eventLog.length > 0) {
      const latestEvent = eventLog[eventLog.length - 1];
      if (latestEvent && latestEvent.topics[1]) {
        return formatAddress(latestEvent.topics[1]);
      }
    }
  }
  return null;
};


export function formatAddress(rawAddress: string): string {
  if (!rawAddress.startsWith("0x")) {
    rawAddress = "0x" + rawAddress;
  }

  const formattedAddress = "0x" + rawAddress.slice(-40);

  return formattedAddress;
}

export const NumberFormatter = Intl.NumberFormat("en", {
  //@ts-ignore
  notation: "compact",
});


export function getVaultErrorMessage(
  value: string,
  inputValue: string | undefined,
  setShowModal: Function,
  steps: Action[]
): string {

  // Input > Balance
  if (Number(value) > Number(inputValue)) {
    setShowModal(false)
    return "Insufficient balance"
  }

  else {
    if (Number(value) == 0) {
      setShowModal(false)
    }
    else {
      steps.length > 0 && setShowModal(true)
    }
    return ""
  }
}

enum Action {
  depositApprove,
  depositApproveConfirmed,
  deposit,
  depositConfirmed,
  crosschainInvest,
  deposited,
  FundsInvest,
  withdraw,
  withdrawconfirmed,
  DivestSent,
  FundsDivested,
  ReturnFundsToUserSent,
  Withdrawn,
  CrossChainInvestFailed,
  DivestFailed,
  ReturnFundsToUserFailed
}


export function formatCurrency(amount: number): string {
  if (Number.isNaN(amount)) {
    return "0.00";
  }
  // Convert the amount to a string and split it into integer and decimal parts
  if (amount == 0) {
    return "0.00";
  }
  const [integerPart, decimalPart] = Number(amount.toFixed(2)).toString().split('.');

  // Use a regular expression to add commas to the integer part
  const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (decimalPart == undefined) {
    return `${formattedIntegerPart}`;
  }
  // Combine the formatted integer part with the decimal part
  return `${formattedIntegerPart}.${decimalPart}`;
}

export function formatBalance(balance: number) {

  if (Number.isNaN(balance)) {
    return "0";
  }

  let remaining: string;
  remaining = Number(balance.toFixed(6)).toString();
  return remaining;
}

export const getStrategyChain = async (
  vault: VaultData
) => {
  const contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0],
    address: vault.id,
  });

  const [strategyAddress, chainID] = await readContract({
    contract,
    method: "function getStrategy() view returns (address, uint32)",
  });

  return [strategyAddress, chainID];
}

export const selectActions = async (
  action: SmartVaultActionType,
  vaultData: VaultData,
  activeChain: any,
  EOAaccount: Account,
  inputBalance: Balance,
  inputToken: Token
) => {
  const isNativeToken = inputToken?.address === ZeroAddress;
  const value = Number(inputBalance.value)
  const [chainID] = await getStrategyChain(vaultData)
  switch (action) {
    case SmartVaultActionType.Deposit:
      if (chainID != 70001) {
        if (isNativeToken) {
          return [
            Action.deposit,
            Action.depositConfirmed,
            Action.crosschainInvest,
            Action.FundsInvest,
            Action.deposited
          ]
        }
        else if (
          await handleAllowance({
            token: inputToken?.address as Address,
            activeChain: activeChain,
            activeAccount: EOAaccount.address as Address,
            spender: vaultData.id as Address,
            amount: value
          })) {
          return [
            Action.deposit,
            Action.depositConfirmed,
            Action.crosschainInvest,
            Action.FundsInvest,
            Action.deposited
          ]
        }
        else {
          return [
            Action.depositApprove,
            Action.depositApproveConfirmed,
            Action.deposit,
            Action.depositConfirmed,
            Action.crosschainInvest,
            Action.FundsInvest,
            Action.deposited
          ]
        }
      }
      else {
        if (activeChain.id == 70001) {
          if (isNativeToken) {
            return [
              Action.deposit,
              Action.depositConfirmed
            ]
          }
          else if (
            await handleAllowance({
              token: inputToken?.address as Address,
              activeChain: activeChain,
              activeAccount: EOAaccount.address as Address,
              spender: vaultData.id as Address,
              amount: value
            })) {
            return [
              Action.deposit,
              Action.depositConfirmed
            ]
          }
          else {
            return [
              Action.depositApprove,
              Action.depositApproveConfirmed,
              Action.deposit,
              Action.depositConfirmed
            ]
          }
        }
        else {
          if (isNativeToken) {
            return [
              Action.deposit,
              Action.depositConfirmed,
              Action.deposited
            ]
          }
          else if (
            await handleAllowance({
              token: inputToken?.address as Address,
              activeChain: activeChain,
              activeAccount: EOAaccount.address as Address,
              spender: vaultData.id as Address,
              amount: value
            })) {
            return [
              Action.deposit,
              Action.depositConfirmed,
              Action.deposited
            ]
          }
          else {
            return [
              Action.depositApprove,
              Action.depositApproveConfirmed,
              Action.deposit,
              Action.depositConfirmed,
              Action.deposited
            ]
          }
        }
      }
    case SmartVaultActionType.Withdrawal:
      if (chainID != 70001) {
        return [
          Action.withdraw,
          Action.withdrawconfirmed,
          Action.DivestSent,
          Action.FundsDivested,
          Action.ReturnFundsToUserSent,
          Action.Withdrawn
        ]
      }
      else {
        if (activeChain.id == 70001) {
          return [
            Action.withdraw,
            Action.withdrawconfirmed
          ]
        }
        else {
          return [
            Action.withdraw,
            Action.withdrawconfirmed,
            Action.ReturnFundsToUserSent,
            Action.Withdrawn
          ]
        }
      }
  }
}