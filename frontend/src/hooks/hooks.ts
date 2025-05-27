import { useCallback, useEffect, useMemo, useState } from "react";
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
  calculateConvexEthereumRewardsAPY,
  calculateCompoundRewardsAPY,
  calculateConvexArbitrumRewardsAPY,
} from "@/actions/actions";
import {
  Address,
  defineChain,
  getContract,
  prepareEvent,
  readContract,
} from "thirdweb";
import {
  DEFAULT_SETTINGS,
  UserSettings,
  VaultData,
  Token,
} from "@/types/types";
import { Account } from "thirdweb/wallets";
import { client } from "@/utils/client";
import {
  CHAIN_ID,
  MULTICALL_ADDRS,
  SUPPORTED_CHAINS,
} from "@/constants/chainConfig";
import { useContractEvents } from "thirdweb/react";
import {
  getOnlyTokenSymbol,
  getSolanaEVMAddress,
  isSolanaAddress,
  isZetachain,
} from "@/utils/utils";
import { useTokenPrices } from "@/providers/TokenPriceProvider";
import { USER_SETTINGS_LOCAL_STORAGE_KEY } from "@/constants";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { EMPTY_BALANCE } from "@/utils/helpers";
import { ethers, Interface } from "ethers";
import { erc20Abi } from "viem";
import multicall3Abi from "../../abis/multicall3ABI.json";
import vaultAbi from "../../abis/moonwellVaultABI.json";
import { ApiService } from "@/service";
import { zetaProvider } from "@/utils/providers";

export const useUpdateVaultBalanceAndTotal = (
  vaults: VaultData[],
  walletAddress: string | null,
  setUserVaultBalances: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  setVaultTotalAssets: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
  setVaultTotalAssetsinToken: React.Dispatch<React.SetStateAction<any[]>>, // Accepts state setter
) => {
  const provider = zetaProvider;
  const mcInterface = useMemo(() => new Interface(multicall3Abi), []);
  const vaultInterface = useMemo(() => new Interface(vaultAbi), []);

  const update = useCallback(async () => {
    if (!provider || !walletAddress || vaults.length === 0) return;
    console.time("updateVaultBalanceAndTotal");
    let address = isSolanaAddress(walletAddress)
      ? "0x77706672467938396e78347A4B734c5066653142"
      : walletAddress;

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
    const api = new ApiService();
    const vaultDataMap = await api.api.getAllVaultDataCached(
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
      const totalAssetsStr = vaultDataMap[vault.id]?.toString() ?? "Error";

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
  }, [provider, vaults, walletAddress]);
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
  useEffect(() => {
    const updateVaultBalanceAndTotal = async () => {
      const address = isSolanaAddress(userAddress)
        ? "0x77706672467938396e78347A4B734c5066653142"
        : userAddress;
      try {
        if (vault && vault.id) {
          const balance = await fetchUserVaultBalance(
            address as Address,
            vault.id as Address,
          );

          const newTotalAssetsinToken = await fetchUserVaultMaxRedeem(
            vault.inputToken.decimals,
            address as Address,
            vault?.id as Address,
          );

          setUserVaultBalance(balance);

          const newTotalAssets = await fetchTotalAssets(vault.id as Address);
          setVaultTotalAsset(newTotalAssets);

          setVaultTotalAssetinToken(newTotalAssetsinToken);
        }
      } catch (error) {
        console.error("Error updating vault balances and total assets:", error);
      }
    };
    if (userAddress && vault) {
      updateVaultBalanceAndTotal();
    }
  }, [
    vault,
    userAddress,
    setUserVaultBalance,
    setVaultTotalAsset,
    transactionCompleted,
    setVaultTotalAssetinToken,
  ]);
};

export const useUpdateAPYs = (
  vaults: VaultData[],
  setVaultAPYs: (vaultAPYs: { vaultId: string; APY7d: number }[]) => void,
  setLoading: (loading: boolean) => void,
  crvTokenPrice: number,
  cvxTokenPrice: number,
  ethTokenPrice: number,
  compTokenPrice: number,
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
                console.log(111);
                APY7d = await calculateAaveAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "ZeroLend") {
                console.log(222);
                APY7d = await calculateAaveAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "Compound") {
                console.log(333);
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
                console.log(444);
                // TO DO This only works for Base right now - it's hardcoded

                APY7d = await calculateMoonwellAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "Venus") {
                console.log(555);
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
                console.log(666);
                APY7d = await calculateEddyAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "Beefy") {
                console.log(777);
                APY7d = await calculateBeefyAPY(
                  receiptTokenAddress as Address,
                  strategyChain,
                );
              } else if (vault.protocol.name === "Curve-Convex") {
                console.log(888);
                // APY7d = await calculateCurveAPY(receiptTokenAddress as Address, strategyChain);
                if (crvTokenPrice > 0 && ethTokenPrice > 0) {
                  if (strategyChain.id === 1) {
                    console.log(881);
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
                    console.log(882);
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

              return { vaultId: vault.id, APY7d };
            } catch (error) {
              console.error(`Error fetching APY for vault ${vault.id}:`, error);
              return { vaultId: vault.id, APY7d: 0 };
            }
          }),
        );

        setVaultAPYs(updatedVaultAPYs);
      } finally {
        setLoading(false); // Stop the loading state after updating APYs
      }
    };

    // Trigger the function if vaults and prices are available
    if (
      vaults.length > 0 &&
      crvTokenPrice > 0 &&
      cvxTokenPrice > 0 &&
      ethTokenPrice > 0 &&
      compTokenPrice > 0
    ) {
      setLoading(true);
      updateAPYs();
    }
  }, [vaults, crvTokenPrice, ethTokenPrice, compTokenPrice]);
};

