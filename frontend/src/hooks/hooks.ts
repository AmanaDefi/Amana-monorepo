import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateAaveAPY,
  calculateCompoundAPY,
  calculateMoonwellAPY,
  calculateVenusAPY,
  calculateVenusRewardsAPY,
  calculateEddyAPY,
  calculateBeefyAPY,
  fetchTotalAssets,
  fetchUserVaultBalance,
  fetchUserVaultMaxRedeem,
  fetchUserVaultMaxWithdraw,
  calculateConvexEthereumRewardsAPY,
  calculateCompoundRewardsAPY,
  calculateConvexArbitrumRewardsAPY,
  calculateCombinedBalancerAPY,
  fetchReceiptTokens,
} from "@/actions/actions";

import {
  DEFAULT_SETTINGS,
  UserSettings,
  VaultData,
  Token,
} from "@/types/types";
import {
  CHAIN_ID,
  MULTICALL_ADDRS,
  SUPPORTED_CHAINS,
} from "@/constants/chainConfig";
import {
  getOnlyTokenSymbol,
  getSolanaEVMAddress,
  isSolanaAddress,
  isZetachain,
} from "@/utils/utils";
import { useTokenPrices } from "@/providers/TokenPriceProvider";
import { ONE_MINUTE, USER_SETTINGS_LOCAL_STORAGE_KEY } from "@/constants";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { ethers, Interface } from "ethers";
import multicall3Abi from "../../abis/multicall3ABI.json";
import vaultAbi from "../../abis/moonwellVaultABI.json";
import { apiService } from "@/service";
import { zetaProvider } from "@/utils/providers";
import { Address, zeroAddress } from "viem";
import { useChain } from "@account-kit/react";
import { useUserSettingsStore } from "@/store/userSettingsStore";


type CashedVaultData = {
  vaultId: string;
  balance: string;
  totalAssets: any;
  totalAssetsinToken: string;
}[];

export const UPDATE_VAULT_TIMESTAMP = "updateCashTimestamp";
export const HAS_CHANGE_DEPOSIT = "has_deposited";
const CASHED_VAULT_ASSETS_DATA = "cashedVaultAssetsData";
const CASHED_VAULT_APIS = "cashedVaultApis";
const CASH_VAULT_INTERVAL_IN_MIN = 0.5;

