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
  vaultId: string;
  vaultTotalAssetinToken?: VaultTotalAssetsinToken;
  setInputBalance: (balance: Balance) => void;
  setDisplayValue: (value: string) => void;
  handleChangeInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const useMaxAmount = ({
  inputToken,
  tokenBalance,
  isDeposit,
  vaultId,
  vaultTotalAssetinToken,
  setInputBalance,
  setDisplayValue,
  handleChangeInput,
}: UseMaxAmountProps) => {
  const handleMaxClick = useCallback(() => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultId);

    if (!inputToken || isTxInProgress) return;

    if (isDeposit) {
      setInputBalance(tokenBalance);
      setDisplayValue(tokenBalance.formatted);

      updateLocalStorageObject(vaultId, {
        inputBal: JSON.stringify(tokenBalance, bigIntReplacer),
        displayValue: tokenBalance.formatted,
      });
    } else {
      const maxValue =
        vaultTotalAssetinToken?.totalAssetsinToken?.toString() ?? "0.00";

      handleChangeInput({
        currentTarget: { value: maxValue },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [
    inputToken,
    tokenBalance,
    isDeposit,
    vaultId,
    vaultTotalAssetinToken,
    setInputBalance,
    setDisplayValue,
    handleChangeInput,
  ]);

  const getMaxAmount = useCallback((): string => {
    if (!inputToken) return "0";

    if (isDeposit) {
      return tokenBalance.formatted;
    } else {
      return vaultTotalAssetinToken?.totalAssetsinToken?.toString() ?? "0.00";
    }
  }, [inputToken, tokenBalance, isDeposit, vaultTotalAssetinToken]);

  return {
    handleMaxClick,
    getMaxAmount,
    isMaxDisabled: !inputToken || CheckTheTxIsInProgress(vaultId),
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
