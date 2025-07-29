import React, { forwardRef, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMultiChain } from "@/providers/MultiChainProvider";
import {
  UserVaultBalance,
  VaultAPY,
  VaultData,
  VaultTotalAssets,
} from "@/types/types";
import { formatTokenBalance } from "@/utils/utils";
import { formatTokenBalanceUSD } from "@/utils/tokenFormat";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { VaultCardInfoBlock } from "./VaultCardInfoBlock";
import { calculateRiskLevel } from "..";
import InfoIcon from "@/components/svg/InfoIcon";
import DynamicArrowIcon from "@/components/svg/DynamicArrow";
import classNames from "classnames";
import { AppButton } from "@/components/button/AppButton";
import { VaultOverviewBlock } from "@/components/VaultOverviewBlock";
import TableChart from "@/components/TableChart";
import { useChartStore } from "@/store/chartStore";
import { getVaultHistoricalAPY } from "@/utils/defillama";
import { getFilteredChartData } from "@/utils/chart";
import { useAPYDisplay } from "@/hooks/useAPYDisplay";
import { usePrediction } from "@/hooks/usePrediction";
import { formatPrediction, getPredictionColorClass, getPredictionArrow } from "@/utils/prediction";
import {
  getNoonCapital30dAvgAPY,
  getNoonCapitalHistoricalAPY,
  isNoonCapitalVault,
} from "@/utils/noonCapital";
import { MiniSpinner } from "@/components/PendingDots";

const MOCK_DIGITS = 6.43;

type Props = {
  vault: VaultData;
  vaultAPYs: VaultAPY[];
  vaultTotalAssets: VaultTotalAssets[];
  userVaultBalances: UserVaultBalance[];
};

