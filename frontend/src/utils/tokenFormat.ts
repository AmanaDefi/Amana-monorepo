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

// Format USD value ensuring it's never negative
export const formatUSDValue = (value: number): string => {
  return formatCurrency(Math.max(0, value));
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