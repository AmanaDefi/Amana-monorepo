import {
  SmartVaultActionType,
  VaultData,
  Balance,
  Token,
  Action,
  UserSettings,
  DEFAULT_SETTINGS,
} from "@/types/types";
import { isApproved } from "@/utils/approve";
import { ZeroAddress } from "ethers";
import { APPROVED_TOKENS, CHAIN_ID, HERMES_URL } from "@/constants/chainConfig";
import { HermesClient } from "@pythnetwork/hermes-client";
import { USER_SETTINGS_LOCAL_STORAGE_KEY } from "@/constants";
import { PublicKey } from "@solana/web3.js";
import SolanaConnectionSingleton from "./solanaSingleton";
import { erc20Abi, getContract, formatUnits } from "viem";
import { getPublicClient } from "./getPublicClient";
import { client } from "./client";
import { Chain } from "viem";
import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex } from "@noble/hashes/utils";
import { ConnectedWallet } from "@privy-io/react-auth";

export const formatTotalAssets = (
  totalAssets: string,
  decimals: number,
): string => {
  const value = Number(totalAssets) / Math.pow(10, decimals);
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatUSDCBalance = (usdcBalance: string): string => {
  const value = Number(usdcBalance) / Math.pow(10, 6);
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  steps: Action[],
): string {
  if (Number(value) > 0 && (!inputValue || Number(inputValue) === 0)) {
    return "Insufficient balance";
  }
  // Input > Balance
  if (Number(value) > Number(inputValue)) {
    return "Insufficient balance";
  } else {
    return "";
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
  const [integerPart, decimalPart] = Number(amount.toFixed(2))
    .toString()
    .split(".");

  // Use a regular expression to add commas to the integer part
  const formattedIntegerPart = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  );
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
  inputToken: Token,
  activeWallet: ConnectedWallet
) => {
  const isNativeToken = inputToken?.address === ZeroAddress;
  const value = Number(inputBalance.value);
  const chainID = vaultData.protocol.chainId;
  const allowanceResult =
    activeChain?.id == CHAIN_ID.solana
      ? true
      : await isApproved({
          token: inputToken?.address,
          activeChain: activeChain,
          activeAccount: walletAddress,
          spender: vaultData.id,
          amount: value,
          activeWallet
        });
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
              Action.deposited,
            ];
          } else if (allowanceResult) {
            return [
              Action.deposit,
              Action.crosschainInvest,
              Action.CrossChainInvestFailed,
              Action.FundsReturnedError,
              Action.FundsInvest,
              Action.InvestConfirmFailed,
              Action.deposited,
            ];
          } else {
            return [
              Action.depositApprove,
              Action.depositApproveConfirmed,
              Action.deposit,
              Action.crosschainInvest,
              Action.CrossChainInvestFailed,
              Action.FundsReturnedError,
              Action.FundsInvest,
              Action.InvestConfirmFailed,
              Action.deposited,
            ];
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
              Action.deposited,
            ];
          } else if (allowanceResult) {
            return [
              Action.deposit,
              Action.depositConfirmed,
              Action.CrossChainDepositFailed,
              Action.crosschainInvest,
              Action.CrossChainInvestFailed,
              Action.FundsReturnedError,
              Action.FundsInvest,
              Action.InvestConfirmFailed,
              Action.deposited,
            ];
          } else {
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
              Action.deposited,
            ];
          }
        }
      } else {
        if (activeChain.id == 7001 || activeChain.id == 7000) {
          if (isNativeToken) {
            return [Action.deposit, Action.deposited];
          } else if (allowanceResult) {
            return [Action.deposit, Action.deposited];
          } else {
            return [
              Action.depositApprove,
              Action.depositApproveConfirmed,
              Action.deposit,
              Action.deposited,
            ];
          }
        } else {
          if (isNativeToken) {
            return [
              Action.deposit,
              Action.depositConfirmed,
              Action.CrossChainDepositFailed,
              Action.deposited,
            ];
          } else if (allowanceResult) {
            return [
              Action.deposit,
              Action.depositConfirmed,
              Action.CrossChainDepositFailed,
              Action.deposited,
            ];
          } else {
            return [
              Action.depositApprove,
              Action.depositApproveConfirmed,
              Action.deposit,
              Action.depositConfirmed,
              Action.CrossChainDepositFailed,
              Action.deposited,
            ];
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
            Action.withdrew,
          ];
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
            Action.withdrew,
          ];
        }
      } else {
        if (activeChain.id == 7001 || activeChain.id == 7000) {
          return [Action.withdraw, Action.withdrew];
        } else {
          return [
            Action.withdraw,
            Action.withdrawconfirmed,
            Action.CrossChainWithdrawFailed,
            Action.ReturnFundsToUserSent,
            Action.ReturnFundsToUserFailed,
            Action.withdrew,
          ];
        }
      }
  }
};

