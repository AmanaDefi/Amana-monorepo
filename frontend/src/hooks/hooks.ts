import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateAaveAPY,
  calculateCompoundAPY,
  calculateMoonwellAPY,
  fetchTotalAssets,
  fetchUserVaultBalance,
  fetchUserVaultMaxWithdraw
} from "@/actions/actions";
import { Address, defineChain, getContract, prepareEvent, readContract } from "thirdweb";
import { UserSettings, VaultData } from "@/types/types";
import { Account } from "thirdweb/wallets";
import { client } from "@/utils/client";
import { SUPPORTED_CHAINS } from "@/constants/chainConfig";
import { useContractEvents } from "thirdweb/react";
import { isZetachain } from "@/utils/utils";
import { useTokenPrices } from "@/providers/TokenPriceProvider";
import { USER_SETTINGS_LOCAL_STORAGE_KEY } from "@/constants";

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
  }, [vault, activeAccount, setUserVaultBalance, setVaultTotalAsset, transactionCompleted, setVaultTotalAssetinToken]);
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
              } else if (vault.protocol.name === "Compound") {
                APY7d = await calculateCompoundAPY(receiptTokenAddress as Address, strategyChain);
              }
              else if (vault.protocol.name === "Moonwell" || vault.protocol.name === "Euler") {
                APY7d = await calculateMoonwellAPY(receiptTokenAddress as Address, strategyChain);
              }
              // else if (vault.protocol.name === "Eddy") {
              //   const receiptTokenContract = getContract({
              //     client,
              //     chain: strategyChain,
              //     address: receiptTokenAddress,
              //   });
              //   const poolAddress = await readContract({
              //     contract: receiptTokenContract,
              //     method: "function minter() view returns (address)",
              //   });
              //   APY7d = await calculateEddyAPY(poolAddress as Address, receiptTokenAddress as Address)
              // }

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

export const useInteractionEvents = ({ vaultData, activeChainId, strategyChainID, strategyAddress, contractWithdrawalReceiverAddress, isTransactionStarted }: { vaultData: VaultData, activeChainId: number, strategyChainID: number, strategyAddress: string, contractWithdrawalReceiverAddress: string, isTransactionStarted: boolean }) => {
  // events
  const events = useMemo(() => ({
    vault: [
      prepareEvent({ signature: "event CrossChainInvestSent(bytes32 indexed crossChainTxId)" }),
      prepareEvent({ signature: "event Deposited(address indexed user,uint256 amount,uint256 shares,bytes32 indexed crossChainTxId)" }),
      prepareEvent({ signature: "event Deposit(address indexed sender,address indexed owner,uint256 assets,uint256 shares)" }),
      prepareEvent({ signature: "event DivestSent(bytes32 indexed crossChainTxId)" }),
      prepareEvent({ signature: "event Withdraw(address indexed sender,address indexed receiver,address indexed owner,uint256 assets,uint256 shares)" }),
      prepareEvent({ signature: "event CrossChainInvestFailed(bytes32 indexed crossChainTxId)" }),
      prepareEvent({ signature: "event DivestFailed(bytes32 indexed crossChainTxId)" }),
      prepareEvent({ signature: "event ReturnFundsToUserSent(bytes32 indexed crossChainTxId)" }),
      prepareEvent({ signature: "event ReturnFundsToUserFailed(bytes32 indexed crossChainTxId)" })
    ],
    strategy: [
      prepareEvent({ signature: "event FundsInvested(bytes32 indexed crossChainTxId,address user,uint256 amount)" }),
      prepareEvent({ signature: "event FundsDivested(bytes32 indexed crossChainTxId,address user,uint256 amount)" }),
      prepareEvent({ signature: "event InvestConfirmFailed(bytes32 indexed crossChainTxId)" }),
      prepareEvent({ signature: "event ReturnFundsFromStrategyFailed(bytes32 indexed crossChainTxId)" })
    ],
    withdrawalReceiver: [
      prepareEvent({ signature: "event FundsReturned(address user,address asset,uint256 amount,bytes32 indexed crossChainTxId)" })
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
      chain: defineChain(activeChainId),
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
}

export function useTokenPriceBySymbol(symbol: string | undefined) {
  const priceContext = useTokenPrices();

  return useMemo(() => {
    if (!priceContext || !symbol) {
      return 0;
    }

    const tokenSymbol = symbol.split('.')[0].toUpperCase();
    return priceContext.prices?.[tokenSymbol] ?? 0;
  }, [priceContext, symbol]);
}

export function useUserSettings() {
  const [userSettings, setUserSettings] = useState<UserSettings>({
    slippage: { isAuto: true, value: 5 },
  });

  useEffect(() => {
    const saved = localStorage.getItem(USER_SETTINGS_LOCAL_STORAGE_KEY);
    if (saved) {
      setUserSettings(JSON.parse(saved));
    }
    window.addEventListener('storage', () => console.log("EXECUTED UPDATE STORAGEEEEE!!!"));
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
      value: 5
    });
  };

  return {
    slippageValue: useMemo(() => userSettings.slippage?.value, [userSettings.slippage?.value]),
    isAuto: useMemo(() => userSettings.slippage?.isAuto, [userSettings.slippage?.isAuto]),
    setSlippage,
    toggleAuto
  };
}
