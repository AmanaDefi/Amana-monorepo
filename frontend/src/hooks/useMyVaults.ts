import { useMemo } from "react";
import type { VaultData, UserVaultBalance } from "@/types/types";

interface UseMyVaultsProps {
  vaults: VaultData[];
  userVaultBalances: UserVaultBalance[];
}

export const useMyVaults = ({
  vaults,
  userVaultBalances,
}: UseMyVaultsProps) => {
  const myVaults = useMemo(() => {
    return vaults.filter((vault) => {
      const hasDeposited = userVaultBalances
        ? !!Number(
            userVaultBalances?.find((balance) => balance?.vaultId === vault?.id)
              ?.balance,
          )
        : false;

      return hasDeposited;
    });
  }, [vaults, userVaultBalances]);

  return myVaults;
};
