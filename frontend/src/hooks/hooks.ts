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
  calculateCombinedBalancerAPY,
  fetchAegisAPR

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
  setUserVaultBalances: React.Dispatch<React.SetStateAction<any[]>>,
  setVaultTotalAssets: React.Dispatch<React.SetStateAction<any[]>>,
  setVaultTotalAssetsinToken: React.Dispatch<React.SetStateAction<any[]>>,
) => {
  useEffect(() => {
    const updateVaultBalanceAndTotal = async () => {
      let address = isSolanaAddress(walletAddress) ? getSolanaEVMAddress(walletAddress!) : walletAddress

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
        setUserVaultBalances(balances);
        setVaultTotalAssets(totalAssets);
        setVaultTotalAssetsinToken(totalAssetsinToken);
      } catch (error) {
        // Error handling
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
  setUserVaultBalance: React.Dispatch<React.SetStateAction<any>>,
  setVaultTotalAsset: React.Dispatch<React.SetStateAction<any>>,
  setVaultTotalAssetinToken: React.Dispatch<React.SetStateAction<any>>,
  transactionCompleted: boolean,
) => {
  const { selectedChain } = useMultiChain();

  const lastKnownBalanceRef = useRef<string>('0');
  const backgroundRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshAttemptsRef = useRef<number>(0);
  const MAX_REFRESH_ATTEMPTS = 12; // 12 attempts * 10 seconds = 2 minutes of background checking

  const updateVaultBalanceAndTotal = useCallback(async () => {
    const address = isSolanaAddress(userAddress) ? getSolanaEVMAddress(userAddress!) : userAddress;

    try {
      if (vault && vault.id) {
        const balance = await fetchUserVaultBalance(
          address as Address,
          vault.id as Address
        );

        if (balance !== lastKnownBalanceRef.current) {
          if (backgroundRefreshIntervalRef.current) {
            clearInterval(backgroundRefreshIntervalRef.current);
            backgroundRefreshIntervalRef.current = null;
            refreshAttemptsRef.current = 0;
          }
        }

        lastKnownBalanceRef.current = balance;
        setUserVaultBalance(balance);

        const newTotalAssetsinToken = await fetchUserVaultMaxWithdraw(
          vault.inputToken.decimals,
          address as Address,
          vault?.id as Address
        );

        const newTotalAssets = await fetchTotalAssets(vault.id as Address);

        setVaultTotalAsset(newTotalAssets);
        setVaultTotalAssetinToken(newTotalAssetsinToken);

        return balance;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }, [vault, userAddress]);

  useEffect(() => {
    if (userAddress && vault) {
      updateVaultBalanceAndTotal();

      if (transactionCompleted && !backgroundRefreshIntervalRef.current) {
        refreshAttemptsRef.current = 0;
        backgroundRefreshIntervalRef.current = setInterval(async () => {
          refreshAttemptsRef.current++;

          await updateVaultBalanceAndTotal();

          // Stop after max attempts
          if (refreshAttemptsRef.current >= MAX_REFRESH_ATTEMPTS) {
            if (backgroundRefreshIntervalRef.current) {
              clearInterval(backgroundRefreshIntervalRef.current);
              backgroundRefreshIntervalRef.current = null;
              refreshAttemptsRef.current = 0;
            }
          }
        }, 10000);
      }
    }

    return () => {
      if (backgroundRefreshIntervalRef.current) {
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
              } else if (vault.protocol.name === "Aegis") {
                APY7d = await fetchAegisAPR();
              } else if (vault.protocol.name === "Compound") {
                APY7d = await calculateCompoundAPY(receiptTokenAddress as Address, strategyChain);
                RewardsAPY = await calculateCompoundRewardsAPY(vault.protocol.rewardsContractAddress as Address, receiptTokenAddress as Address, strategyChain, 51);
                APY7d = APY7d + RewardsAPY;
              } else if (vault.protocol.name === "Moonwell" || vault.protocol.name === "Euler" || vault.protocol.name === "Fluid") {
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
                if (crvTokenPrice > 0 && ethTokenPrice > 0) {
                  if (strategyChain.id === 1) {
                    RewardsAPY = await calculateConvexEthereumRewardsAPY(receiptTokenAddress as Address, vault.inputToken as Token, vault.protocol.rewardsContractAddress as Address, strategyChain, crvTokenPrice, cvxTokenPrice, ethTokenPrice);
                  } else if (strategyChain.id === 42161) {
                    RewardsAPY = await calculateConvexArbitrumRewardsAPY(receiptTokenAddress as Address, vault.inputToken as Token, vault.protocol.rewardsContractAddress as Address, strategyChain, crvTokenPrice, ethTokenPrice);
                  }
                }
                APY7d = RewardsAPY;
              }

              return { vaultId: vault.id, APY7d };
            } catch (error) {
              return { vaultId: vault.id, APY7d: 0 };
            }
          })
        );

        setVaultAPYs(updatedVaultAPYs);
      } finally {
        setLoading(false);
      }
    };

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

    const normalizedSymbol = symbol.includes('(') ?
      symbol.replace(/\s*\((.*?)\)\s*/, '.$1') : symbol;

    const fullSymbolPrice = priceContext.prices?.[normalizedSymbol.toUpperCase()];
    if (fullSymbolPrice !== undefined) {
      return fullSymbolPrice;
    }

    const baseSymbol = symbol.includes('(') ?
      symbol.split(' (')[0].toUpperCase() :
      getOnlyTokenSymbol(symbol).toUpperCase();

    if (baseSymbol === "USDC" || baseSymbol === "USDT") {
      return 1;
    }

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