export const useUpdateVaultBalanceAndTotal = (
  vaults: VaultData[],
  walletAddress: string | null,
  setUserVaultBalances: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  setVaultTotalAssets: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  setVaultTotalAssetsinToken: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter,
) => {
  const provider = zetaProvider;
  const mcInterface = useMemo(() => new Interface(multicall3Abi), []);
  const vaultInterface = useMemo(() => new Interface(vaultAbi), []);

  const update = useCallback(async () => {
    try {
      const now = Date.now();
      const timestamp = localStorage.getItem(UPDATE_VAULT_TIMESTAMP);
      const hasDeposited = localStorage.getItem(HAS_CHANGE_DEPOSIT);
      if (
        timestamp &&
        now - Number(timestamp) < CASH_VAULT_INTERVAL_IN_MIN * ONE_MINUTE &&
        hasDeposited !== "true"
      ) {
        const cashedVaultData = localStorage.getItem(CASHED_VAULT_ASSETS_DATA);
        if (cashedVaultData) {
          const parsedVaultData: CashedVaultData = JSON.parse(cashedVaultData);
          setUserVaultBalances(
            parsedVaultData.map(({ vaultId, balance }) => ({
              vaultId,
              balance,
            })),
          );
          setVaultTotalAssets(
            parsedVaultData.map(({ vaultId, totalAssets }) => ({
              vaultId,
              totalAssets,
            })),
          );
          setVaultTotalAssetsinToken(
            parsedVaultData.map(({ vaultId, totalAssetsinToken }) => ({
              vaultId,
              totalAssetsinToken,
            })),
          );
        }
        return; //Update only if interval > 2 min or if user has deposited in Pool
      }

      if (!provider || vaults.length === 0) return;
      let address = isSolanaAddress(walletAddress)
        ? "0x77706672467938396e78347A4B734c5066653142"
        : walletAddress || zeroAddress;

      const mcCfg = MULTICALL_ADDRS[CHAIN_ID.zetachain];

      // 1. First multicall: fetch shares and token decimals
      const balanceCalls = vaults.flatMap((vault) => [
        {
          target: vault.id,
          allowFailure: true,
          callData: new Interface(vaultAbi).encodeFunctionData("balanceOf", [
            address,
          ]),
        },
        {
          target: vault.id,
          allowFailure: true,
          callData: new Interface(vaultAbi).encodeFunctionData("decimals", []),
        },
      ]);
      const balanceData = await provider.call({
        to: mcCfg.address,
        data: mcInterface.encodeFunctionData("aggregate3", [balanceCalls]),
      });
      const [balanceResults] = mcInterface.decodeFunctionResult(
        "aggregate3",
        balanceData,
      ) as any;
      // parse shares and decimals
      const sharesArray = [] as BigInt[];
      const decimalsArray = [] as number[];
      for (let i = 0; i < vaults.length; i++) {
        const shareRes = balanceResults[2 * i];
        const decRes = balanceResults[2 * i + 1];
        const shares = shareRes.success ? BigInt(shareRes.returnData) : 0n;
        const dec = decRes.success
          ? Number(BigInt(decRes.returnData))
          : vaults[i].inputToken.decimals;
        sharesArray.push(shares);
        decimalsArray.push(dec);
      }

      // 2. Second multicall: fetch converted assets, maxRedeem and totalAssets
      const assetCalls = vaults.flatMap((vault, idx) => [
        {
          target: vault.id,
          allowFailure: true,
          callData: vaultInterface.encodeFunctionData("convertToAssets", [
            sharesArray[idx],
          ]),
        },
        {
          target: vault.id,
          allowFailure: true,
          callData: vaultInterface.encodeFunctionData("maxRedeem", [address]),
        },
      ]);
      const assetData = await provider.call({
        to: mcCfg.address,
        data: mcInterface.encodeFunctionData("aggregate3", [assetCalls]),
      });
      const [assetResults] = mcInterface.decodeFunctionResult(
        "aggregate3",
        assetData,
      ) as any;

      // 3) fetch totalAssets from backend
      const vaultDataMap = await apiService.api.getAllVaultDataCached(
        vaults.map((vault) => vault.id),
      );

      // assemble results
      const balancesAndAssets = vaults.map((vault, i) => {
        const dec = decimalsArray[i];
        const balAssets = assetResults[2 * i].success
          ? BigInt(assetResults[2 * i].returnData)
          : 0n;
        const maxRed = assetResults[2 * i + 1].success
          ? BigInt(assetResults[2 * i + 1].returnData)
          : 0n;
        const totalAssetsStr =
          vaultDataMap[vault.id].total_assets?.toString() ?? "Error";

        return {
          vaultId: vault.id,
          balance: ethers.formatUnits(balAssets, dec),
          totalAssets: totalAssetsStr,
          totalAssetsinToken: ethers.formatUnits(maxRed, dec),
        };
      });

      setUserVaultBalances(
        balancesAndAssets.map(({ vaultId, balance }) => ({ vaultId, balance })),
      );
      setVaultTotalAssets(
        balancesAndAssets.map(({ vaultId, totalAssets }) => ({
          vaultId,
          totalAssets,
        })),
      );
      setVaultTotalAssetsinToken(
        balancesAndAssets.map(({ vaultId, totalAssetsinToken }) => ({
          vaultId,
          totalAssetsinToken,
        })),
      );
      localStorage.setItem(
        CASHED_VAULT_ASSETS_DATA,
        JSON.stringify(balancesAndAssets),
      );
      localStorage.setItem(UPDATE_VAULT_TIMESTAMP, now.toString());
      localStorage.setItem(HAS_CHANGE_DEPOSIT, "false");
    } finally {
    }
  }, [
    provider,
    vaults,
    walletAddress,
    mcInterface,
    setUserVaultBalances,
    setVaultTotalAssets,
    setVaultTotalAssetsinToken,
    vaultInterface,
  ]);
  useEffect(() => {
    update();
  }, [update]);
};

