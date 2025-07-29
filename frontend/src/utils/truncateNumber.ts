import { formatTokenBalance } from "./utils";

export function truncateNumber(
  num: string | number,
  maxDecimals: number = 6,
): string {
  const numStr = num.toString();

  if (!numStr.includes(".")) return numStr;

  const [integer, decimal] = numStr.split(".");

  if (integer === "0" && decimal) {
    const firstNonZeroIndex = decimal.search(/[1-9]/);
    if (firstNonZeroIndex !== -1) {
      const adaptiveDecimals = Math.max(maxDecimals, firstNonZeroIndex + 2);
      const truncatedDecimal = decimal.substring(0, adaptiveDecimals);
      const cleanDecimal = truncatedDecimal.replace(/0+$/, "");
      return cleanDecimal ? `${integer}.${cleanDecimal}` : integer;
    }
  }

  const truncatedDecimal = decimal.substring(0, maxDecimals);
  const cleanDecimal = truncatedDecimal.replace(/0+$/, "");

  return cleanDecimal ? `${integer}.${cleanDecimal}` : integer;
}

export function formatTruncatedTokenBalance(
  balance: string,
  symbol: string,
  maxDecimals: number = 6,
): string {
  const formatted = formatTokenBalance(balance, symbol);

  const [numPart, ...rest] = formatted.split(" ");
  const truncated = truncateNumber(numPart, maxDecimals);

  return rest.length > 0 ? `${truncated} ${rest.join(" ")}` : truncated;
}

export function safeTruncateText(text: string, maxLength: number = 15): string {
  if (text.length <= maxLength) return text;

  const truncateAt = Math.max(
    text.lastIndexOf(".", maxLength - 3),
    maxLength - 3,
  );

  return text.substring(0, truncateAt) + "...";
}

export function fullTruncateTokenBalance(
  balance: string,
  symbol: string,
  maxDecimals: number = 4,
  maxLength: number = 12,
): string {
  const truncatedNumber = truncateNumber(balance, maxDecimals);

  const fullText = `${truncatedNumber} ${symbol}`;

  return safeTruncateText(fullText, maxLength);
}

export function formatRewards(
  amount: string | number,
  unit: string = "Points",
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;

  if (num === 0) return `0 ${unit}`;

  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B ${unit}`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M ${unit}`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K ${unit}`;

  return `${truncateNumber(num, 2)} ${unit}`;
}
