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
