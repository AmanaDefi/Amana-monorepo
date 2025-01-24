import { ParseEventLogsResult, Address } from "thirdweb";
import { TransactionResult, SmartVaultActionType, VaultData, Balance, Token, Action } from "@/types/types"
import { Account } from "thirdweb/wallets";
import { handleAllowance } from "@/utils/approve";
import { ZeroAddress } from "ethers";
import { HermesClient } from "@pythnetwork/hermes-client";
import { APPROVED_TOKENS } from "@/constants/chainConfig";

const HERMES_URL = "https://hermes.pyth.network";
const ETH_USD_PRICE_ID = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";
const BTC_USD_PRICE_ID = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

export async function fetchEthPrice(): Promise<number> { // tokenAddress: string, chainId: number
  const connection = new HermesClient(HERMES_URL, {}); // See Hermes endpoints section below for other endpoints

  try {
    const priceUpdates = await connection.getLatestPriceUpdates([ETH_USD_PRICE_ID]);
    const parsed = priceUpdates?.parsed;
    if (!parsed || parsed.length === 0) {
      console.error("No price updates found");
      return 0; // Default value
    }

    const ethPrice = parseFloat(parsed[0]?.ema_price?.price ?? "0") // Default to 0 if missing
    const decimals = parsed[0]?.ema_price?.expo // Default to 0 if missing
    const ethPriceAdjusted = ethPrice * Math.pow(10, decimals);
    console.log("ETH Price:", ethPriceAdjusted);
    return ethPriceAdjusted;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching ETH price:", error.message);
    } else {
      console.error("An unknown error occurred:", error);
    }
    return 0; // Default value in case of an error
  }
}

export async function fetchBtcPrice() { // tokenAddress: string, chainId: number
  const connection = new HermesClient(HERMES_URL, {}); // See Hermes endpoints section below for other endpoints

  try {
    const priceUpdates = await connection.getLatestPriceUpdates([BTC_USD_PRICE_ID]);
    if (priceUpdates && priceUpdates.parsed && priceUpdates.parsed.length === 0) {
      console.error("No price updates found");
    } else if (priceUpdates && priceUpdates.parsed) {
      console.log("Price Updates:", priceUpdates.parsed[0].ema_price.price);
      return priceUpdates.parsed[0].ema_price.price;
    } else {
      console.error("Price updates or parsed data is null or undefined");
    }
  } catch (error) {
    console.error("Error fetching prices:", error);
    throw error; // Re-throw the error for upstream handling
  }
}

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
        if (isNativeToken) {
          return [
            Action.deposit,
            Action.crosschainInvest,
            Action.FundsInvest,
            Action.deposited
          ]
        }
        else if (allowanceResult) {
          return [
            Action.deposit,
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
            Action.crosschainInvest,
            Action.FundsInvest,
            Action.deposited
          ]
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
      }
    case SmartVaultActionType.Withdrawal:
      if (chainID != 7001 && chainID != 7000) {
        return [
          Action.withdraw,
          Action.DivestSent,
          Action.FundsDivested,
          Action.Withdrawn
        ]
      }
      else {
        if (activeChain.id == 7001 || activeChain.id == 7000) {
          return [
            Action.withdraw,
            Action.Withdrawn
          ]
        }
        else {
          return [
            Action.withdraw,
            Action.Withdrawn
          ]
        }
      }
  }
}

export function determineVaultTokenFromApprovedTokens(chainId: number, vaultToken: Token): Token | undefined {
  const approvedTokens = APPROVED_TOKENS[chainId];
  if (!approvedTokens?.length) return undefined;
  return approvedTokens.find(el => {
    const approvedTokenSymbol = el.symbol.split('.')[0];
    return approvedTokenSymbol.toLowerCase() === vaultToken.symbol.toLowerCase()
  }) ?? approvedTokens[0];
}