export const useInteractionEvents = ({
  vaultData,
  activeChainId,
  strategyChainID,
  strategyAddress,
  contractWithdrawalReceiverAddress,
  isTransactionStarted,
}: {
  vaultData: VaultData;
  activeChainId: number;
  strategyChainID: number;
  strategyAddress: string;
  contractWithdrawalReceiverAddress: string;
  isTransactionStarted: boolean;
}) => {
  // events
  const events = useMemo(
    () => ({
      vault: [
        prepareEvent({
          signature:
            "event CrossChainInvestSent(bytes32 indexed crossChainTxId, address receiver, uint256 amount)",
        }),
        prepareEvent({
          signature:
            "event Deposited(address indexed user,uint256 amount,uint256 shares,bytes32 indexed crossChainTxId)",
        }),
        prepareEvent({
          signature:
            "event Deposit(address indexed sender,address indexed owner,uint256 assets,uint256 shares)",
        }),
        prepareEvent({
          signature:
            "event DivestSent(bytes32 indexed crossChainTxId, address user, uint256 shares)",
        }),
        prepareEvent({
          signature:
            "event Withdraw(address indexed sender,address indexed receiver,address indexed owner,uint256 assets,uint256 shares)",
        }),
        prepareEvent({
          signature:
            "event CrossChainInvestFailed(bytes32 indexed crossChainTxId, address receiver, uint256 amount)",
        }),
        prepareEvent({
          signature:
            "event DivestFailed(bytes32 indexed crossChainTxId, address user, uint256 shares)",
        }),
        prepareEvent({
          signature:
            "event ReturnFundsToUserSent(bytes32 indexed crossChainTxId, address receiver, uint256 amount)",
        }),
        prepareEvent({
          signature:
            "event ReturnFundsToUserFailed(bytes32 indexed crossChainTxId, address receiver, uint256 amount)",
        }),
      ],
      strategy: [
        prepareEvent({
          signature:
            "event FundsInvested(bytes32 indexed crossChainTxId,address user,uint256 amount)",
        }),
        prepareEvent({
          signature:
            "event FundsDivested(bytes32 indexed crossChainTxId,address user,uint256 amount)",
        }),
        prepareEvent({
          signature:
            "event InvestConfirmFailed(bytes32 indexed crossChainTxId)",
        }),
        prepareEvent({
          signature:
            "event ReturnFundsFromStrategyFailed(bytes32 indexed crossChainTxId)",
        }),
      ],
      withdrawalReceiver: [
        prepareEvent({
          signature:
            "event FundsReturned(address user,address asset,uint256 amount,bytes32 indexed crossChainTxId)",
        }),
        prepareEvent({
          signature:
            "event CrossChainDepositFailed(bytes32 indexed crossChainTxId)",
        }),
        prepareEvent({
          signature:
            "event CrossChainWithdrawFailed(bytes32 indexed crossChainTxId)",
        }),
      ],
    }),
    [],
  );

  // contracts
  const contracts = useMemo(
    () => ({
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
        chain: defineChain(
          !activeChainId || activeChainId == CHAIN_ID.solana
            ? strategyChainID
            : activeChainId,
        ),
        address: contractWithdrawalReceiverAddress,
      }),
    }),
    [
      vaultData.id,
      strategyChainID,
      strategyAddress,
      activeChainId,
      contractWithdrawalReceiverAddress,
    ],
  );

  // event listeners
  const { data: vaultEvents } = useContractEvents({
    contract: contracts.vault,
    events: events.vault,
    enabled: isTransactionStarted,
  });
  const { data: strategyEvents } = useContractEvents({
    contract: contracts.strategy,
    events: events.strategy,
    enabled: isTransactionStarted,
  });
  const { data: withdrawalReceiverEvents } = useContractEvents({
    contract: contracts.withdrawalReceiver,
    events: events.withdrawalReceiver,
    enabled:
      isTransactionStarted &&
      !(isZetachain(strategyChainID) && isZetachain(activeChainId)),
  });

  return {
    vaultEvents,
    strategyEvents,
    withdrawalReceiverEvents,
  };
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

export function useSlippage() {
  const { userSettings, updateSettings } = useUserSettings();

  const setSlippage = (value: number) => {
    updateSettings("slippage", {
      isAuto: false,
      value,
    });
  };

  const toggleAuto = () => {
    updateSettings("slippage", {
      isAuto: !userSettings.slippage?.isAuto,
      value: DEFAULT_SETTINGS.slippage.value,
    });
  };

  return {
    slippageValue: useMemo(
      () => userSettings.slippage?.value,
      [userSettings.slippage?.value],
    ),
    isAuto: useMemo(
      () => userSettings.slippage?.isAuto,
      [userSettings.slippage?.isAuto],
    ),
    setSlippage,
    toggleAuto,
  };
}
