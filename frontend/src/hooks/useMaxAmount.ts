import { useCallback } from "react";
import { UseFormSetValue } from "react-hook-form";
import { Token, Balance, VaultTotalAssetsinToken } from "@/types/types";
import {
  CheckTheTxIsInProgress,
  updateLocalStorageObject,
} from "@/utils/localStorageUtils";
import { bigIntReplacer } from "@/utils/utils";

interface UseMaxAmountProps {
  inputToken: Token | null | undefined;
  tokenBalance: Balance;
  isDeposit: boolean;
  vaultId?: string;
  vaultTotalAssetinToken?: VaultTotalAssetsinToken;
  onAmountChange: (amount: string) => void;
  setValue?: (field: string, value: string, options?: any) => void;
  fieldName?: string;
}

export const useMaxAmount = ({
  inputToken,
  tokenBalance,
  isDeposit,
  vaultId,
  vaultTotalAssetinToken,
  onAmountChange,
  setValue,
  fieldName = "amount",
}: UseMaxAmountProps) => {
  const handleMaxClick = useCallback(() => {
    const isTxInProgress = vaultId ? CheckTheTxIsInProgress(vaultId) : false;

    if (!inputToken || isTxInProgress) return;

    let maxAmount: string;

    if (isDeposit) {
      // For deposits, we use wallet balance
      const formattedAmount = Number(tokenBalance.formatted).toFixed(7);
      maxAmount = Number(formattedAmount).toString();
    } else {
      // For withdrawals, we use vault balance
      const vaultMaxValue =
        vaultTotalAssetinToken?.totalAssetsinToken?.toString() ?? "0.00";
      const formattedMaxValue = Number(vaultMaxValue).toFixed(7);
      maxAmount = Number(formattedMaxValue).toString();
    }

    onAmountChange(maxAmount);

    if (setValue) {
      setValue(fieldName, maxAmount, { shouldValidate: true });
    }

    if (vaultId) {
      const updatedBalance: Balance = {
        ...tokenBalance,
        formatted: maxAmount,
      };

      updateLocalStorageObject(vaultId, {
        inputBal: JSON.stringify(updatedBalance, bigIntReplacer),
        displayValue: maxAmount,
      });
    }
  }, [
    inputToken,
    tokenBalance,
    isDeposit,
    vaultId,
    vaultTotalAssetinToken,
    onAmountChange,
    setValue,
    fieldName,
  ]);

  const getMaxAmount = useCallback((): string => {
    if (!inputToken) return "0";

    if (isDeposit) {
      const formattedAmount = Number(tokenBalance.formatted).toFixed(7);
      return Number(formattedAmount).toString();
    } else {
      const vaultMaxValue =
        vaultTotalAssetinToken?.totalAssetsinToken?.toString() ?? "0.00";
      const formattedMaxValue = Number(vaultMaxValue).toFixed(7);
      return Number(formattedMaxValue).toString();
    }
  }, [inputToken, tokenBalance, isDeposit, vaultTotalAssetinToken]);

  return {
    handleMaxClick,
    getMaxAmount,
    isMaxDisabled:
      !inputToken || (vaultId ? CheckTheTxIsInProgress(vaultId) : false),
  };
};

// Send form
interface SendFormData {
  recipientAddress: string;
  amount: string;
  network: string;
  token?: string;
}

export const useMaxAmountSimple = (
  selectedToken: Token | null,
  tokenBalances: Map<
    string,
    { balance: Balance; price: number; isLoading: boolean }
  >,
  activeChain: any,
  setValue: UseFormSetValue<SendFormData>,
) => {
  const getMaxAmount = useCallback((): string => {
    if (!selectedToken || !activeChain) return "0";

    const tokenKey = `${selectedToken.address.toLowerCase()}-${activeChain?.id}`;
    const tokenData = tokenBalances.get(tokenKey);

    if (tokenData?.balance) {
      return tokenData.balance.formatted;
    }

    return "0";
  }, [selectedToken, activeChain, tokenBalances]);

  const handleMaxClick = useCallback((): void => {
    if (!selectedToken || !activeChain) return;

    const maxAmount = getMaxAmount();
    setValue("amount", maxAmount, { shouldValidate: true });
  }, [selectedToken, activeChain, getMaxAmount, setValue]);

  return {
    handleMaxClick,
    getMaxAmount,
    isMaxDisabled: !selectedToken,
  };
};
