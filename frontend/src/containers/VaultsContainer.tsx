import { useState, useEffect } from "react";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import {
  executeDeposit,
  executeWithdrawal
} from "../actions/actions";
import VaultsView from "../components/VaultsView";
import { VaultData, VaultAPY, UserVaultBalance, VaultTotalAssets, VaultTotalAssetsinToken } from "../types/types";
import { VAULT_DATA } from "../constants/index";
import { Address, waitForReceipt } from "thirdweb";
import { Account } from "thirdweb/wallets";
import { toast } from "react-toastify";
import mixpanel from "mixpanel-browser";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateVaultBalanceAndTotal, useUpdateAPYs } from "@/hooks/hooks";

const VaultsContainer = () => {
  const [transactionAmount, setTransactionAmount] = useState("1");
  const [loading, setLoading] = useState<boolean>(true);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
  const [userVaultBalances, setUserVaultBalances] = useState<UserVaultBalance[]>([]);
  const [vaultTotalAssets, setVaultTotalAssets] = useState<VaultTotalAssets[]>([]);
  const [vaultTotalAssetsinToken, setVaultTotalAssetsinToken] = useState<VaultTotalAssetsinToken[]>([]);
  const [transactionCompleted, setTransactionCompleted] = useState(false);

  const vaults: VaultData[] = VAULT_DATA;
  const EOAaccount = useActiveAccount();
  const activeChain = useActiveWalletChain();
  if (!activeChain) {
    throw new Error("No active chain found");
  }
  const queryClient = useQueryClient();

  useEffect(() => {
    if (EOAaccount) {
      setActiveAccount(EOAaccount);
    } else {
      setActiveAccount(null);
    }
  }, [EOAaccount]);

  if (!EOAaccount) {
    throw new Error("No active account found");
  }

  useUpdateVaultBalanceAndTotal(vaults, EOAaccount, setUserVaultBalances, setVaultTotalAssets, setVaultTotalAssetsinToken, transactionCompleted);
  useUpdateAPYs(vaults, setVaultAPYs, setLoading);

  const handleDepositTransaction = async (vaultId: Address) => {
    setTransactionCompleted(false)
    try {
      setTransactionAmount;
      const value = Number(transactionAmount)

      const vault = vaults.find((v) => v.id === vaultId);
      if (!vault) {
        throw new Error("Vault not found in vaultData");
      }
      const inputToken = vault.inputToken;
      const scaledAmount = BigInt(value * 10 ** inputToken.decimals)

      mixpanel.track("Deposit Submitted", {
        vault: vaultId.toString(),
        amount: scaledAmount.toString(),
      });
      const receipt = await executeDeposit(
        vaultId,
        inputToken.address as Address,
        EOAaccount,
        activeChain,
        scaledAmount, //TODO make this general for all tokens?
      );

      mixpanel.track("Deposit Submitted", {
        vault: vaultId.toString(),
        amount: scaledAmount.toString(),
      });

      await waitForReceipt(receipt)
      toast.success("Transaction confirmed");
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
      // refetch()
      setTransactionCompleted(true);
    } catch (error) {
      mixpanel.track("Deposit Submitted", {
        vault: vaultId.toString()
      });
      toast.error("Transaction failed", {
        position: "top-right",
        autoClose: 2000,  // Close automatically after 2 seconds
      });
      throw new Error("Transaction failed");
    }
  };

  const handleWithdrawTransaction = async (vaultId: Address) => {
    setTransactionCompleted(false)
    try {
      setTransactionAmount;
      const value = Number(transactionAmount)
      const vault = vaults.find((v) => v.id === vaultId);
      if (!vault) {
        throw new Error("Vault not found in vaultData");
      }
      const inputToken = vault.inputToken;
      const scaledAmount = BigInt(value * 10 ** inputToken.decimals)
      console.log("scaledAmount", scaledAmount);
      mixpanel.track("Withdraw Submitted", {
        vault: vaultId.toString(),
        amount: scaledAmount.toString(),
      });

      const receipt = await executeWithdrawal(
        vaultId,
        EOAaccount,
        activeChain,
        scaledAmount,
      );
      mixpanel.track("Withdraw Succeeded", {
        vault: vaultId.toString(),
        amount: scaledAmount.toString(),
      });

      await waitForReceipt(receipt)
      toast.success("Transaction confirmed");
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
      // refetch()
      setTransactionCompleted(true);
    } catch (error) {
      mixpanel.track("Withdraw Failed", {
        vault: vaultId.toString(),
      });
      toast.error("Transaction failed", {
        position: "top-right",
        autoClose: 2000,  // Close automatically after 2 seconds
      });
      throw new Error("Transaction failed");
    }
  };

  return (
    <VaultsView
      loading={loading}
      vaults={vaults}
      vaultAPYs={vaultAPYs}
      userVaultBalances={userVaultBalances}
      vaultTotalAssets={vaultTotalAssets}
      vaultTotalAssetsinToken={vaultTotalAssetsinToken}
      transactionAmount={transactionAmount}
      setTransactionAmount={setTransactionAmount}
      depositTransaction={handleDepositTransaction}
      withdrawTransaction={handleWithdrawTransaction}
      activeAccount={EOAaccount}
    />
  );
};

export default VaultsContainer;
