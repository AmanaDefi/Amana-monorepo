import React, { useEffect, useState, useMemo, useRef } from "react";
import { VaultData, VaultTotalAssets, VaultAPY, Token, Balance } from "@/types/types";
import Image from "next/image";
import {
  determineVaultTokenFromApprovedTokens,
  formatBalance,
  formatCurrency,
} from "@/utils/utils";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useMultichainTokenBalance } from "@/hooks/useMultichainTokenBalance";
import { formatTokenBalance } from "@/utils/utils";
import ResponsiveTooltip from "@/components/common/Tooltip";
import { InformationCircleIcon } from "@heroicons/react/24/solid";
import { fetchTotalAssets, fetchUserVaultBalance } from "@/actions/actions";
import { Address } from "thirdweb";
import { ApiService } from "@/service";

export default function VaultHeader({
  vaultData,
  userVaultBalance,
  selectedVaultId,
  vaultTotalAsset,
  vaultAPYs,
  transactionCompleted,
  selectedToken,
}: {
  vaultData: VaultData;
  userVaultBalance?: Balance;
  selectedVaultId: string;
  vaultTotalAsset?: VaultTotalAssets;
  vaultAPYs: VaultAPY[];
  transactionCompleted: boolean;
  selectedToken?: Token;
}): JSX.Element {
  const { activeChain, walletAddress } = useMultiChain();
  const [inputToken, setInputToken] = useState<Token | undefined>();
  const [isTvlLoading, setIsTvlLoading] = useState<boolean>(true);
  const [tvlValue, setTvlValue] = useState<string>("0");
  const [depositAmount, setDepositAmount] = useState<string>("0");
  
  // Track the last vault ID to detect vault changes
  const lastVaultIdRef = useRef<string | null>(null);
  
  // Determine input token based on user selection or active chain
  useEffect(() => {
    const vaultId = vaultData.id as string;
    const isNewVault = vaultId !== lastVaultIdRef.current;
  
    
    // Extract base symbol from vault token
    const vaultTokenSymbol = vaultData.inputToken.symbol.split('.')[0].split(' ')[0];
    
    // Check if vault token is a native token
    const isNativeVaultToken = ['ETH', 'BNB', 'MATIC', 'AVAX', 'FTM', 'ONE', 'CRO', 'SOL', 'GLMR'].includes(vaultTokenSymbol.toUpperCase());
    
    // Ensure we always update the input token when any of these dependencies change
    if (selectedToken) {
      // If there's a user-selected token, use it
      setInputToken(selectedToken);
    } else if (activeChain?.id === 7000 || activeChain?.id === 7001) {
      // Fallback: If on ZetaChain, use vault input token
      setInputToken(vaultData.inputToken);
    } else if (activeChain) {
      // Fallback: For other chains, determine the appropriate token
      const determinedToken = determineVaultTokenFromApprovedTokens(
        activeChain.id as number,
        vaultData.inputToken
      );
      setInputToken(determinedToken);
    }
    
    // Update the last vault ID reference
    lastVaultIdRef.current = vaultId;
  }, [activeChain, vaultData.id, vaultData.inputToken, selectedToken]);

  // Force wallet balance refresh when chain or token changes
  const { balance: walletTokenBalance, fetchBalance } = useMultichainTokenBalance(inputToken);
  
  useEffect(() => {
    // Refresh the balance when network or token changes
    if (inputToken && activeChain) {
      fetchBalance();
    }
  }, [activeChain?.id, inputToken?.address, fetchBalance]);

  const symbol = inputToken?.symbol || "";
  const price = useTokenPriceBySymbol(inputToken?.symbol);
  const vaultTokenPrice = useTokenPriceBySymbol(vaultData.inputToken?.symbol) || 0;

  // Format wallet balance according to token type
  const formattedWalletBalance = formatTokenBalance(walletTokenBalance.formatted, symbol);

  // Calculate APY from the vaultAPYs array
  const apy = useMemo(() => {
    const vaultApy = vaultAPYs.find((apy) => apy.vaultId === selectedVaultId)?.APY7d;
    return Number.isNaN(Number(vaultApy)) ? 0 : Number(vaultApy) * 100;
  }, [vaultAPYs, selectedVaultId]);

  // Fetch TVL directly using the API service
  useEffect(() => {
    async function fetchTVLData() {
      try {
        setIsTvlLoading(true);
        const data = await new ApiService().api.getVaultData(vaultData.id as string);
        if (data && data.total_assets) {
          setTvlValue(data.total_assets);
          setIsTvlLoading(false);
        } else {
          // If API returns empty data, retry after a delay
          setTimeout(fetchTVLData, 3000);
        }
      } catch (error) {
        console.error("Error fetching TVL:", error);
        // On error, retry after a delay
        setTimeout(fetchTVLData, 3000);
      }
    }
    
    fetchTVLData();
  }, [vaultData.id, transactionCompleted]);

  // Fetch user vault balance directly
  useEffect(() => {
    async function fetchUserDeposit() {
      if (!walletAddress) {
        setDepositAmount("0");
        return;
      }
      
      try {
        const balance = await fetchUserVaultBalance(
          walletAddress as Address,
          vaultData.id as Address
        );
        
        setDepositAmount(balance);
      } catch (error) {
        console.error("Error fetching user deposit:", error);
        setDepositAmount("0");
      }
    }
    
    fetchUserDeposit();
  }, [vaultData.id, walletAddress, transactionCompleted]);

  // Calculate deposit value in USD
  const depositAmountNumber = parseFloat(depositAmount) || 0;
  const depositValueUSD = formatCurrency(depositAmountNumber * vaultTokenPrice);
  
  // Format TVL with proper handling of loading state
  const formattedTVL = useMemo(() => {
    if (isTvlLoading) {
      return "Loading...";
    }
    
    // Use either the directly fetched TVL or the one from props
    const tvlToUse = tvlValue || (vaultTotalAsset?.totalAssets ? vaultTotalAsset.totalAssets : "0");
    return formatCurrency(Number(tvlToUse));
  }, [tvlValue, vaultTotalAsset, isTvlLoading]);

  return (
    <section className="md:border-b border-customNeutral100 pt-10 pb-6 px-4 md:px-0 ">
      <div className="w-full mb-12 flex flex-row items-center">
        <div className="flex items-center gap-4 max-w-full flex-wrap md:flex-nowrap flex-1">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Image
                src={vaultData.imgURL ?? ""}
                alt={vaultData.protocol.network}
                width={1200}
                height={800}
                className={`w-6 md:w-10 h-6 md:h-10 mr-2 rounded-full`}
              />
            </div>
            <h2 className="font-bold text-white">
              {vaultData.protocol.network}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Image
                src={vaultData.protocol.imgURL}
                alt={vaultData.protocol.name}
                width={1200}
                height={800}
                className={`w-6 md:w-10 h-6 md:h-10 mr-2 rounded-full`}
              />
            </div>
            <h2 className="font-bold text-white">{vaultData.protocol.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Image
                src={vaultData.inputToken.imgURL}
                alt={vaultData.name}
                width={1200}
                height={800}
                className={`w-6 md:w-10 h-6 md:h-10 mr-2 rounded-full`}
              />
            </div>
            <h2 className="font-bold text-white">{vaultData.name}</h2>
          </div>
        </div>
      </div>
      {/* I'm currently commenting out the large card stats and using the small card stat instead for a custom design but later I'll refactor the large card stats for our new design that's why I'm not changing anything in the large card stats */}
      {/* Key Metrics in Large Card Stat */}
      {/* <div className="w-full md:flex md:flex-row md:justify-between space-y-4 md:space-y-0 mt-4 md:mt-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:pr-10 gap-4 md:gap-20">
          <LargeCardStat
            id="deposits"
            label="Deposits"
            value={`${formatTokenBalance(depositAmount, vaultData.inputToken.symbol)} ${
              vaultData.inputToken.symbol
            }`}
            secondaryValue={`$ ${formatCurrency(
              depositAmountNumber * vaultTokenPrice
            )}`}
            tooltip="Value of your vault deposits"
          />
          <LargeCardStat
            id="wallet"
            label="Your Wallet"
            value={`${formattedWalletBalance} ${symbol}`}
            secondaryValue={`$ ${formatCurrency(
              Number(walletTokenBalance.formatted) * price
            )}`}
            tooltip="Value of deposit assets held in your wallet"
          />
          <LargeCardStat
            id="APY"
            label="7d APY"
            value={
              Number.isNaN(
                Number(
                  vaultAPYs.find((apy) => apy.vaultId === selectedVaultId)
                    ?.APY7d
                )
              )
                ? "0%"
                : `${(
                    Number(
                      vaultAPYs.find((apy) => apy.vaultId === selectedVaultId)
                        ?.APY7d
                    ) * 100
                  ).toFixed(2)}%`
            }
            tooltip="APY for the last 7 days"
          />
        </div>
      </div> */}
      {/* Key Metrics in Small Card Stat */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-white mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-customNeutral300 py-4 px-5 rounded-lg border border-customNeutral100">
            <div className="flex items-center gap-2">
              <p className="text-gray-400 text-sm">APY (7d)</p>
              <button id="apy-info" className="group">
                <InformationCircleIcon className="w-4 h-4 text-customGray300 group-hover:text-white group-hover:transition-colors" />
              </button>
              <ResponsiveTooltip
                id={"apy-info"}
                content={
                  <p className="w-60">
                    Annual Percentage Yield based on the last 7 days of performance
                  </p>
                }
              />
            </div>
            <p className="text-white text-xl font-bold mt-1">{apy.toFixed(2)}%</p>
          </div>
          
          <div className="bg-customNeutral300 py-4 px-5 rounded-lg border border-customNeutral100">
            <div className="flex items-center gap-2">
              <p className="text-gray-400 text-sm">Total Value Locked</p>
              <button id="tvl-info" className="group">
                <InformationCircleIcon className="w-4 h-4 text-customGray300 group-hover:text-white group-hover:transition-colors" />
              </button>
              <ResponsiveTooltip
                id={"tvl-info"}
                content={
                  <p className="w-60">
                    Total value of assets currently locked in this vault
                  </p>
                }
              />
            </div>
            <p className="text-white text-xl font-bold mt-1">
              {isTvlLoading ? (
                <span className="inline-block animate-pulse">Loading...</span>
              ) : (
                `$${formattedTVL}`
              )}
            </p>
          </div>
          
          <div className="bg-customNeutral300 py-4 px-5 rounded-lg border border-customNeutral100">
            <div className="flex items-center gap-2">
              <p className="text-gray-400 text-sm">Your Vault Deposits</p>
              <button id="deposits-info" className="group">
                <InformationCircleIcon className="w-4 h-4 text-customGray300 group-hover:text-white group-hover:transition-colors" />
              </button>
              <ResponsiveTooltip
                id="deposits-info"
                content={
                  <p className="w-60">
                    Shows how much you&apos;ve deposited into this vault (in USD), including all earnings to date.
                  </p>
                }
              />
            </div>
            <p className="text-white text-xl font-bold mt-1">${depositValueUSD}</p>
          </div>
          
          <div className="bg-customNeutral300 py-4 px-5 rounded-lg border border-customNeutral100">
           
          <div className="flex items-center gap-2">
            <p className="text-gray-400 text-sm">Your Wallet</p>
            <button id="wallet-info" className="group">
                <InformationCircleIcon className="w-4 h-4 text-customGray300 group-hover:text-white group-hover:transition-colors" />
              </button>
              <ResponsiveTooltip
                id="wallet-info"
                content={
                  <p className="w-60">
                    This is the total amount of {symbol} in your connected wallet, available for deposit.
                  </p>
                }
              />
            </div>
            <p className="text-white text-xl font-bold mt-1">
              {formattedWalletBalance} {symbol}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
