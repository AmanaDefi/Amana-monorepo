import { ParseEventLogsResult, Address, getContract, toTokens } from "thirdweb";
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
import { isApproved } from "@/utils/approve";
import { ethers, Provider, ZeroAddress } from "ethers";
import { APPROVED_TOKENS, CHAIN_ID, HERMES_URL, solanaRpcUrl } from "@/constants/chainConfig";
import { HermesClient } from "@pythnetwork/hermes-client";
import { USER_SETTINGS_LOCAL_STORAGE_KEY } from "@/constants";
import { Connection, PublicKey } from "@solana/web3.js";
import { client } from "./client";
import { Chain } from "viem";
import { ChainOptions } from "thirdweb/chains";
import { getBalance } from "thirdweb/extensions/erc20";
import { keccak_256 } from 'js-sha3';

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

export function isEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
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
  remaining = parseFloat(balance.toFixed(4)).toString();
  return remaining;
}

export const selectActions = async (
  action: SmartVaultActionType,
  vaultData: VaultData,
  activeChain: any,
  walletAddress: string,
  inputBalance: Balance,
  inputToken: Token
) => {

  const isNativeToken = inputToken?.address === ZeroAddress;
  const value = Number(inputBalance.value)
  const chainID = vaultData.protocol.chainId;
  const allowanceResult = activeChain?.id == CHAIN_ID.solana ? true : await isApproved({
    token: inputToken?.address as Address,
    activeChain: activeChain,
    activeAccount: walletAddress as Address,
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

/**
 * Solana part
 */

export const solanaConnection = new Connection(solanaRpcUrl, "confirmed");
export function isSolanaAddress(address: any): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (e) {
    return false;
  }
}

export const getERC20TokenBalance = async (walletAddress: string, tokenAddress: string, chain: any) => {
  const contract = getContract({
    client,
    chain: chain,
    address: tokenAddress
  });
  const { value, decimals } = await getBalance({
    contract,
    address: walletAddress as Address,
  });

  return {
    balance: value,
    decimals
  }
};

export async function getSplTokenBalance(walletAddress: string, tokenMint: string) {
  const publicKey = new PublicKey(walletAddress);
  const mintAddress = new PublicKey(tokenMint);

  // Fetch all SPL token accounts owned by the wallet
  const tokenAccounts = await solanaConnection.getParsedTokenAccountsByOwner(publicKey, {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // SPL Token Program
  });

  // Find the token account that matches the specified token mint
  const tokenAccount = tokenAccounts.value.find(
    (account) => account.account.data.parsed.info.mint === mintAddress.toBase58()
  );

  if (!tokenAccount) {
    return { balance: 0, decimals: 0 }; // No token balance found
  }

  const balanceInfo = tokenAccount.account.data.parsed.info.tokenAmount;
  return {
    balance: balanceInfo.amount,
    decimals: balanceInfo.decimals,
  };
}

export function shortAddressForm(address: Address) {
  return address.slice(0, 6) + '...' + address.slice(-4);
}

export function getSolanaEVMAddress(solanaPublicKey: string) {
  // Ensure we're working with a proper Solana public key
  const pubKey = new PublicKey(solanaPublicKey);

  // Get the public key as a Buffer
  const pubKeyBuffer = pubKey.toBuffer();

  // Hash the public key using keccak256
  const hash = keccak_256(pubKeyBuffer);

  // Take the last 20 bytes (40 characters in hex) and add 0x prefix
  const evmAddress = '0x' + hash.substring(hash.length - 40);

  return evmAddress;
}

export function format(value: bigint, decimals: number) {
  if (!value || value == 0n) return "0"

  const str = Number(toTokens(value, decimals)).toFixed(6);
  return Number(str).toString();
}
