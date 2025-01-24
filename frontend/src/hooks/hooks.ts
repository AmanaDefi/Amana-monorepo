import { useEffect } from "react";
import { fetchUserVaultBalance, fetchUserVaultMaxWithdraw, fetchTotalAssets, calculateAaveAPY, calculateMoonwellAPY, calculateCompoundAPY, calculateEddyAPY, calculateAaveRewardsAPY } from "../actions/actions";
import { Address } from "thirdweb";
import { VaultData } from "../types/types";
import { Account } from "thirdweb/wallets";
import { getContract, readContract, defineChain } from "thirdweb";
import { client } from "../utils/client";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";

export const useUpdateVaultBalanceAndTotal = (
  vaults: VaultData[],
  activeAccount: Account,
  setUserVaultBalances: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  setVaultTotalAssets: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  setVaultTotalAssetsinToken: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
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

              // const newTotalAssetsinToken = Number(newTotalAssets) === 0 ? 0 : Number(newTotalAssets) / vault.inputToken.price;
              const newTotalAssetsinToken = await fetchUserVaultMaxWithdraw(
                vault.inputToken.decimals,
                activeAccount?.address as Address,
                vault.id as Address
              );

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
                balance: "Error",
                totalAssets: "Error",
                totalAssetsinToken: "Error"
              };
            }
          })
        );
        console.log("balancedata", balancesAndAssets)
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
  }, [vaults, activeAccount, setUserVaultBalances, setVaultTotalAssets]);
};

export const useUpdateVaultBalanceAndTotalPerVault = (
  vault: any,
  activeAccount: Account,
  setUserVaultBalance: React.Dispatch<React.SetStateAction<any>>, // Accepts state setter
  setVaultTotalAsset: React.Dispatch<React.SetStateAction<any>>, // Accepts state setter
  setVaultTotalAssetinToken: React.Dispatch<React.SetStateAction<any>>, // Accepts state setter
  transactionCompleted: boolean,
) => {
  useEffect(() => {
    const updateVaultBalanceAndTotal = async () => {
      try {
        if (vault?.id) {
          const balance = await fetchUserVaultBalance(
            activeAccount?.address as Address,
            vault.id as Address
          );

          console.log("88888888888888", balance)

          const newTotalAssetsinToken = await fetchUserVaultMaxWithdraw(
            vault.inputToken.decimals,
            activeAccount?.address as Address,
            vault?.id as Address
          );
          console.log("888888888888881", newTotalAssetsinToken)

          setUserVaultBalance(balance);

          const newTotalAssets = await fetchTotalAssets(vault.id as Address);
          setVaultTotalAsset(newTotalAssets);

          setVaultTotalAssetinToken(newTotalAssetsinToken);

        }

      } catch (error) {
        console.log("888888888888882", error)

        console.error("Error updating vault balances and total assets:", error);
      }
    };
    if (activeAccount) {
      updateVaultBalanceAndTotal();
    }
  }, [vault, activeAccount, setUserVaultBalance, setVaultTotalAsset, transactionCompleted]);
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
              const strategyChain = defineChain(vault.protocol.chainId); // ToDo rather grab this from supported chains?
              const strategyContract = getContract({
                client,
                chain: strategyChain,
                address: vault.protocol.strategyAddress,
              });

              const receiptTokenAddress = await readContract({
                contract: strategyContract,
                method: "function receiptToken() view returns (address)",
              });

              let APY7d = 0;

              if (vault.protocol.name === "Aave") {
                APY7d = await calculateAaveAPY(receiptTokenAddress as Address, strategyChain);
                await calculateAaveRewardsAPY(receiptTokenAddress as Address, strategyChain);
              } else if (vault.protocol.name === "Compound") {
                APY7d = await calculateCompoundAPY(receiptTokenAddress as Address, strategyChain);
              }
              else if (vault.protocol.name === "Moonwell" || vault.protocol.name === "Euler") {
                APY7d = await calculateMoonwellAPY(receiptTokenAddress as Address, strategyChain);
              } else if (vault.protocol.name === "Eddy") {
                APY7d = await calculateEddyAPY(receiptTokenAddress as Address, strategyChain)
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
