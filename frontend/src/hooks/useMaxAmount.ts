import { useCallback } from "react";
import { UseFormSetValue } from "react-hook-form";
import { Token, Balance, VaultTotalAssetsinToken } from "@/types/types";
import {
  CheckTheTxIsInProgress,
  updateLocalStorageObject,
} from "@/utils/localStorageUtils";
import { bigIntReplacer } from "@/utils/utils";
import { fetchUserVaultMaxWithdraw } from "@/actions/actions";

interface UseMaxAmountProps {
  inputToken: Token | null | undefined;
  tokenBalance: Balance;
  isDeposit: boolean;
  vaultId: string;
  vaultTotalAssetinToken?: VaultTotalAssetsinToken;
  setInputBalance: (balance: Balance) => void;
  setDisplayValue: (value: string) => void;
  handleChangeInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  walletAddress: string | null;
  vaultTokenDecimals: number;
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
  walletAddress,
  vaultTokenDecimals
}: UseMaxAmountProps) => {
  const handleMaxClick = useCallback(async () => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultId);

    if (!inputToken || isTxInProgress || !walletAddress) return;

    if (isDeposit) {
      setInputBalance(tokenBalance);
      setDisplayValue(tokenBalance.formatted);

      updateLocalStorageObject(vaultId, {
        inputBal: JSON.stringify(tokenBalance, bigIntReplacer),
        displayValue: tokenBalance.formatted,
      });
    } else {
      const maxAmount = await fetchUserVaultMaxWithdraw(
        vaultTokenDecimals,
        walletAddress,
        vaultId,
      );
      const maxValue = maxAmount ?? "0.00";

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
    walletAddress,
    vaultTokenDecimals
  ]);

  const getMaxAmount = useCallback(async (): Promise<string> => {
    if (!inputToken) return "0";

    if (isDeposit) {
      return tokenBalance.formatted;
    } else {
      if (!walletAddress) {
        return "0.00";
      }

      const maxAmount = await fetchUserVaultMaxWithdraw(
        vaultTokenDecimals,
        walletAddress,
        vaultId,
      );
      return (
        maxAmount ??
        vaultTotalAssetinToken?.totalAssetsinToken?.toString() ??
        "0.00"
      );
    }
  }, [inputToken, tokenBalance, isDeposit, vaultTotalAssetinToken, walletAddress, vaultId, vaultTokenDecimals]);

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
