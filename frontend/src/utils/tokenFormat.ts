import { formatCurrency } from "@/utils/utils";
import { isStablecoinSymbol } from "@/constants/chainConfig";

// Format token balance based on token type (2 decimals for stablecoins, 4 for others)
export const formatTokenBalance = (
  balance: string | number,
  symbol: string,
): string => {
  const num = Math.max(0, Number(balance));

  // Check if token is a stablecoin using centralized function
  const isStablecoin = isStablecoinSymbol(symbol);

  const decimals = isStablecoin ? 2 : 4;
  const formatted = num.toFixed(decimals);

  if (parseFloat(formatted) === 0 && num > 0) {
    return isStablecoin ? "< 0.01" : "< 0.0001";
  }

  return parseFloat(formatted).toString();
};

// Format token balance in USD terms
export const formatTokenBalanceUSD = (
  balance: string | number,
  symbol: string,
  tokenPrice: number = 0,
): string => {
  const num = Math.max(0, Number(balance));
  
  // If no price provided or price is 0, return the original format
  if (!tokenPrice || tokenPrice === 0) {
    return formatTokenBalance(balance, symbol);
  }
  
  // Calculate USD value
  const usdValue = num * tokenPrice;
  
  // For very small values, show "< $0.01"
  if (usdValue > 0 && usdValue < 0.01) {
    return "< $0.01";
  }
  
  // Format as USD currency
  return formatUSDAmount(usdValue, {
    ensureNonNegative: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Format USD value ensuring it's never negative
export const formatUSDValue = (value: number): string => {
  return formatUSDAmount(Math.max(0, value));
};

export const shouldShowInputLoader = (
  loadingOutputToken: boolean | undefined,
  isDeposit: boolean,
  isOutput: boolean | undefined,
): boolean => {
  return false;
};

export const shouldShowUSDLoader = (
  loadingOutputToken: boolean | undefined,
  isDeposit: boolean,
  isOutput: boolean | undefined,
): boolean => {
  return !!loadingOutputToken && !!isOutput;
};

export const formatUSDAmount = (
  value: number,
  options: {
    ensureNonNegative?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {},
): string => {
  const {
    ensureNonNegative = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  const processedValue = ensureNonNegative ? Math.max(0, value) : value;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(processedValue);
};

/**
 * Formats share amounts intelligently based on magnitude and value patterns
 * @param sharesValue - The raw shares value
 * @param vaultTokenDecimals - The decimals of the vault token (optional, for context)
 */
export const formatShares = (sharesValue: string, vaultTokenDecimals?: number): string => {   
  const sharesNumber = parseFloat(sharesValue);
   
  // Case 1: Very small decimals (< 1) - already human-readable
  if (sharesNumber < 1) {
    const result = sharesNumber.toFixed(6).replace(/\.?0+$/, '');
    return result;
  }
   
  // Case 2: Medium range (1-10000) - likely already human-readable
  // This covers: 18→18 decimals, 6→6 decimals
  if (sharesNumber >= 1 && sharesNumber < 1000000) {
    const result = sharesNumber.toFixed(12).replace(/\.?0+$/, '');
    return result;
  }

  // Case 3: Very large numbers - need scaling
  // Use vaultTokenDecimals if provided, otherwise fall back to magnitude-based scaling
  let scalingFactor;
  
  if (vaultTokenDecimals !== undefined) {
    // Use vault token decimals for accurate scaling
    scalingFactor = Math.pow(10, vaultTokenDecimals);
  } else {
    // Fallback to magnitude-based scaling
    if (sharesNumber > 1000000000000000) {
      // Extremely large numbers (> 10^15) - scale by 10^12
      scalingFactor = Math.pow(10, 12);
    } else {
      // Large numbers (> 10^9) - scale by 10^12
      scalingFactor = Math.pow(10, 12);
    }
  } 

  const formattedShares = sharesNumber / scalingFactor;
  
  const result = formattedShares.toFixed(6).replace(/\.?0+$/, '');
   
  return result;
};