export const useUpdateVaultBalanceAndTotalPerVault = (
  vault: any,
  userAddress: string | null,
  setUserVaultBalance: React.Dispatch<React.SetStateAction<any>>, // Accepts state setter
  setVaultTotalAsset: React.Dispatch<React.SetStateAction<any>>, // Accepts state setter
  setVaultTotalAssetinToken: React.Dispatch<React.SetStateAction<any>>, // Accepts state setter
  transactionCompleted: boolean,
) => {
  const { selectedChain } = useMultiChain();
  
  // Add a ref to track the last known balance
  const lastKnownBalanceRef = useRef<string>('0');
  const backgroundRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshAttemptsRef = useRef<number>(0);
  const MAX_REFRESH_ATTEMPTS = 12; // 12 attempts * 10 seconds = 2 minutes of background checking
  
  const updateVaultBalanceAndTotal = useCallback(async () => {
    const address = isSolanaAddress(userAddress) ? getSolanaEVMAddress(userAddress!) : userAddress;
    
    console.log('💰 [VAULT-BALANCE-HOOK] Starting balance update...', {
      vault: vault?.symbol,
      vaultId: vault?.id,
      userAddress,
      convertedAddress: address,
      transactionCompleted,
      timestamp: new Date().toISOString()
    });
    
    // 🧪 DEBUG: Address mapping in second hook
    console.log("=== SECOND HOOK DEBUG ===");
    console.log(`Original userAddress: ${userAddress}`);
    console.log(`Is Solana address? ${isSolanaAddress(userAddress)}`);
    console.log(`Final address: ${address}`);
    console.log("========================");
    
    console.log("Updating vault balances and total assets for address:", address);
    try {
      if (vault && vault.id) {
        console.log('📊 [VAULT-BALANCE-HOOK] Fetching user vault balance...', {
          address,
          vaultId: vault.id,
          timestamp: new Date().toISOString()
        });
        
        const balance = await fetchUserVaultBalance(
          address!,
          vault.id,
          vault.inputToken.decimals,
        );

        console.log('🔢 [VAULT-BALANCE-HOOK] Balance fetched:', {
          balance,
          typeof: typeof balance,
          lastKnownBalance: lastKnownBalanceRef.current,
          hasChanged: balance !== lastKnownBalanceRef.current,
          timestamp: new Date().toISOString()
        });

        const newTotalAssetsinToken = await fetchUserVaultMaxWithdraw(
          vault.inputToken.decimals,
          address as Address,
          vault?.id as Address
        );

        console.log('💸 [VAULT-BALANCE-HOOK] Max withdraw fetched:', {
          newTotalAssetsinToken,
          typeof: typeof newTotalAssetsinToken,
          timestamp: new Date().toISOString()
        });

        // 🧪 TESTING: Compare old vs new approach
        console.log("=== MAXWITHDRAW TESTING ===");
        try {
          const oldMaxRedeem = await fetchUserVaultMaxRedeem(
            vault.inputToken.decimals,
            address as Address,
            vault?.id as Address,
          );
          console.log(`📊 Vault: ${vault.symbol}`);
          console.log(`👤 User: ${address}`);
          console.log(`🔄 OLD maxRedeem (shares): ${oldMaxRedeem}`);
          console.log(`🆕 NEW maxWithdraw (assets): ${newTotalAssetsinToken}`);
          console.log(`💰 Underlying token: ${vault.inputToken.symbol}`);
          console.log(`🏦 Vault token: ${vault.symbol}`);
          console.log("============================");
        } catch (e) {
          console.log("Error comparing old vs new:", e);
        }

        console.log('🔄 [VAULT-BALANCE-HOOK] Setting user vault balance state...', {
          balance,
          timestamp: new Date().toISOString()
        });
        
        // Check if balance has changed
        if (balance !== lastKnownBalanceRef.current) {
          console.log('🎉 [VAULT-BALANCE-HOOK] Balance has changed! Stopping background refresh...', {
            oldBalance: lastKnownBalanceRef.current,
            newBalance: balance,
            timestamp: new Date().toISOString()
          });
          
          // Clear background refresh since balance has updated
          if (backgroundRefreshIntervalRef.current) {
            clearInterval(backgroundRefreshIntervalRef.current);
            backgroundRefreshIntervalRef.current = null;
            refreshAttemptsRef.current = 0;
          }
        }
        
        // Update the last known balance
        lastKnownBalanceRef.current = balance!;
        setUserVaultBalance(balance);

        const newTotalAssets = await fetchTotalAssets(vault.id as Address);
        console.log('📈 [VAULT-BALANCE-HOOK] Total assets fetched:', {
          newTotalAssets,
          timestamp: new Date().toISOString()
        });
        
        setVaultTotalAsset(newTotalAssets);
        setVaultTotalAssetinToken(newTotalAssetsinToken);
        
        console.log('✅ [VAULT-BALANCE-HOOK] All balances updated successfully!', {
          vault: vault.symbol,
          balance,
          newTotalAssets,
          newTotalAssetsinToken,
          timestamp: new Date().toISOString()
        });
        
        return balance; // Return balance for comparison
      } else {
        console.log('⚠️ [VAULT-BALANCE-HOOK] Vault or vault ID is missing', {
          vault: vault ? 'exists' : 'null',
          vaultId: vault?.id,
          timestamp: new Date().toISOString()
        });
        return null;
      }
    } catch (error) {
      console.error('❌ [VAULT-BALANCE-HOOK] Error updating vault balances and total assets:', {
        error,
        vault: vault?.symbol,
        address,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }, [vault, userAddress]);
  
  useEffect(() => {
    console.log('🔄 [VAULT-BALANCE-HOOK] Effect triggered with dependencies:', {
      vault: vault?.id,
      userAddress,
      transactionCompleted,
      timestamp: new Date().toISOString()
    });
    
    if (userAddress && vault) {
      console.log('✅ [VAULT-BALANCE-HOOK] Prerequisites met, calling updateVaultBalanceAndTotal', {
        userAddress: !!userAddress,
        vault: !!vault,
        timestamp: new Date().toISOString()
      });
      updateVaultBalanceAndTotal();
      
      // 🔄 NEW: Start background refresh when transaction completes
      if (transactionCompleted && !backgroundRefreshIntervalRef.current) {
        console.log('🔄 [BACKGROUND-REFRESH] Starting background balance refresh...', {
          vault: vault.symbol,
          maxAttempts: MAX_REFRESH_ATTEMPTS,
          timestamp: new Date().toISOString()
        });
        
        refreshAttemptsRef.current = 0;
        backgroundRefreshIntervalRef.current = setInterval(async () => {
          refreshAttemptsRef.current++;
          console.log(`🔄 [BACKGROUND-REFRESH] Attempt ${refreshAttemptsRef.current}/${MAX_REFRESH_ATTEMPTS}`, {
            vault: vault.symbol,
            timestamp: new Date().toISOString()
          });
          
          await updateVaultBalanceAndTotal();
          
          // Stop after max attempts
          if (refreshAttemptsRef.current >= MAX_REFRESH_ATTEMPTS) {
            console.log('⏹️ [BACKGROUND-REFRESH] Max attempts reached, stopping background refresh', {
              vault: vault.symbol,
              attempts: refreshAttemptsRef.current,
              timestamp: new Date().toISOString()
            });
            
            if (backgroundRefreshIntervalRef.current) {
              clearInterval(backgroundRefreshIntervalRef.current);
              backgroundRefreshIntervalRef.current = null;
              refreshAttemptsRef.current = 0;
            }
          }
        }, 10000); // Check every 10 seconds
      }
    } else {
      console.log('❌ [VAULT-BALANCE-HOOK] Prerequisites not met', {
        userAddress: !!userAddress,
        vault: !!vault,
        timestamp: new Date().toISOString()
      });
    }
    
    // Cleanup interval on unmount or dependency change
    return () => {
      if (backgroundRefreshIntervalRef.current) {
        console.log('🧹 [BACKGROUND-REFRESH] Cleaning up background refresh interval', {
          timestamp: new Date().toISOString()
        });
        clearInterval(backgroundRefreshIntervalRef.current);
        backgroundRefreshIntervalRef.current = null;
        refreshAttemptsRef.current = 0;
      }
    };

  }, [vault, userAddress, setUserVaultBalance, setVaultTotalAsset, transactionCompleted, setVaultTotalAssetinToken, updateVaultBalanceAndTotal]);
};

export const useUpdateAPYs = (
  vaults: VaultData[] | null,
  setVaultAPYs: (vaultAPYs: { vaultId: string; APY7d: number }[]) => void,
  setLoading: (loading: boolean) => void,
  crvTokenPrice: number,
  cvxTokenPrice: number,
  ethTokenPrice: number,
  compTokenPrice: number,
  opTokenPrice: number,
  isFromVaultGrid?: boolean,
) => {
  useEffect(() => {
    const updateAPYs = async () => {
      if (!vaults) return;

      const now = Date.now();
      try {
        const receiptTokenAddresses = await fetchReceiptTokens(vaults);
        const updatedVaultAPYs = await Promise.all(
          vaults.map(async (vault) => {
            try {
              const strategyChain = SUPPORTED_CHAINS.find((c) => c.chain.id === vault.protocol.chainId)?.chain;
              if (!strategyChain) {
                return { vaultId: vault.id, APY7d: 0 };
              }
              const receiptTokenAddress = receiptTokenAddresses[vault.id];
              let APY7d = 0;
              let RewardsAPY = 0;
              if (vault.protocol.name === "Aave") {
                APY7d = await calculateAaveAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "ZeroLend") {
                APY7d = await calculateAaveAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "Compound") {
                APY7d = await calculateCompoundAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
                RewardsAPY = await calculateCompoundRewardsAPY(
                  vault.protocol.rewardsContractAddress as Address,
                  receiptTokenAddress as Address,
                  strategyChain,
                  51,
                );
                APY7d = APY7d + RewardsAPY;
              } else if (
                vault.protocol.name === "Moonwell" ||
                vault.protocol.name === "Euler" ||
                vault.protocol.name === "Fluid"
              ) {
                // TO DO This only works for Base right now - it's hardcoded

                APY7d = await calculateMoonwellAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "Venus") {
                APY7d = await calculateVenusAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
                RewardsAPY = await calculateVenusRewardsAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
                APY7d = APY7d + RewardsAPY;
              } else if (vault.protocol.name === "Eddy") {
                APY7d = await calculateEddyAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
                APY7d = await calculateEddyAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "Balancer") {
                const { totalAPY } = await calculateCombinedBalancerAPY({
                  receiptTokenAddress: receiptTokenAddress as Address,
                  liquidityGaugeAddress: vault.protocol
                    .rewardsContractAddress as Address,
                  rewardTokenAddress:
                    "0x994ac01750047B9d35431a7Ae4Ed312ee955E030",
                  inputTokenAddress:
                    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                  opTokenPrice,
                  strategyChain,
                });
                APY7d = totalAPY;
              } else if (vault.protocol.name === "Beefy") {
                APY7d = await calculateBeefyAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "Curve-Convex") {
                if (crvTokenPrice > 0 && ethTokenPrice > 0) {
                  if (strategyChain.id === 1) {
                    RewardsAPY = await calculateConvexEthereumRewardsAPY(
                      receiptTokenAddress as Address,
                      vault.inputToken as Token,
                      vault.protocol.rewardsContractAddress as Address,
                      strategyChain,
                      crvTokenPrice,
                      cvxTokenPrice,
                      ethTokenPrice,
                    );
                  } else if (strategyChain.id === 42161) {
                    RewardsAPY = await calculateConvexArbitrumRewardsAPY(
                      receiptTokenAddress as Address,
                      vault.inputToken as Token,
                      vault.protocol.rewardsContractAddress as Address,
                      strategyChain,
                      crvTokenPrice,
                      ethTokenPrice,
                    );
                  }
                } else {
                  console.warn(
                    "Skipping Curve rewards APY due to missing token prices",
                    { crvTokenPrice, ethTokenPrice },
                  );
                }
                APY7d = RewardsAPY;
              }

              return {
                vaultId: vault.id,
                APY7d,
                apy30d: [-2.5, 0.25, 0.5, 0.75, 2.1][
                  Math.floor(Math.random() * 5)
                ], //mocked
              };
            } catch (error) {
              console.error(`Error fetching APY for vault ${vault.id}:`, error);
              return { vaultId: vault.id, APY7d: 0 };
            }
          }),
        );
        setVaultAPYs(updatedVaultAPYs);
        if (isFromVaultGrid) {
          localStorage.setItem(
            CASHED_VAULT_APIS,
            JSON.stringify(updatedVaultAPYs),
          );
          localStorage.setItem(UPDATE_VAULT_TIMESTAMP, now.toString());
          localStorage.setItem(HAS_CHANGE_DEPOSIT, "false");
        }
      } finally {
        setLoading(false); // Stop the loading state after updating APYs
      }
    };

    // Trigger the function if vaults and prices are available
    if (
      vaults &&
      vaults.length > 0 &&
      crvTokenPrice > 0 &&
      cvxTokenPrice > 0 &&
      ethTokenPrice > 0 &&
      compTokenPrice > 0
    ) {
      const now = Date.now();
      const timestamp = localStorage.getItem(UPDATE_VAULT_TIMESTAMP);
      const hasDeposited = localStorage.getItem(HAS_CHANGE_DEPOSIT);

      if (
        timestamp &&
        now - Number(timestamp) < CASH_VAULT_INTERVAL_IN_MIN * ONE_MINUTE &&
        hasDeposited !== "true" &&
        isFromVaultGrid
      ) {
        const cashedVaultApis = localStorage.getItem(CASHED_VAULT_APIS);
        if (cashedVaultApis) {
          setVaultAPYs(JSON.parse(cashedVaultApis));
        }
        setLoading(false);
        return; //Update only if interval > 5 min or if user has deposited in Pool
      } else {
        setLoading(true);
        updateAPYs();
      }
    }
  }, [vaults, crvTokenPrice, ethTokenPrice, compTokenPrice, isFromVaultGrid, cvxTokenPrice, opTokenPrice, setLoading, setVaultAPYs]);
};

export function useTokenPriceBySymbol(symbol: string | undefined) {
  const priceContext = useTokenPrices();
  return useMemo(() => {
    if (!priceContext || !symbol) {
      return 0;
    }

    // Normalize the symbol format:
    // Convert "USDC (ETH)" to "USDC.ETH" format for price lookup
    const normalizedSymbol = symbol.includes("(")
      ? symbol.replace(/\s*\((.*?)\)\s*/, ".$1")
      : symbol;

    // Try to find price using normalized symbol first
    const fullSymbolPrice =
      priceContext.prices?.[normalizedSymbol.toUpperCase()];
    if (fullSymbolPrice !== undefined) {
      return fullSymbolPrice;
    }

    // If full symbol price not found, check if it's a stablecoin by checking the base symbol
    // For both formats: "USDC (ETH)" -> "USDC" and "USDC.ETH" -> "USDC"
    const baseSymbol = symbol.includes("(")
      ? symbol.split(" (")[0].toUpperCase()
      : getOnlyTokenSymbol(symbol).toUpperCase();

    if (baseSymbol === "USDC" || baseSymbol === "USDT") {
      return 1;
    }

    // Fallback to base symbol if full symbol price not found
    return priceContext.prices?.[baseSymbol] ?? 0;
  }, [priceContext, symbol]);
}

export function useUserSettings() {
  const [userSettings, setUserSettings] = useState<UserSettings>({
    slippage: DEFAULT_SETTINGS.slippage,
  });

  useEffect(() => {
    const saved = localStorage.getItem(USER_SETTINGS_LOCAL_STORAGE_KEY);
    if (saved) {
      setUserSettings(JSON.parse(saved));
    }
  }, []);

  const updateSettings = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => {
    const newSettings = { ...userSettings, [key]: value };
    localStorage.setItem(
      USER_SETTINGS_LOCAL_STORAGE_KEY,
      JSON.stringify(newSettings),
    );
    setUserSettings(newSettings);
  };

  return { userSettings, updateSettings };
}

export const useSlippage = () => {
  const { slippage, setSlippage, toggleAuto } = useUserSettingsStore();
  return {
    slippageValue: slippage.value,
    isAuto: slippage.isAuto,
    setSlippage,
    toggleAuto,
  };
}