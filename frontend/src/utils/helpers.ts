import { Balance } from "@/types/types";

export const NumberFormatter = Intl.NumberFormat("en", {
  //@ts-ignore
  notation: "compact",
});

export const EMPTY_BALANCE: Balance = {
  value: BigInt(0),
  formatted: "0",
  formattedUSD: "0"
}