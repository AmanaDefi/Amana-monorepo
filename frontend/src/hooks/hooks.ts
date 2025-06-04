import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  calculateAaveAPY,
  calculateAaveFlashAPY,
  calculateCompoundAPY,
  calculateMoonwellAPY,
  calculateVenusAPY,
  calculateVenusRewardsAPY,
  calculateEddyAPY,
  calculateBeefyAPY,
  calculateCurveAPY,
  fetchTotalAssets,
  fetchUserVaultBalance,
  fetchUserVaultMaxRedeem,
  fetchUserVaultMaxWithdraw,
  calculateConvexEthereumRewardsAPY,
  calculateCompoundRewardsAPY,
  calculateConvexArbitrumRewardsAPY,
  calculateCombinedBalancerAPY

} from "@/actions/actions";
import { Address, defineChain, getContract, prepareEvent, readContract } from "thirdweb";
import { DEFAULT_SETTINGS, UserSettings, VaultData, Token } from "@/types/types";
import { Account } from "thirdweb/wallets";
import { client } from "@/utils/client";
import { CHAIN_ID, SUPPORTED_CHAINS } from "@/constants/chainConfig";
import { useContractEvents } from "thirdweb/react";
import { getOnlyTokenSymbol, getSolanaEVMAddress, isSolanaAddress, isZetachain } from "@/utils/utils";
import { useTokenPrices } from "@/providers/TokenPriceProvider";
import { USER_SETTINGS_LOCAL_STORAGE_KEY } from "@/constants";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { EMPTY_BALANCE } from "@/utils/helpers";

