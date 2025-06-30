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

// Determine if input loader should be shown
export const shouldShowInputLoader = (
  loadingOutputToken: boolean | undefined,
  isDeposit: boolean,
  isOutput: boolean | undefined,
): boolean => {
  return (
    !!loadingOutputToken &&
    ((!isDeposit && !isOutput) || (isDeposit && !!isOutput))
  );
};

// Determine if USD loader should be shown
export const shouldShowUSDLoader = (
  loadingOutputToken: boolean | undefined,
  isDeposit: boolean,
  isOutput: boolean | undefined,
): boolean => {
  return !!loadingOutputToken && ((!isDeposit && !isOutput) || !!isOutput);
};
