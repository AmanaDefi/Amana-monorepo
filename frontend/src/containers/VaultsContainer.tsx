import { useState } from "react";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import VaultsView from "../components/VaultsView";
import { VaultData, VaultAPY, UserVaultBalance, VaultTotalAssets, VaultTotalAssetsinToken } from "../types/types";
import { DEPRECATED_VAULT_DATA, VAULT_DATA } from "../constants/index";
import { useUpdateVaultBalanceAndTotal, useUpdateAPYs } from "@/hooks/hooks";
import { Chain } from "thirdweb";
import { Account } from "thirdweb/wallets";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { useMultiChain } from "@/providers/MultiChainProvider";

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
  old?: boolean
}

const VaultsContainer: React.FC<VaultsContainerProps> = ({ activeChain, defaultAccount = ZERO_ACCOUNT, old = false }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
  const [userVaultBalances, setUserVaultBalances] = useState<UserVaultBalance[]>([]);
  const [vaultTotalAssets, setVaultTotalAssets] = useState<VaultTotalAssets[]>([]);
  const [vaultTotalAssetsinToken, setVaultTotalAssetsinToken] = useState<VaultTotalAssetsinToken[]>([]);

  const vaults: VaultData[] = old ? DEPRECATED_VAULT_DATA : VAULT_DATA;
  const EOAaccount = useActiveAccount() || defaultAccount;
  const { walletAddress } = useMultiChain();

  useUpdateVaultBalanceAndTotal(vaults, walletAddress, setUserVaultBalances, setVaultTotalAssets, setVaultTotalAssetsinToken);
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
