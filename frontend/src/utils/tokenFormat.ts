import { formatCurrency } from "@/utils/utils";

// Stablecoin symbols for formatting logic
const STABLECOIN_SYMBOLS = ["USD", "DAI", "USDT", "USDC", "BUSD"];

// Format token balance based on token type (2 decimals for stablecoins, 4 for others)
export const formatTokenBalance = (
  balance: string | number,
  symbol: string,
): string => {
  const num = Math.max(0, Number(balance));

  // Check if token is a stablecoin
  const isStablecoin = STABLECOIN_SYMBOLS.some((stableSymbol) =>
    symbol?.includes(stableSymbol),
  );

  const decimals = isStablecoin ? 2 : 4;
  return parseFloat(num.toFixed(decimals)).toString();
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