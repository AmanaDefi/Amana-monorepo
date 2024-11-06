import { useEffect } from "react";
import { fetchUserVaultBalance, fetchTotalAssets, fetchTokenPrice, calculateAaveAPY, calculateMoonwellAPY, calculateCompoundAPY } from "../actions/actions";
import { Address } from "thirdweb";
import { VaultData } from "../types/types";
import { Account } from "thirdweb/wallets";
import { getContract, readContract } from "thirdweb";
import { client } from "../utils/client";
import { base } from "thirdweb/chains";

export const useUpdateVaultBalanceAndTotal = (
  vaults: VaultData[],
  activeAccount: Account,
  setUserVaultBalances: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  setVaultTotalAssets: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  setVaultTotalAssetsinToken: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  transactionCompleted: boolean,
) => {
  useEffect(() => {
    const updateVaultBalanceAndTotal = async () => {
      try {
        const balancesAndAssets = await Promise.all(
          vaults.map(async (vault) => {
            try {
              const balance = await fetchUserVaultBalance(
                activeAccount?.address as Address,
                vault.id as Address
              );
              const newTotalAssets = await fetchTotalAssets(vault.id as Address);
              const tokenPrice = await fetchTokenPrice(vault.inputToken.address as Address)
              const newTotalAssetsinToken = Number(newTotalAssets) === 0 ? 0 : Number(newTotalAssets) / tokenPrice;
              return {
                vaultId: vault.id,
                balance,
                totalAssets: newTotalAssets.toString(),
                totalAssetsinToken: newTotalAssetsinToken.toString(),
              };
            } catch (error) {
              console.error(`Error fetching user balance or total assets for vault ${vault.id}:`, error);
              return {
                vaultId: vault.id,
                balance: "0",
                totalAssets: "0",
                totalAssetsinToken: "0"
              };
            }
          })
        );

        const balances = balancesAndAssets.map(({ vaultId, balance }) => ({
          vaultId,
          balance,
        }));

        const totalAssets = balancesAndAssets.map(({ vaultId, totalAssets }) => ({
          vaultId,
          totalAssets,
        }));

        const totalAssetsinToken = balancesAndAssets.map(({ vaultId, totalAssetsinToken }) => ({
          vaultId,
          totalAssetsinToken,
        }));
        setUserVaultBalances(balances); // Update user balances
        setVaultTotalAssets(totalAssets); // Update total assets
        setVaultTotalAssetsinToken(totalAssetsinToken); // Update total assetsinToken
      } catch (error) {
        console.error("Error updating vault balances and total assets:", error);
      }
    };

    if (activeAccount && vaults.length > 0) {
      updateVaultBalanceAndTotal();
    }
  }, [vaults, activeAccount, setUserVaultBalances, setVaultTotalAssets, transactionCompleted]);
};


export const useUpdateAPYs = (
  vaults: VaultData[],
  setVaultAPYs: (vaultAPYs: { vaultId: string, APY7d: number }[]) => void,
  setLoading: (loading: boolean) => void
) => {
  useEffect(() => {
    const updateAPYs = async () => {
      try {
        const updatedVaultAPYs = await Promise.all(
          vaults.map(async (vault) => {
            try {
              const contract = getContract({
                client,
                chain: base,
                address: vault.id,
              });

              const strategyAddress = await readContract({
                contract,
                method: "function strategyAddress() view returns (address)",
              });
              const strategyContract = getContract({
                client,
                chain: base,
                address: strategyAddress,
              });

              const receiptTokenAddress = await readContract({
                contract: strategyContract,
                method: "function receiptToken() view returns (address)",
              });

              let APY7d = 0;

              if (vault.protocol.name === "Aave") {
                const receiptTokenContract = getContract({
                  client,
                  chain: base,
                  address: receiptTokenAddress,
                });

                const poolAddress = await readContract({
                  contract: receiptTokenContract,
                  method: "function POOL() view returns (address)",
                });
                APY7d = await calculateAaveAPY(poolAddress as Address, vault.inputToken.address as Address);
              } else if (vault.protocol.name === "Compound") {
                APY7d = await calculateCompoundAPY(receiptTokenAddress as Address);
              }
              else {
                APY7d = await calculateMoonwellAPY(receiptTokenAddress as Address);
              }

              return { vaultId: vault.id, APY7d };
            } catch (error) {
              console.error(`Error fetching APY for vault ${vault.id}:`, error);
              return { vaultId: vault.id, APY7d: 0 };
            }
          })
        );

        setVaultAPYs(updatedVaultAPYs);
      } finally {
        setLoading(false);  // Stop the loading state after updating APYs
      }
    };

    // Trigger the function if vaults are available
    if (vaults.length > 0) {
      setLoading(true);  // Set loading state before fetching APYs
      updateAPYs();
    }
  }, []);
};