export const useUpdateVaultBalanceAndTotal = (
  vaults: VaultData[],
  walletAddress: string | null,
  setUserVaultBalances: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  setVaultTotalAssets: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  setVaultTotalAssetsinToken: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
) => {
  useEffect(() => {
    const updateVaultBalanceAndTotal = async () => {
      // let address = isSolanaAddress(walletAddress) ? "0x5a55337a553557574C6E43506b48463373737669" : walletAddress
      let address = isSolanaAddress(walletAddress) ? getSolanaEVMAddress(walletAddress!) : walletAddress
      
      // 🧪 DEBUG: Log address conversion process
      console.log("=== ADDRESS CONVERSION DEBUG ===");
      console.log(`Original walletAddress: ${walletAddress}`);
      console.log(`Is Solana address? ${isSolanaAddress(walletAddress)}`);
      if (isSolanaAddress(walletAddress)) {
        console.log(`Converted EVM address: ${getSolanaEVMAddress(walletAddress!)}`);
      }
      console.log(`Final address used: ${address}`);
      console.log("================================");
      
      console.log("Updating vault balances and total assets for address:", address);
      try {
        const balancesAndAssets = await Promise.all(
          vaults.map(async (vault) => {
            try {
              let balance: any;
              let newTotalAssetsinToken: any;
              if (address && vault && vault.id) {
                balance = await fetchUserVaultBalance(
                  address as Address,
                  vault.id as Address
                )
                newTotalAssetsinToken = await fetchUserVaultMaxWithdraw(
                  vault.inputToken.decimals,
                  address as Address,
                  vault.id as Address
                );
              } else {
                balance = EMPTY_BALANCE
                newTotalAssetsinToken = "Error"
              }
              const newTotalAssets = vault && vault.id ? await fetchTotalAssets(vault.id as Address) : "Error";

              const totalAssetsStr = typeof newTotalAssets === 'string' ? newTotalAssets : String(newTotalAssets);
              const totalAssetsinTokenStr = typeof newTotalAssetsinToken === 'string' ? newTotalAssetsinToken : String(newTotalAssetsinToken);

              return {
                vaultId: vault?.id || "unknown",
                balance,
                totalAssets: totalAssetsStr,
                totalAssetsinToken: totalAssetsinTokenStr,
              };
            } catch (error) {
              console.error(`Error fetching user balance or total assets for vault ${vault?.id || "unknown"}:`, error);
              return {
                vaultId: vault?.id || "unknown",
                balance: "Error",
                totalAssets: "Error",
                totalAssetsinToken: "Error"
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

    if (vaults.length > 0) {
      updateVaultBalanceAndTotal();
    }
  }, [vaults, walletAddress, setUserVaultBalances, setVaultTotalAssets]);
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
          address as Address,
          vault.id as Address
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
            vault?.id as Address
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
        lastKnownBalanceRef.current = balance;
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
  vaults: VaultData[],
  setVaultAPYs: (vaultAPYs: { vaultId: string, APY7d: number }[]) => void,
  setLoading: (loading: boolean) => void,
  crvTokenPrice: number,
  cvxTokenPrice: number,
  ethTokenPrice: number,
  compTokenPrice: number,
  opTokenPrice: number
) => {
  useEffect(() => {
    const updateAPYs = async () => {
      try {
        const updatedVaultAPYs = await Promise.all(
          vaults.map(async (vault) => {
            try {
              const strategyChain = defineChain(vault.protocol.chainId);
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
              let RewardsAPY = 0;
              if (vault.protocol.name === "Aave") {
                APY7d = await calculateAaveAPY(receiptTokenAddress as Address, strategyChain);
              } else if (vault.protocol.name === "ZeroLend") {
                APY7d = await calculateAaveAPY(receiptTokenAddress as Address, strategyChain);
              } else if (vault.protocol.name === "Compound") {
                APY7d = await calculateCompoundAPY(receiptTokenAddress as Address, strategyChain);
                RewardsAPY = await calculateCompoundRewardsAPY(vault.protocol.rewardsContractAddress as Address, receiptTokenAddress as Address, strategyChain, 51);
                APY7d = APY7d + RewardsAPY;
              } else if (vault.protocol.name === "Moonwell" || vault.protocol.name === "Euler" || vault.protocol.name === "Fluid") {
                // TO DO This only works for Base right now - it's hardcoded

                APY7d = await calculateMoonwellAPY(receiptTokenAddress as Address, strategyChain);

              } else if (vault.protocol.name === "Venus") {
                APY7d = await calculateVenusAPY(receiptTokenAddress as Address, strategyChain);
                RewardsAPY = await calculateVenusRewardsAPY(receiptTokenAddress as Address, strategyChain);
                APY7d = APY7d + RewardsAPY;
              } else if (vault.protocol.name === "Eddy") {
                APY7d = await calculateEddyAPY(receiptTokenAddress as Address, strategyChain)
              } else if (vault.protocol.name === "Balancer") {
                const { totalAPY } = await calculateCombinedBalancerAPY({
                  receiptTokenAddress: receiptTokenAddress as Address,
                  liquidityGaugeAddress: vault.protocol.rewardsContractAddress as Address,
                  rewardTokenAddress: "0x994ac01750047B9d35431a7Ae4Ed312ee955E030",
                  inputTokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                  opTokenPrice,
                  strategyChain
                });
                APY7d = totalAPY;
              } else if (vault.protocol.name === "Beefy") {
                APY7d = await calculateBeefyAPY(receiptTokenAddress as Address, strategyChain);
              } else if (vault.protocol.name === "Curve-Convex") {
                // APY7d = await calculateCurveAPY(receiptTokenAddress as Address, strategyChain);
                if (crvTokenPrice > 0 && ethTokenPrice > 0) {
                  if (strategyChain.id === 1) {
                    RewardsAPY = await calculateConvexEthereumRewardsAPY(receiptTokenAddress as Address, vault.inputToken as Token, vault.protocol.rewardsContractAddress as Address, strategyChain, crvTokenPrice, cvxTokenPrice, ethTokenPrice);
                  } else if (strategyChain.id === 42161) {
                    RewardsAPY = await calculateConvexArbitrumRewardsAPY(receiptTokenAddress as Address, vault.inputToken as Token, vault.protocol.rewardsContractAddress as Address, strategyChain, crvTokenPrice, ethTokenPrice);
                  }
                } else {
                  console.warn("Skipping Curve rewards APY due to missing token prices", { crvTokenPrice, ethTokenPrice });
                }
                APY7d = RewardsAPY;
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

    // Trigger the function if vaults and prices are available
    if (
      vaults.length > 0
      &&
      crvTokenPrice > 0 &&
      cvxTokenPrice > 0
      &&
      ethTokenPrice > 0
      &&
      compTokenPrice > 0
    ) {
      setLoading(true);
      updateAPYs();
    }
  }, [vaults, crvTokenPrice, ethTokenPrice, compTokenPrice]);
};

export const useInteractionEvents = ({ vaultData, activeChainId, strategyChainID, strategyAddress, contractWithdrawalReceiverAddress, isTransactionStarted }: { vaultData: VaultData, activeChainId: number, strategyChainID: number, strategyAddress: string, contractWithdrawalReceiverAddress: string, isTransactionStarted: boolean }) => {
  // events
  const events = useMemo(() => ({
    vault: [
      prepareEvent({ signature: "event CrossChainInvestSent(bytes32 indexed crossChainTxId, address receiver, uint256 amount)" }),
      prepareEvent({ signature: "event Deposited(address indexed user,uint256 amount,uint256 shares,bytes32 indexed crossChainTxId)" }),
      prepareEvent({ signature: "event Deposit(address indexed sender,address indexed owner,uint256 assets,uint256 shares)" }),
      prepareEvent({ signature: "event DivestSent(bytes32 indexed crossChainTxId, address user, uint256 shares)" }),
      prepareEvent({ signature: "event Withdraw(address indexed sender,address indexed receiver,address indexed owner,uint256 assets,uint256 shares)" }),
      prepareEvent({ signature: "event CrossChainInvestFailed(bytes32 indexed crossChainTxId, address receiver, uint256 amount)" }),
      prepareEvent({ signature: "event DivestFailed(bytes32 indexed crossChainTxId, address user, uint256 shares)" }),
      prepareEvent({ signature: "event ReturnFundsToUserSent(bytes32 indexed crossChainTxId, address receiver, uint256 amount)" }),
      prepareEvent({ signature: "event ReturnFundsToUserFailed(bytes32 indexed crossChainTxId, address receiver, uint256 amount)" })
    ],
    strategy: [
      prepareEvent({ signature: "event FundsInvested(bytes32 indexed crossChainTxId,address user,uint256 amount)" }),
      prepareEvent({ signature: "event FundsDivested(bytes32 indexed crossChainTxId,address user,uint256 amount)" }),
      prepareEvent({ signature: "event InvestConfirmFailed(bytes32 indexed crossChainTxId)" }),
      prepareEvent({ signature: "event ReturnFundsFromStrategyFailed(bytes32 indexed crossChainTxId)" })
    ],
    withdrawalReceiver: [
      prepareEvent({ signature: "event FundsReturned(address user,address asset,uint256 amount,bytes32 indexed crossChainTxId)" }),
      prepareEvent({ signature: "event CrossChainDepositFailed(bytes32 indexed crossChainTxId)" }),
      prepareEvent({ signature: "event CrossChainWithdrawFailed(bytes32 indexed crossChainTxId)" })
    ]
  }), []);

  // contracts
  const contracts = useMemo(() => ({
    vault: getContract({
      client,
      chain: SUPPORTED_CHAINS[0],
      address: vaultData.id,
    }),
    strategy: getContract({
      client,
      chain: defineChain(strategyChainID),
      address: strategyAddress,
    }),
    withdrawalReceiver: getContract({
      client,
      chain: defineChain(!activeChainId || activeChainId == CHAIN_ID.solana ? strategyChainID : activeChainId),
      address: contractWithdrawalReceiverAddress
    })
  }), [vaultData.id, strategyChainID, strategyAddress, activeChainId, contractWithdrawalReceiverAddress]);

  // event listeners
  const { data: vaultEvents } = useContractEvents({
    contract: contracts.vault,
    events: events.vault,
    enabled: isTransactionStarted
  });
  const { data: strategyEvents } = useContractEvents({
    contract: contracts.strategy,
    events: events.strategy,
    enabled: isTransactionStarted
  });
  const { data: withdrawalReceiverEvents } = useContractEvents({
    contract: contracts.withdrawalReceiver,
    events: events.withdrawalReceiver,
    enabled: isTransactionStarted && !(isZetachain(strategyChainID) && isZetachain(activeChainId)),
  });

  return {
    vaultEvents,
    strategyEvents,
    withdrawalReceiverEvents
  }
};

export function useTokenPriceBySymbol(symbol: string | undefined) {
  const priceContext = useTokenPrices();
  return useMemo(() => {
    if (!priceContext || !symbol) {
      return 0;
    }

    // Normalize the symbol format:
    // Convert "USDC (ETH)" to "USDC.ETH" format for price lookup
    const normalizedSymbol = symbol.includes('(') ?
      symbol.replace(/\s*\((.*?)\)\s*/, '.$1') : symbol;

    // Try to find price using normalized symbol first
    const fullSymbolPrice = priceContext.prices?.[normalizedSymbol.toUpperCase()];
    if (fullSymbolPrice !== undefined) {
      return fullSymbolPrice;
    }

    // If full symbol price not found, check if it's a stablecoin by checking the base symbol
    // For both formats: "USDC (ETH)" -> "USDC" and "USDC.ETH" -> "USDC"
    const baseSymbol = symbol.includes('(') ?
      symbol.split(' (')[0].toUpperCase() :
      getOnlyTokenSymbol(symbol).toUpperCase();

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

  const updateSettings = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const newSettings = { ...userSettings, [key]: value };
    localStorage.setItem(USER_SETTINGS_LOCAL_STORAGE_KEY, JSON.stringify(newSettings));
    setUserSettings(newSettings);
  };

  return { userSettings, updateSettings }
}

export function useSlippage() {
  const { userSettings, updateSettings } = useUserSettings();

  const setSlippage = (value: number) => {
    updateSettings('slippage', {
      isAuto: false,
      value
    });
  };

  const toggleAuto = () => {
    updateSettings('slippage', {
      isAuto: !userSettings.slippage?.isAuto,
      value: DEFAULT_SETTINGS.slippage.value
    });
  };

  return {
    slippageValue: useMemo(() => userSettings.slippage?.value, [userSettings.slippage?.value]),
    isAuto: useMemo(() => userSettings.slippage?.isAuto, [userSettings.slippage?.isAuto]),
    setSlippage,
    toggleAuto
  };
}