export function determineVaultTokenFromApprovedTokens(
  chainId: number,
  vaultToken: Token,
): Token | undefined {
  const approvedTokens = APPROVED_TOKENS[chainId];
  if (!approvedTokens?.length) return undefined;

  // Extract base symbol from vault token (e.g., "USDT" from "USDT.POL")
  const vaultTokenSymbol = vaultToken.symbol.split(".")[0].split(" ")[0];

  // Check if vault token is a native token (ETH, BNB, etc.)
  const isNativeVaultToken = [
    "ETH",
    "BNB",
    "MATIC",
    "AVAX",
    "FTM",
    "ONE",
    "CRO",
    "SOL",
    "GLMR",
  ].includes(vaultTokenSymbol.toUpperCase());

  // Check if vault token is a stablecoin
  const isStablecoin = [
    "USDT",
    "USDC",
    "DAI",
    "BUSD",
    "TUSD",
    "USDP",
    "FRAX",
    "LUSD",
  ].includes(vaultTokenSymbol.toUpperCase());

  // Map of chain IDs to their symbol suffixes
  const chainIdToSuffix: Record<number, string> = {
    1: "ETH", // Ethereum
    8453: "BASE", // Base
    137: "POL", // Polygon
    42161: "ARB", // Arbitrum
    43114: "AVAX", // Avalanche
    56: "BSC", // BNB Chain
  };

  // Get current chain suffix
  const currentChainSuffix = chainIdToSuffix[chainId] || "";

  // If on ZetaChain and dealing with a stablecoin, look for chain-specific tokens first
  if ((chainId === 7000 || chainId === 7001) && isStablecoin) {
    // Look for tokens with this base symbol that have chain suffixes
    const chainSpecificTokens = approvedTokens.filter((token) => {
      const tokenParts = token.symbol.split(".");
      if (tokenParts.length === 2) {
        const tokenBaseSymbol = tokenParts[0];
        return tokenBaseSymbol.toUpperCase() === vaultTokenSymbol.toUpperCase();
      }
      return false;
    });

    if (chainSpecificTokens.length > 0) {
      // Extract the vault token's chain suffix if it has one
      const vaultTokenParts = vaultToken.symbol.split(".");
      const vaultTokenSuffix =
        vaultTokenParts.length === 2 ? vaultTokenParts[1] : "";

      // PRIORITY:
      // 1. Connected chain's tokens (if on a specific chain)
      // 2. The vault's original token suffix (if it has one)
      // 3. For other tokens, use alphabetical order

      const sortedTokens = [...chainSpecificTokens].sort((a, b) => {
        const aSuffix = a.symbol.split(".")[1] || "";
        const bSuffix = b.symbol.split(".")[1] || "";

        // If one token matches the current chain, it wins
        if (aSuffix === currentChainSuffix && bSuffix !== currentChainSuffix)
          return -1;
        if (bSuffix === currentChainSuffix && aSuffix !== currentChainSuffix)
          return 1;

        // If one token matches the vault token's original suffix, it comes next
        if (vaultTokenSuffix) {
          if (aSuffix === vaultTokenSuffix && bSuffix !== vaultTokenSuffix)
            return -1;
          if (bSuffix === vaultTokenSuffix && aSuffix !== vaultTokenSuffix)
            return 1;
        }

        // Otherwise, alphabetical order
        return aSuffix.localeCompare(bSuffix);
      });

      return sortedTokens[0];
    }
  }

  // For non-ZetaChain and non-stablecoin cases, proceed with original logic
  // PRIORITY 1: First try to find token with matching chain suffix
  if (currentChainSuffix && isStablecoin) {
    const chainSuffixMatch = approvedTokens.find((token) => {
      const tokenParts = token.symbol.split(".");
      if (tokenParts.length === 2) {
        const tokenBaseSymbol = tokenParts[0];
        const tokenSuffix = tokenParts[1];
        return (
          tokenBaseSymbol.toUpperCase() === vaultTokenSymbol.toUpperCase() &&
          tokenSuffix === currentChainSuffix
        );
      }
      return false;
    });

    if (chainSuffixMatch) {
      return chainSuffixMatch;
    }
  }

  // PRIORITY 2: Look for exact symbol match (non-native tokens prioritized for stablecoins)
  const exactMatches = approvedTokens.filter((token) => {
    const tokenBaseSymbol = token.symbol.split(" ")[0].split(".")[0];
    return tokenBaseSymbol.toUpperCase() === vaultTokenSymbol.toUpperCase();
  });

  if (exactMatches.length > 0) {
    // For stablecoin vaults, prioritize non-native tokens
    if (isStablecoin) {
      const nonNativeMatch = exactMatches.find(
        (token) =>
          token.address !== "0x0000000000000000000000000000000000000000" &&
          token.address !== "11111111111111111111111111111111", // Solana native
      );

      if (nonNativeMatch) {
        return nonNativeMatch;
      }
    }

    return exactMatches[0];
  }

  // PRIORITY 3: For stablecoin vaults, try to find any stablecoin
  if (isStablecoin) {
    const stablecoinMatch = approvedTokens.find((token) => {
      const tokenBaseSymbol = token.symbol.split(" ")[0].split(".")[0];
      return [
        "USDT",
        "USDC",
        "DAI",
        "BUSD",
        "TUSD",
        "USDP",
        "FRAX",
        "LUSD",
      ].includes(tokenBaseSymbol.toUpperCase());
    });

    if (stablecoinMatch) {
      return stablecoinMatch;
    }
  }

  // PRIORITY 4: For native token vaults, prioritize native token
  if (isNativeVaultToken) {
    const nativeToken = approvedTokens.find(
      (token) =>
        token.address === "0x0000000000000000000000000000000000000000" ||
        token.address === "11111111111111111111111111111111", // Solana native
    );

    if (nativeToken) {
      return nativeToken;
    }
  }

  // PRIORITY 5: Default to first approved token if nothing else matched
  return approvedTokens[0];
}

