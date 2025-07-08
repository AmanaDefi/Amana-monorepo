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
import { VaultCardInfoBlock } from "./VaultCardInfoBlock";
import { calculateRiskLevel } from "..";
import InfoIcon from "@/components/svg/InfoIcon";
import DynamicArrowIcon from "@/components/svg/DynamicArrow";
import classNames from "classnames";
import { AppButton } from "@/components/button/AppButton";
import { VaultOverviewBlock } from "@/components/VaultOverviewBlock";
import TableChart from "@/components/TableChart";
import { useChartStore } from "@/store/chartStore";
import { getVaultHistoricalAPY } from '@/utils/defillama';
import { getFilteredChartData } from '@/utils/chart';

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

    const { getHistoricalAPY, getPercentageChange, hasHistoricalData, setHistoricalAPY } =
      useChartStore();

    // Add state for chart range
    const [chartRange, setChartRange] = useState<'30d' | '90d'>('30d');

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

    // Type guard to check if historicalData is array of objects with timestamp
    function isHistoricalObjArray(arr: any[]): arr is { apy: number; timestamp: string | number }[] {
      return arr.length > 0 && typeof arr[0] === 'object' && 'timestamp' in arr[0];
    }

    // Use utility to get filtered chart data
    const { filteredTimestamps, filteredChartPoints } = getFilteredChartData(historicalData, chartRange);

    const handleVaultClick = (vaultId: string) => {
      router.push(`/vaults/${vaultId}`);
    };

    const is30dAPYUp = true;
    const isPredictionUp = false;

    const handlePressButton = (
      e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    ) => {
      e.stopPropagation();
      handleVaultClick(vault.id);
    };

    const renderAPYDisplay = () => {
      const apyValue = vaultAPY?.apy30d;
      const isDefined = typeof apyValue === "number" && !isNaN(apyValue);
      const isNegative = isDefined && apyValue < 0;
      const isLow = isDefined && apyValue >= 0 && apyValue <= 0.5;
      const isHigh = isDefined && apyValue > 0.5;

      const displayText = isDefined

        ? `${isNegative ? "-" : ""}${Math.abs(apyValue!).toFixed(2)}%`
        : "N/A";


      const textClass = classNames("font-bold text-xl leading-5", {
        "text-white": isNegative || !isDefined,
        "text-green-accent": isHigh || isLow,
        "text-gray-400": !isDefined,
      });

      const arrowColor = isNegative ? "#FF1E1E" : isLow ? "#FFA500" : "#05D47F";

      return (
        <div className="flex flex-row justify-between">
          <p className={textClass}>{displayText}</p>
          {isDefined && (
            <div className={classNames({ "rotate-180": isNegative })}>
              <DynamicArrowIcon color={arrowColor} />
            </div>
          )}
        </div>
      );
    };


    useEffect(() => {
      getVaultHistoricalAPY(vault.id).then(data => {
        if (data && Array.isArray(data)) {
          const apyArray = data.map(d => d.apy);
          setHistoricalAPY(vault.id, apyArray);
        }
      });
    }, [vault.id, setHistoricalAPY]);

    // Calculate latest APY value
    const latestAPY = filteredChartPoints.length > 0 ? filteredChartPoints[filteredChartPoints.length - 1] : null;


    return (
      <div
        onClick={() => {
          handleVaultClick(vault.id);
        }}
        ref={ref}
        className="w-full h-full bg-[#14171F] md:px-6 px-4 py-6 rounded-2xl transition-all backdrop-blur-[20px] cursor-pointer shadow-md before-gradient-border"
      >
        <div className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_max-content] justify-between gap-1">
          <div className="grid grid-cols-[auto_1fr] gap-3 mb-3 p-2 rounded-md col-span-1 items-center">
            <Image
              src={vault.inputToken.imgURL}
              alt={vault.inputToken.symbol}
              width={40}
              height={40}
              className="rounded-full flex-none"
              sizes="36px"
            />
            <div className="flex flex-col gap-1 flex-auto min-w-0">
              <div className="flex flex-row gap-2 items-baseline">
                <p className="text-white font-[600] md:text-lg leading-5 -tracking-1 whitespace-nowrap">
                  {vault.name.replace("Pool", "").replace("Lend", "")}
                </p>
                <p className="text-white text-sm leading-4 whitespace-nowrap overflow-hidden text-ellipsis flex-shrink min-w-0">
                  Lend Pool
                </p>
              </div>
              <p className="text-white text-sm leading-4 truncate">
                on {vault.protocol.name}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 col-span-1 self-start flex-none">
            <Image
              src={vault.imgURL || ""}
              alt={vault.protocol.network}
              width={24}
              height={24}
              className="rounded-full"
              sizes="24px"
            />
            <h3 className="text-white text-sm font-bold">
              {vault.protocol.network}
            </h3>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full mb-2">
          {walletAddress && (
            <VaultCardInfoBlock>
              <div className="flex w-full justify-between">
                <span className="font-normal text-base leading-4 text-white">
                  Your Deposit:
                </span>
                <span className="text-blue-digits font-bold text-xl leading-5">
                  $
                  {formatTokenBalance(
                    userBalance?.balance || 0,
                    vault.inputToken.symbol,
                  )}
                </span>
              </div>
            </VaultCardInfoBlock>
          )}
          <VaultCardInfoBlock>
            <VaultOverviewBlock
              vault={vault}
              vaultAPY={vaultAPY}
              totalAssets={totalAssets}
            />
          </VaultCardInfoBlock>

          <div className="flex flex-row gap-4">
            <VaultCardInfoBlock>
              <div className="flex flex-col gap-2 w-full relative md:pr-6">
                <p className="font-normal text-sm leading-4 text-white">
                  30d avg APY
                </p>
                {renderAPYDisplay()}
                <div className="hover:cursor-pointer absolute right-[-10px] top-[-10px]">
                  <InfoIcon />
                </div>
              </div>
            </VaultCardInfoBlock>

            <VaultCardInfoBlock>
              <div className="flex flex-col gap-2 w-full relative md:pr-6">
                <p className="font-normal text-sm leading-4 text-white">
                  30d prediction
                </p>
                {renderPredictionDisplay()}
                <div className="hover:cursor-pointer absolute right-[-10px] top-[-10px]">
                  <InfoIcon />
                </div>
              </div>
            </VaultCardInfoBlock>
          </div>
        </div>

        {hasChartData && (
          <div className="flex flex-col w-full rounded-lg pt-2 bg-[#3E73C40D] border border-[#3E3C59]">
            <div className="flex flex-row gap-1 items-center justify-between px-2">
              <p className="font-normal text-sm leading-4 text-white pl-[9px]">
                Historical APY
              </p>
            </div>
            {/* Chart range toggle */}
            <div className="flex flex-row gap-2 px-2 pb-1 pt-1">
              <button
                className={`px-2 py-1 rounded text-xs font-semibold border ${chartRange === '30d' ? 'bg-blue-700 text-white border-blue-700' : 'bg-transparent text-blue-700 border-blue-700'}`}
                onClick={e => { e.stopPropagation(); setChartRange('30d'); }}
              >
                30d
              </button>
              <button
                className={`px-2 py-1 rounded text-xs font-semibold border ${chartRange === '90d' ? 'bg-blue-700 text-white border-blue-700' : 'bg-transparent text-blue-700 border-blue-700'}`}
                onClick={e => { e.stopPropagation(); setChartRange('90d'); }}
              >
                90d
              </button>
            </div>
            <TableChart
              points={filteredChartPoints}
              percentageChange={percentageChange}
              timestamps={filteredTimestamps}
            />
          </div>
        )}

        <p className="font-normal text-xs leading-4 text-white mb-6 mt-2">
          This vault auto-compounds Lenders Tokens on{" "}
          <span className="flex flex-row gap-1">
            {vault.protocol.name} <InfoIcon />
          </span>
        </p>

        <div className="flex gap-4">
          <AppButton variant="blue" onClick={handlePressButton}>
            {!!walletAddress ? "Deposit" : "Invest"}
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
