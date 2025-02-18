import { ParseEventLogsResult, Address } from "thirdweb";
import {
  TransactionResult,
  SmartVaultActionType,
  VaultData,
  Balance,
  Token,
  Action,
  UserSettings,
  DEFAULT_SETTINGS
} from "@/types/types"
import { Account } from "thirdweb/wallets";
import { handleAllowance } from "@/utils/approve";
import { ZeroAddress } from "ethers";
import { APPROVED_TOKENS, HERMES_URL } from "@/constants/chainConfig";
import { HermesClient } from "@pythnetwork/hermes-client";
import { USER_SETTINGS_LOCAL_STORAGE_KEY } from "@/constants";

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
  steps: Action[]
): string {

  // Input > Balance
  if (Number(value) > Number(inputValue)) {
    return "Insufficient balance"
  } else {
    return ""
  }
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
  const chainID = vaultData.protocol.chainId
  const allowanceResult = await handleAllowance({
    token: inputToken?.address as Address,
    activeChain: activeChain,
    activeAccount: EOAaccount.address as Address,
    spender: vaultData.id as Address,
    amount: value
  });
  console.log("allowanceResult", allowanceResult)
  switch (action) {
    case SmartVaultActionType.Deposit:
      if (chainID != 7001 && chainID != 7000) {
        if (activeChain.id == 7001 || activeChain.id == 7000) {
          if (isNativeToken) {
            return [
              Action.deposit,
              Action.crosschainInvest,
              Action.CrossChainInvestFailed,
              Action.FundsReturnedError,
              Action.FundsInvest,
              Action.InvestConfirmFailed,
              Action.deposited
            ]
          }
          else if (allowanceResult) {
            return [
              Action.deposit,
              Action.crosschainInvest,
              Action.CrossChainInvestFailed,
              Action.FundsReturnedError,
              Action.FundsInvest,
              Action.InvestConfirmFailed,
              Action.deposited
            ]
          }
          else {
            return [
              Action.depositApprove,
              Action.depositApproveConfirmed,
              Action.deposit,
              Action.crosschainInvest,
              Action.CrossChainInvestFailed,
              Action.FundsReturnedError,
              Action.FundsInvest,
              Action.InvestConfirmFailed,
              Action.deposited
            ]
          }
        } else {
          if (isNativeToken) {
            return [
              Action.deposit,
              Action.depositConfirmed,
              Action.CrossChainDepositFailed,
              Action.crosschainInvest,
              Action.CrossChainInvestFailed,
              Action.FundsReturnedError,
              Action.FundsInvest,
              Action.InvestConfirmFailed,
              Action.deposited
            ]
          }
          else if (allowanceResult) {
            return [
              Action.deposit,
              Action.depositConfirmed,
              Action.CrossChainDepositFailed,
              Action.crosschainInvest,
              Action.CrossChainInvestFailed,
              Action.FundsReturnedError,
              Action.FundsInvest,
              Action.InvestConfirmFailed,
              Action.deposited
            ]
          }
          else {
            return [
              Action.depositApprove,
              Action.depositApproveConfirmed,
              Action.deposit,
              Action.depositConfirmed,
              Action.CrossChainDepositFailed,
              Action.crosschainInvest,
              Action.CrossChainInvestFailed,
              Action.FundsReturnedError,
              Action.FundsInvest,
              Action.InvestConfirmFailed,
              Action.deposited
            ]
          }
        }
      }
      else {
        if (activeChain.id == 7001 || activeChain.id == 7000) {
          if (isNativeToken) {
            return [
              Action.deposit,
              Action.deposited
            ]
          }
          else if (allowanceResult) {
            return [
              Action.deposit,
              Action.deposited
            ]
          }
          else {
            return [
              Action.depositApprove,
              Action.depositApproveConfirmed,
              Action.deposit,
              Action.deposited
            ]
          }
        }
        else {
          if (isNativeToken) {
            return [
              Action.deposit,
              Action.depositConfirmed,
              Action.CrossChainDepositFailed,
              Action.deposited
            ]
          }
          else if (allowanceResult) {
            return [
              Action.deposit,
              Action.depositConfirmed,
              Action.CrossChainDepositFailed,
              Action.deposited
            ]
          }
          else {
            return [
              Action.depositApprove,
              Action.depositApproveConfirmed,
              Action.deposit,
              Action.depositConfirmed,
              Action.CrossChainDepositFailed,
              Action.deposited
            ]
          }
        }
      }
    case SmartVaultActionType.Withdrawal:
      if (chainID != 7001 && chainID != 7000) {
        if (activeChain.id == 7001 || activeChain.id == 7000) {
          return [
            Action.withdraw,
            Action.DivestSent,
            Action.DivestFailed,
            Action.FundsDivested,
            Action.ReturnFundsFromStrategyFailed,
            Action.ReturnFundsToUserSent,
            Action.ReturnFundsToUserFailed,
            Action.withdrew
          ]
        } else {
          return [
            Action.withdraw,
            Action.withdrawconfirmed,
            Action.CrossChainWithdrawFailed,
            Action.DivestSent,
            Action.DivestFailed,
            Action.FundsDivested,
            Action.ReturnFundsFromStrategyFailed,
            Action.ReturnFundsToUserSent,
            Action.ReturnFundsToUserFailed,
            Action.withdrew
          ]
        }
      }
      else {
        if (activeChain.id == 7001 || activeChain.id == 7000) {
          return [
            Action.withdraw,
            Action.withdrew
          ]
        }
        else {
          return [
            Action.withdraw,
            Action.withdrawconfirmed,
            Action.CrossChainWithdrawFailed,
            Action.ReturnFundsToUserSent,
            Action.ReturnFundsToUserFailed,
            Action.withdrew
          ]
        }
      }
  }
}