export const isZetachain = (chainId: number) =>
  chainId === 7000 || chainId === 7001;

export const getOnlyTokenSymbol = (symbol: string) => symbol.split(".")[0];

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
  const settings = getStoredSettings();
  return settings.slippage.value;
}

// Converts a USD amount to ETH based on current ETH price
export function convertUsdToEth(usdAmount: number, ethPrice: number): number {
  if (!ethPrice || ethPrice <= 0) return 0;
  return usdAmount / ethPrice;
}

/**
 * Solana part
 */

export const solanaConnection = SolanaConnectionSingleton.getInstance();
export function isSolanaAddress(address: any): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (e) {
    return false;
  }
}

// Updated the getERC20TokenBalance function
export const getERC20TokenBalance = async (
  walletAddress: string,
  tokenAddress: string,
  chain: any,
  activeWallet: ConnectedWallet
) => {
  try {
    // Skip call for invalid inputs
    if (!walletAddress || !tokenAddress || !chain) {
      console.warn("Missing parameters for getERC20TokenBalance:", {
        walletAddress,
        tokenAddress,
        chain,
      });
      return {
        balance: 0n,
        decimals: 18,
      };
    }

    // Don't try to get balance for the zero address (represents native token)
    if (tokenAddress === "0x0000000000000000000000000000000000000000") {
      return {
        balance: 0n,
        decimals: 18,
      };
    }

    // Validate chain before proceeding
    if (!chain.id) {
      console.warn("Invalid chain object:", chain);
      return {
        balance: 0n,
        decimals: 18,
      };
    }

    // Verify if the token exists in APPROVED_TOKENS for this chain
    if (
      !APPROVED_TOKENS[chain.id]?.some(
        (token) => token.address.toLowerCase() === tokenAddress.toLowerCase(),
      )
    ) {
      console.warn(
        `Token ${tokenAddress} is not in the approved list for chain ${chain.id}`,
      );
      return {
        balance: 0n,
        decimals: 18,
      };
    }

    const publicClient = await getPublicClient(activeWallet);
    if (!publicClient) {
      console.log("NO publicClient for chainId", chain.id);
      return {
        balance: 0n,
        decimals: 18,
      };
    }

    const contract = getContract({
      client: { public: publicClient },
      address: tokenAddress,
      abi: erc20Abi,
    });

    console.log(publicClient, 'publicClient.account')

    try {
      // Get token decimals first to avoid potential read issues
      let decimals = 18;
      try {
        decimals = await contract.read.decimals();
      } catch (error) {
        console.warn(
          "Failed to read token decimals, using default of 18:",
          error,
        );
        decimals = 18;
      }

      // Now get the balance
      const balance = await contract.read.balanceOf([walletAddress]);

      console.log(balance, decimals, 'balance, decimals')

      return {
        balance: balance,
        decimals,
      };
    } catch (error) {
      console.error("Error fetching token balance:", error);

      // Special handling for "AbiDecodingZeroDataError"
      if (error instanceof Error) {
        if (error.name === "AbiDecodingZeroDataError") {
          console.warn(
            `Zero data returned from contract ${tokenAddress} on chain ${chain.id}. Contract may not exist at this address on this chain.`,
          );
        } else if (
          error.message.includes("execution reverted") ||
          error.message.includes("call revert exception")
        ) {
          console.warn(
            `Contract call reverted for token ${tokenAddress} on chain ${chain.id}`,
          );
        }
      }

      // Return a default value when balance fetching fails
      return {
        balance: 0n,
        decimals: 18,
      };
    }
  } catch (error) {
    console.error("Error initializing contract:", error);
    return {
      balance: 0n,
      decimals: 18,
    };
  }
};

