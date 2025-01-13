import { useState } from "react";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import VaultsView from "../components/VaultsView";
import { VaultData, VaultAPY, UserVaultBalance, VaultTotalAssets, VaultTotalAssetsinToken } from "../types/types";
import { VAULT_DATA } from "../constants/index";
import { useUpdateVaultBalanceAndTotal, useUpdateAPYs } from "@/hooks/hooks";

const VaultsContainer = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
  const [userVaultBalances, setUserVaultBalances] = useState<UserVaultBalance[]>([]);
  const [vaultTotalAssets, setVaultTotalAssets] = useState<VaultTotalAssets[]>([]);
  const [vaultTotalAssetsinToken, setVaultTotalAssetsinToken] = useState<VaultTotalAssetsinToken[]>([]);


  const vaults: VaultData[] = VAULT_DATA;
  const EOAaccount = useActiveAccount();
  const activeChain = useActiveWalletChain();
  if (!activeChain) {
    throw new Error("No active chain found");
  }

  if (!EOAaccount) {
    throw new Error("No active account found");
  }

  useUpdateVaultBalanceAndTotal(vaults, EOAaccount, setUserVaultBalances, setVaultTotalAssets, setVaultTotalAssetsinToken);
  useUpdateAPYs(vaults, setVaultAPYs, setLoading);

  return (
    <VaultsView
      loading={loading}
      vaults={vaults}
      vaultAPYs={vaultAPYs}
      userVaultBalances={userVaultBalances}
      vaultTotalAssets={vaultTotalAssets}
      vaultTotalAssetsinToken={vaultTotalAssetsinToken}
    />
  );
};

export default VaultsContainer;
