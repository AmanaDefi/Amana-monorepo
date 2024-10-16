import { useEffect } from "react";
import { fetchUserVaultBalance, fetchTotalAssets, calculateAaveAPY, calculateMoonwellAPY, calculateCompoundAPY } from "../actions/actions";
import { Address } from "thirdweb";
import { VaultData } from "../types/types";
import { Account } from "thirdweb/wallets";
import { getContract, readContract } from "thirdweb";
import { client } from "../utils/client";
import { baseSepolia } from "thirdweb/chains";

export const useUpdateVaultBalanceAndTotal = (
  vaults: VaultData[],
  activeAccount: Account,
  setUserVaultBalances: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  setVaultTotalAssets: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
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
              return {
                vaultId: vault.id,
                balance,
                totalAssets: newTotalAssets.toString(),
              };
            } catch (error) {
              console.error(`Error fetching user balance or total assets for vault ${vault.id}:`, error);
              return {
                vaultId: vault.id,
                balance: "Error",
                totalAssets: "Error",
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

        setUserVaultBalances(balances); // Update user balances
        setVaultTotalAssets(totalAssets); // Update total assets
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
              console.log("vault", vault.id);
              const contract = getContract({
                client,
                chain: baseSepolia,
                address: vault.id,
              });
              console.log("contract", contract);
              const strategyAddress = await readContract({
                contract,
                method: "function getStrategy() view returns (address)",
              });
              console.log("strategyAddress", strategyAddress);
              const strategyContract = getContract({
                client,
                chain: baseSepolia,
                address: strategyAddress,
              });

              const receiptTokenAddress = await readContract({
                contract: strategyContract,
                method: "function receiptToken() view returns (address)",
              });

              let APY7d = 0;

              if (vault.protocol.name === "Aave") {
                console.log("receiptTokenAddress", receiptTokenAddress);
                const receiptTokenContract = getContract({
                  client,
                  chain: baseSepolia,
                  address: receiptTokenAddress,
                });
                console.log("receiptTokenContract", receiptTokenContract);
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