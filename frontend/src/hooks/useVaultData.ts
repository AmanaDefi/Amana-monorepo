import { apiService } from "@/service";
import { useQuery } from "@tanstack/react-query";

// export default function useVaultData() {
//   const { data, isLoading, error } = useQuery({
//     queryKey: ["VaultDat"],
//     queryFn: () => apiService.api.getVaultData(),
//   });

//   return { data, isLoading, error };
// }

import { useState } from "react";
import {
  VaultData,
  VaultAPY,
  UserVaultBalance,
  VaultTotalAssets,
  VaultTotalAssetsinToken,
} from "@/types/types";
import { VAULT_DATA } from "@/constants/index";
import { useUpdateVaultBalanceAndTotal, useUpdateAPYs } from "@/hooks/hooks";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { useMultiChain } from "@/providers/MultiChainProvider";

export const useVaultData = () => {
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

  const vaults: VaultData[] = VAULT_DATA;
  const { walletAddress } = useMultiChain();

  useUpdateVaultBalanceAndTotal(
    vaults,
    walletAddress,
    setUserVaultBalances,
    setVaultTotalAssets,
    setVaultTotalAssetsinToken,
  );

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

  return {
    loading,
    vaults,
    vaultAPYs,
    userVaultBalances,
    vaultTotalAssets,
    vaultTotalAssetsinToken,
  };
};