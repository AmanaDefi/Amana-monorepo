import { Token, Balance } from "@/types/types";
import { getOnlyTokenSymbol } from "@/utils/utils";

export interface ValidationContext {
  selectedToken: Token | null;
  activeChain: any;
  tokenBalances: Map<
    string,
    { balance: Balance; price: number; isLoading: boolean }
  >;
  balance?: Balance;
}

export const createAmountValidator = (context: ValidationContext) => {
  return (value: string): string | true => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return "Amount must be a positive number";
    }

    const { selectedToken, activeChain, tokenBalances, balance } = context;

    if (selectedToken && activeChain) {
      const tokenKey = `${selectedToken.address.toLowerCase()}-${activeChain?.id}`;
      const tokenData = tokenBalances.get(tokenKey);

      if (tokenData?.balance) {
        const tokenBalance = parseFloat(tokenData.balance.formatted);
        if (num > tokenBalance) {
          return `Not enough ${getOnlyTokenSymbol(selectedToken.symbol)} tokens. Available: ${tokenData.balance.formatted}`;
        }
      }
    } else {
      const userBalance = parseFloat(balance?.formatted || "0");
      if (num > userBalance) {
        return "Not enough tokens on your wallet";
      }
    }

    return true;
  };
};
