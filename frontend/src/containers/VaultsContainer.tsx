"use client";

import { useState } from "react";
import VaultsGrid from "../components/VaultsWrapper";
import {
  VaultData,
  VaultAPY,
  UserVaultBalance,
  VaultTotalAssets,
  VaultTotalAssetsinToken,
} from "../types/types";
import { VAULT_DATA } from "../constants/index";
import { useUpdateVaultBalanceAndTotal, useUpdateAPYs } from "@/hooks/hooks";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { usePathname } from "next/navigation";
import { Chain } from "viem";
import { UseUserResult } from "@account-kit/react";

export const ZERO_ACCOUNT = {
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
  defaultAccount?: UseUserResult; // Optional default account
}

const VaultsContainer: React.FC<VaultsContainerProps> = ({
  activeChain,
  defaultAccount = ZERO_ACCOUNT,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
  const [userVaultBalances, setUserVaultBalances] = useState<
    UserVaultBalance[]
  >([]);
  const [vaultTotalAssets, setVaultTotalAssets] = useState<VaultTotalAssets[]>(
    [],
  );
  const [vaultTotalAssetsinToken, setVaultTotalAssetsinToken] = useState<
    VaultTotalAssetsinToken[]
  >([]);
  const pathname = usePathname();

  const vaults: VaultData[] = VAULT_DATA;
  const { walletAddress } = useMultiChain();

  useUpdateVaultBalanceAndTotal(
    vaults,
    walletAddress,
    setUserVaultBalances,
    setVaultTotalAssets,
    setVaultTotalAssetsinToken,
  );
  //console.log("User Vault Balances:", userVaultBalances);
  const crvTokenPrice = useTokenPriceBySymbol("CRV");
  const cvxTokenPrice = useTokenPriceBySymbol("CVX");
  const ethTokenPrice = useTokenPriceBySymbol("ETH");
  const compTokenPrice = useTokenPriceBySymbol("COMP");
  const opTokenPrice = useTokenPriceBySymbol("OP");

  useUpdateAPYs(
    vaults,
    setVaultAPYs,
    setLoading,
    crvTokenPrice,
    cvxTokenPrice,
    ethTokenPrice,
    compTokenPrice,
    opTokenPrice,
    true,
  );

  return (
    <VaultsGrid
      loading={loading}
      vaults={vaults}
      vaultAPYs={vaultAPYs}
      userVaultBalances={userVaultBalances}
      vaultTotalAssets={vaultTotalAssets}
    />
  );
};

export default VaultsContainer;
