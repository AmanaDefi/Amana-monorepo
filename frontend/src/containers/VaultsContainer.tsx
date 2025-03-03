import { useState } from "react";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import VaultsView from "../components/VaultsView";
import { VaultData, VaultAPY, UserVaultBalance, VaultTotalAssets, VaultTotalAssetsinToken } from "../types/types";
import { VAULT_DATA } from "../constants/index";
import { useUpdateVaultBalanceAndTotal, useUpdateAPYs } from "@/hooks/hooks";
import { Chain } from "thirdweb";
import { Account } from "thirdweb/wallets";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { useTokenPriceBySymbol } from "@/hooks/hooks";

export const ZERO_ACCOUNT: Account = {
  address: "0x0000000000000000000000000000000000000000",
  sendTransaction: async () => {
    throw new Error("sendTransaction not implemented for ZERO_ACCOUNT");
  },
  signMessage: async () => {
    throw new Error("signMessage not implemented for ZERO_ACCOUNT");
  },
  signTypedData: async () => {
    throw new Error("signTypedData not implemented for ZERO_ACCOUNT");
  },
};

interface VaultsContainerProps {
  activeChain?: Chain; // Make activeChain optional
  defaultAccount?: Account; // Optional default account
}

const VaultsContainer: React.FC<VaultsContainerProps> = ({ activeChain, defaultAccount = ZERO_ACCOUNT }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
  const [userVaultBalances, setUserVaultBalances] = useState<UserVaultBalance[]>([]);
  const [vaultTotalAssets, setVaultTotalAssets] = useState<VaultTotalAssets[]>([]);
  const [vaultTotalAssetsinToken, setVaultTotalAssetsinToken] = useState<VaultTotalAssetsinToken[]>([]);

  const vaults: VaultData[] = VAULT_DATA;
  const EOAaccount = useActiveAccount() || defaultAccount;
  const hookActiveChain = useActiveWalletChain(); // Always call the hook unconditionally
  const resolvedActiveChain = activeChain || hookActiveChain || SUPPORTED_CHAINS[0]; // Compute resolved chain

  if (!resolvedActiveChain) {
    throw new Error("No active chain found");
  }

  useUpdateVaultBalanceAndTotal(vaults, EOAaccount, setUserVaultBalances, setVaultTotalAssets, setVaultTotalAssetsinToken);
  const crvTokenPrice = useTokenPriceBySymbol("CRV");
  const ethTokenPrice = useTokenPriceBySymbol("ETH");
  const compTokenPrice = useTokenPriceBySymbol("COMP");
  console.log("compTokenPrice: ", compTokenPrice)

  useUpdateAPYs(vaults, setVaultAPYs, setLoading, crvTokenPrice, ethTokenPrice, compTokenPrice);

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
