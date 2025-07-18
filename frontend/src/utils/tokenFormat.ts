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
 * Formats share amounts intelligently based on their format
 * - If shares < 1: already human-readable, just format precision
 * - If shares > 100000000000: assumes 18 decimal receipt token (like ETH)
 * - Otherwise: assumes 6 decimal receipt token (like USDC)
 */
export const formatShares = (sharesValue: string): string => {
  console.log("🔍 formatShares input:", sharesValue);
  
  const sharesNumber = parseFloat(sharesValue);
  console.log("🔍 formatShares parsed number:", sharesNumber);
  
  // If shares is already a small decimal (< 1), it's human-readable
  if (sharesNumber < 1) {
    console.log("🔍 formatShares: small decimal detected, formatting directly");
    const result = sharesNumber.toFixed(6).replace(/\.?0+$/, '');
    console.log("🔍 formatShares final result:", result);
    return result;
  }
  
  // For values between 1 and 100, they're likely already human-readable for 18-decimal tokens
  if (sharesNumber >= 1 && sharesNumber < 100) {
    console.log("🔍 formatShares: medium decimal detected (likely 18-decimal token), formatting directly");
    const result = sharesNumber.toFixed(6).replace(/\.?0+$/, '');
    console.log("🔍 formatShares final result:", result);
    return result;
  }
  
  // Determine scaling factor based on magnitude for very large numbers
  // For very large numbers, the shares appear to already be scaled down by 10^6
  const scalingFactor = sharesNumber > 100000000000 ? Math.pow(10, 12) : Math.pow(10, 6);
  console.log("🔍 formatShares scaling factor:", scalingFactor);
  
  // Convert to human-readable format
  const formattedShares = sharesNumber / scalingFactor;
  console.log("🔍 formatShares calculated value:", formattedShares);
  
  // Format with appropriate precision and remove trailing zeros
  const result = formattedShares.toFixed(6).replace(/\.?0+$/, '');
  console.log("🔍 formatShares final result:", result);
  
  return result;
};