export function determineVaultTokenFromApprovedTokens(chainId: number, vaultToken: Token): Token | undefined {
  const approvedTokens = APPROVED_TOKENS[chainId];
  if (!approvedTokens?.length) return undefined;
  const vaultTokenSymbol = vaultToken.symbol.split('.')[0];
  return approvedTokens.find(el => {
    const approvedTokenSymbol = el.symbol.split('.')[0];
    return approvedTokenSymbol.toLowerCase() === vaultTokenSymbol.toLowerCase()
  }) ?? approvedTokens[0];
}

export const isZetachain = (chainId: number) => chainId === 7000 || chainId === 7001;

export const getOnlyTokenSymbol = (symbol: string) => symbol.split('.')[0];

export async function fetchTokenPrices(priceIds: string[]): Promise<{
  [priceId: string]: number;
}> {
  const connection = new HermesClient(HERMES_URL, {});

  try {
    const priceUpdates = await connection.getLatestPriceUpdates(priceIds);
    const parsed = priceUpdates?.parsed;

    if (!parsed || parsed.length === 0) {
      console.error("No price updates found");
      return priceIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});
    }

    const prices: {
      [priceId: string]: number;
    } = {};

    parsed.forEach((update, index) => {
      const price = parseFloat(update?.ema_price?.price ?? "0");
      const decimals = update?.ema_price?.expo ?? 0;
      const adjustedPrice = price * Math.pow(10, decimals);

      prices[priceIds[index]] = adjustedPrice;
      console.log(`Price for ${priceIds[index]}:`, adjustedPrice);
    });

    return prices;
  } catch (error) {
    console.error("Error fetching prices:", error);
    return priceIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});
  }
}

export function getStoredSettings(): UserSettings {
  try {
    const saved = localStorage.getItem(USER_SETTINGS_LOCAL_STORAGE_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    return JSON.parse(saved);
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function getCurrentSlippage(): number {
  return getStoredSettings().slippage.value;
}
