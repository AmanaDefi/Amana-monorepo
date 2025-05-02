import React, { useEffect, useState, useMemo } from "react";
import { VaultData, VaultTotalAssets, VaultAPY, Token, Balance } from "@/types/types";
import LargeCardStat from "@/components/common/LargeCardStat";
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
  const { activeChain } = useMultiChain();
  const [inputToken, setInputToken] = useState<Token | undefined>();
  const [data1, setdata1] = useState("");
  const [isTvlLoading, setIsTvlLoading] = useState<boolean>(true);
  
  // Determine input token based on user selection or active chain
  useEffect(() => {
    if (selectedToken) {
      // If there's a user-selected token, use it
      setInputToken(selectedToken);
    } else if (activeChain?.id === 7000 || activeChain?.id === 7001) {
      // Fallback: If on ZetaChain, use vault input token
      setInputToken(vaultData.inputToken);
    } else {
      // Fallback: For other chains, determine the appropriate token
      setInputToken(
        determineVaultTokenFromApprovedTokens(
          activeChain?.id as number,
          vaultData.inputToken
        )
      );
    }
  }, [activeChain, vaultData, selectedToken]);

  const { balance: walletTokenBalance, fetchBalance } =
    useMultichainTokenBalance(inputToken);

  const symbol = inputToken?.symbol || "";
  const price = useTokenPriceBySymbol(inputToken?.symbol);
  const vaultTokenPrice = useTokenPriceBySymbol(vaultData.inputToken?.symbol);

  // Format wallet balance according to token type
  const formattedWalletBalance = formatTokenBalance(walletTokenBalance.formatted, symbol);

  const apy = useMemo(() => {
    const vaultApy = vaultAPYs.find((apy) => apy.vaultId === selectedVaultId)?.APY7d;
    return Number.isNaN(Number(vaultApy)) ? 0 : Number(vaultApy) * 100;
  }, [vaultAPYs, selectedVaultId]);

  // // Update data1usd calculation to ensure it's accurate
  // const data1 = userVaultBalance?.formattedUSD 
  //   ? formatCurrency(Number(userVaultBalance.formattedUSD)) 
  //   : formatCurrency(Number(userVaultBalance?.formatted || 0) * vaultTokenPrice);

  useEffect(() => {
    // Update data1 whenever the vault balance changes, using the formatted string
    setdata1(userVaultBalance?.formattedUSD 
      ? formatCurrency(Number(userVaultBalance.formattedUSD)) 
      : formatCurrency(Number(userVaultBalance?.formatted || 0) * vaultTokenPrice));
  }, [userVaultBalance, vaultTokenPrice]);

  // Handle TVL loading state
  useEffect(() => {
    // Set loading state when vaultTotalAsset changes or is undefined
    setIsTvlLoading(!vaultTotalAsset || !vaultTotalAsset.totalAssets);
    
    // If we've received vaultTotalAsset but totalAssets is 0 or missing, retry after 3 seconds
    if (vaultTotalAsset && (!vaultTotalAsset.totalAssets || Number(vaultTotalAsset.totalAssets) === 0)) {
      const retryTimer = setTimeout(() => {
        // This will trigger another data fetch cycle through the parent component
        if (transactionCompleted !== undefined) {
          setIsTvlLoading(true);
        }
      }, 3000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [vaultTotalAsset, transactionCompleted]);

  // Format TVL value with proper handling of loading and empty states
  const formattedTVL = useMemo(() => {
    if (isTvlLoading) {
      return "Loading...";
    }
    console.log("vaultTotalAsset", vaultTotalAsset);
    console.log("vaultTotalAsset.totalAssets", vaultTotalAsset?.totalAssets);
    if (!vaultTotalAsset || !vaultTotalAsset.totalAssets) {
      return "0";
    }
    
    return formatCurrency(Number(vaultTotalAsset.totalAssets));
  }, [vaultTotalAsset, isTvlLoading]);

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
            value={`${formatTokenBalance(data1, vaultData.inputToken.symbol)} ${
              vaultData.inputToken.symbol
            }`}
            secondaryValue={`$ ${formatCurrency(
              Number(data1) * vaultTokenPrice
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
            <p className="text-white text-xl font-bold mt-1">${data1}</p>
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