export async function getSplTokenBalance(
  walletAddress: string,
  tokenMint: string,
) {
  const publicKey = new PublicKey(walletAddress);
  const mintAddress = new PublicKey(tokenMint);

  // Fetch all SPL token accounts owned by the wallet
  const tokenAccounts = await solanaConnection.getParsedTokenAccountsByOwner(
    publicKey,
    {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // SPL Token Program
    },
  );

  // Find the token account that matches the specified token mint
  const tokenAccount = tokenAccounts.value.find(
    (account) =>
      account.account.data.parsed.info.mint === mintAddress.toBase58(),
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

export function shortAddressForm(address: string) {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

export function getSolanaEVMAddress(solanaPublicKey: string) {
  // Log the input
  console.log("Solana Public Key:", solanaPublicKey);

  // Convert the base58 string into ASCII bytes
  const asciiBytes = Buffer.from(solanaPublicKey, "ascii");

  // Take the LAST 20 bytes (last 40 hex characters)
  const evmAddress = "0x" + asciiBytes.slice(-20).toString("hex");

  return evmAddress;
}

export function getSolanaAddressFromEVM(evmAddress: string): string {
  // Strip the 0x prefix if present
  const hex = evmAddress.startsWith("0x") ? evmAddress.slice(2) : evmAddress;

  // Convert hex to ASCII string
  const solanaAddress = Buffer.from(hex, "hex").toString("ascii");

  return solanaAddress;
}

export function format(value: bigint, decimals: number) {
  if (!value || value == 0n) return "0";

  const str = Number(formatUnits(value, decimals)).toFixed(6);
  return Number(str).toString();
}

// Format number with suffix M = Million, K = Thousand, B = Billion, T = Trillion, etc.
export function formatNumberWithSuffix(num: number): string {
  if (num === null || num === undefined || isNaN(num)) {
    return "0";
  }

  if (num < 1000) {
    return num.toFixed(2);
  }

  const absNum = Math.abs(num);

  if (absNum >= 1000000000) {
    return (num / 1000000000).toFixed(2) + "B";
  }

  if (absNum >= 1000000) {
    return (num / 1000000).toFixed(2) + "M";
  }

  if (absNum >= 1000) {
    return (num / 1000).toFixed(2) + "K";
  }

  return num.toFixed(2);
}

// Add the formatTokenBalance function
export const formatTokenBalance = (
  balance: string | number,
  symbol: string,
): string => {
  const num = Number(balance);
  // Check if token is a stablecoin
  const isStablecoin =
    symbol?.includes("USD") ||
    symbol?.includes("DAI") ||
    symbol?.includes("USDT") ||
    symbol?.includes("USDC") ||
    symbol?.includes("BUSD");
  // Format with 2 decimal places for stablecoins, 4 for others
  const decimals = isStablecoin ? 2 : 4;
  return parseFloat(num.toFixed(decimals)).toString();
};

export function bigIntReplacer(key: string, value: any) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

export function bigIntReviver(key: string, value: any) {
  if (key === "value") {
    try {
      return BigInt(value);
    } catch (e) {
      return value;
    }
  }
  return value;
}