export const VaultCard = forwardRef<HTMLDivElement, Props>(
  ({ vault, vaultAPYs, vaultTotalAssets, userVaultBalances }, ref) => {
    const router = useRouter();
    const { walletAddress } = useMultiChain();

    const {
      getHistoricalAPY,
      getPercentageChange,
      hasHistoricalData,
      setHistoricalAPY,
    } = useChartStore();

    // Add state for chart range
    const [chartRange, setChartRange] = useState<"30d" | "90d">("30d");
    const [noonCapitalAPY, setNoonCapitalAPY] = useState<number | null>(null);
    const [noonCapitalChart, setNoonCapitalChart] = useState<
      { apy: number; timestamp: string }[]
    >([]);

    const vaultAPY = vaultAPYs.find((apy) => apy.vaultId === vault.id);
    const totalAssets = vaultTotalAssets.find(
      (asset) => asset.vaultId === vault.id,
    );
    const userBalance = userVaultBalances.find(
      (balance) => balance.vaultId === vault.id,
    );
    const riskLevel = calculateRiskLevel(vault);

    const historicalData = getHistoricalAPY(vault.id);
    const percentageChange = getPercentageChange(vault.id);
    const hasChartData = hasHistoricalData(vault.id);

    // Use prediction hook
    const { prediction, isLoading: predictionLoading, hasData: hasPredictionData } = usePrediction({
      vaultId: vault.id,
      historicalAPY: historicalData
    });

    // Use utility to get filtered chart data
    const chartData = getFilteredChartData(historicalData, chartRange);
    let filteredTimestamps = chartData.filteredTimestamps;
    let filteredChartPoints = chartData.filteredChartPoints;

    if (isNoonCapitalVault(vault.id) && noonCapitalChart.length > 0) {
      // Use Noon Capital chart data
      const allPoints = noonCapitalChart;
      const sorted = allPoints.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      const range = chartRange === "30d" ? 30 : 90;
      const lastN = sorted.slice(-range);
      filteredTimestamps = lastN.map((p) => p.timestamp);
      filteredChartPoints = lastN.map((p) => p.apy);
    }

    const apyDisplay = useAPYDisplay({
      apyValue: isNoonCapitalVault(vault.id)
        ? (noonCapitalAPY ?? undefined)
        : vaultAPY?.apy30d,
      vaultId: vault.id,
    });

    // Get token price for USD conversion
    const tokenPrice = useTokenPriceBySymbol(vault.inputToken.symbol);

    const handleVaultClick = (vaultId: string) => {
      router.push(`/vaults/${vaultId}`);
    };

    const handlePressButton = (
      e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    ) => {
      e.stopPropagation();
      handleVaultClick(vault.id);
    };

    const renderAPYDisplay = () => {
      return (
        <div className="flex flex-row justify-between">
          <p className={apyDisplay.textClass}>{apyDisplay.displayText}</p>
          {apyDisplay.isDefined && (
            <div
              className={classNames({
                "rotate-180": apyDisplay.shouldRotate,
                "rotate-90": apyDisplay.shouldRotateRight,
              })}
            >
              <DynamicArrowIcon color={apyDisplay.arrowColor} />
            </div>
          )}
        </div>
      );
    };

    useEffect(() => {
      if (isNoonCapitalVault(vault.id)) {
        getNoonCapital30dAvgAPY().then(setNoonCapitalAPY);
        getNoonCapitalHistoricalAPY().then((data) => {
          setNoonCapitalChart(data);
          // Store APY in chart store for prediction
          const apyArray = data.map((d) => d.apy);
          setHistoricalAPY(vault.id, apyArray);
        });
      } else {
        getVaultHistoricalAPY(vault.id).then((data) => {
          if (data && Array.isArray(data)) {
            const apyArray = data.map((d) => d.apy);
            setHistoricalAPY(vault.id, apyArray);
          }
        });
      }
    }, [vault.id, setHistoricalAPY]);

    const renderPredictionDisplay = () => {
      if (predictionLoading) {
        return (
          <div className="flex flex-row justify-between">
            <p className="font-semibold text-base md:text-xl leading-5 text-gray-400">
              Loading...
            </p>
          </div>
        );
      }

      if (!hasPredictionData || !prediction) {
        return (
          <div className="flex flex-row justify-between">
            <p className="font-semibold text-base md:text-xl leading-5 text-gray-400">
              N/A
            </p>
          </div>
        );
      }

      const displayText = formatPrediction(prediction);
      const colorClass = getPredictionColorClass(prediction);
      const arrow = getPredictionArrow(prediction);

      return (
        <div className="flex flex-row justify-between">
          <p className={`font-semibold text-base md:text-xl leading-5 ${colorClass}`}>
            {displayText}
          </p>
          {arrow.isDefined && (
            <div
              className={classNames({
                "rotate-180": arrow.shouldRotate,
                "rotate-90": arrow.shouldRotateRight,
              })}
            >
              <DynamicArrowIcon color={arrow.color} />
            </div>
          )}
        </div>
      );
    };

    return (
      <div
        onClick={() => {
          handleVaultClick(vault.id);
        }}
        ref={ref}
        className="w-full h-full bg-[#14171F] md:px-6 px-4 py-6 rounded-2xl transition-all backdrop-blur-[20px] cursor-pointer shadow-md before-gradient-border flex flex-col"
      >
        <div className="flex-1">
          <div className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_max-content] justify-between gap-1">
            <div className="grid grid-cols-[auto_1fr] gap-3 mb-3 p-2 rounded-md col-span-1 items-center">
              <Image
                src={vault.outputTokenImage || vault.inputToken.imgURL}
                alt={vault.outputTokenSymbol || vault.inputToken.symbol}
                width={40}
                height={40}
                className="rounded-full flex-none"
                sizes="36px"
              />
              <div className="flex flex-col flex-auto min-w-0 gap-0 md:gap-1 leading-none">
                <div className="flex flex-col md:flex-row gap-0 leading-none md:gap-2 items-baseline">
                  <p className="text-white font-[600] md:text-lg leading-5 -tracking-1 whitespace-nowrap">
                    {vault.name.replace("Pool", "").replace("Lend", "")}
                  </p>
                </div>
                <p className="text-white leading-4 truncate text-xs md:text-sm">
                  on {vault.protocol.name}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center items-center gap-1 col-span-1 self-start flex-none">
              <Image
                src={vault.imgURL || ""}
                alt={vault.protocol.network}
                width={24}
                height={24}
                className="rounded-full"
                sizes="24px"
              />
              <h3 className="text-white text-xs md:text-sm font-bold text-center">
                {vault.protocol.network}
              </h3>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full mb-2">
            {walletAddress && (
              <VaultCardInfoBlock>
                <div className="flex w-full justify-between">
                  <span className="font-normal text-sm md:text-base leading-4 text-white">
                    Your Deposit:
                  </span>
                  <span className="text-blue-digits font-bold text-lg md:text-xl leading-5">
                    {formatTokenBalanceUSD(
                      userBalance?.balance || 0,
                      vault.inputToken.symbol,
                      tokenPrice,
                    )}
                  </span>
                </div>
              </VaultCardInfoBlock>
            )}
            <VaultCardInfoBlock onClick={(e) => e.stopPropagation()}>
              <VaultOverviewBlock
                vault={vault}
                vaultAPY={vaultAPY}
                totalAssets={totalAssets}
              />
            </VaultCardInfoBlock>

            <div
              className="flex flex-row gap-2 md:gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <VaultCardInfoBlock>
                <div className="flex flex-col gap-2 w-full relative md:pr-6">
                  <p className="font-normal text-xs md:text-sm leading-4 text-white">
                    30d avg APY
                  </p>
                  {renderAPYDisplay()}
                  <div className="hover:cursor-pointer absolute right-[-10px] top-0 md:top-[-10px]">
                    <InfoIcon />
                  </div>
                </div>
              </VaultCardInfoBlock>

              <VaultCardInfoBlock>
                <div className="flex flex-col gap-2 w-full relative md:pr-6">
                  <p className="font-normal text-xs md:text-sm leading-4 text-white">
                    30d prediction
                  </p>
                  {renderPredictionDisplay()}
                  <div className="hover:cursor-pointer absolute right-[-10px] top-0 md:top-[-10px]">
                    <InfoIcon />
                  </div>
                </div>
              </VaultCardInfoBlock>
            </div>
          </div>

          {hasChartData ||
          (isNoonCapitalVault(vault.id) && noonCapitalChart.length > 0) ? (
            <div
              className="flex flex-col w-full rounded-lg pt-2 bg-[#3E73C40D] border border-[#3E3C59] mb-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-row gap-1 items-center justify-between px-2">
                <p className="font-normal text-sm leading-4 text-white pl-[9px]">
                  Historical APY
                </p>
              </div>
              <div className="flex flex-row gap-2  pb-1 pt-1 ml-[9px] px-2">
                <button
                  className={`px-2 py-1 rounded text-xs font-semibold border ${chartRange === "30d" ? "bg-blue-700 text-white border-blue-700" : "bg-transparent text-blue-700 border-blue-700"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setChartRange("30d");
                  }}
                >
                  30d
                </button>
                <button
                  className={`px-2 py-1 rounded text-xs font-semibold border ${chartRange === "90d" ? "bg-blue-700 text-white border-blue-700" : "bg-transparent text-blue-700 border-blue-700"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setChartRange("90d");
                  }}
                >
                  90d
                </button>
              </div>
              <TableChart
                key={`${vault.id}-${chartRange}`}
                points={filteredChartPoints}
                percentageChange={percentageChange}
                timestamps={filteredTimestamps}
              />
            </div>
          ) : (
            <div className="flex flex-col w-full rounded-lg pt-2 bg-[#3E73C40D] border border-[#3E3C59] mb-2">
              <div className="flex flex-row gap-1 items-center justify-between px-2">
                <p className="font-normal text-sm leading-4 text-white pl-[9px]">
                  Historical APY
                </p>
              </div>
              <div className="flex flex-row gap-2 px-2 pb-1 pt-1">
                <div className="px-2 py-1 rounded text-xs font-semibold border bg-blue-700 text-white border-blue-700">
                  30d
                </div>
                <div className="px-2 py-1 rounded text-xs font-semibold border bg-transparent text-blue-700 border-blue-700">
                  90d
                </div>
              </div>
              <div className="w-full h-[80px] flex items-center justify-center bg-gradient-to-r animate-pulse rounded">
                <MiniSpinner size={20} color="#1B46E0" className="-mt-7" />
              </div>
            </div>
          )}

          <p className="font-normal text-xs leading-4 text-white mb-4 md:mb-6 mt-2">
            This vault auto-compounds Lenders Tokens on{" "}
            <span className="flex flex-row gap-1">
              {vault.protocol.name} <InfoIcon />
            </span>
          </p>
        </div>
        <div className="flex gap-4 mt-auto">
          <AppButton
            variant="blue"
            onClick={handlePressButton}
            enableAnimations={true}
          >
            Invest
          </AppButton>

          {userBalance?.balance && Number(userBalance.balance) > 0 && (
            <AppButton
              variant="reverse"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/vaults/${vault.id}?tab=withdraw`);
              }}
            >
              Withdraw
            </AppButton>
          )}
        </div>
      </div>
    );
  },
);

VaultCard.displayName = "VaultCard";
