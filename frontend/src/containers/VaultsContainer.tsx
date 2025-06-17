"use client";

import VaultsGrid from "../components/VaultsWrapper";
import { Chain } from "viem";
import { UseUserResult } from "@account-kit/react";
import { useVaultData } from "@/hooks/useVaultData";

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

const VaultsContainer: React.FC<VaultsContainerProps> = () => {
  const { loading, vaults, vaultAPYs, userVaultBalances, vaultTotalAssets } =
    useVaultData();

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
