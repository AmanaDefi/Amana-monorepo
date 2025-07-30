import { FC, useState, useEffect } from "react";
import { useChartStore } from "@/store/chartStore";
import TableChart from "@/components/TableChart";
import { getFilteredChartData } from "@/utils/chart";
import {
  getNoonCapitalHistoricalAPY,
  isNoonCapitalVault,
} from "@/utils/noonCapital";
import { getVaultHistoricalAPY } from "@/utils/defillama";

interface ChartDropdownProps {
  vaultId: string;
  vaultName: string;
}

const ChartDropdown: FC<ChartDropdownProps> = ({ vaultId, vaultName }) => {
  const {
    getHistoricalAPY,
    getPercentageChange,
    hasHistoricalData,
    setHistoricalAPY,
  } = useChartStore();

  const [chartRange, setChartRange] = useState<"30d" | "90d">("30d");
  const [noonCapitalChart, setNoonCapitalChart] = useState<
    { apy: number; timestamp: string }[]
  >([]);

  const historicalData = getHistoricalAPY(vaultId);
  const percentageChange = getPercentageChange(vaultId);
  const hasChartData = hasHistoricalData(vaultId);

  const chartData = getFilteredChartData(historicalData, chartRange);
  let filteredTimestamps = chartData.filteredTimestamps;
  let filteredChartPoints = chartData.filteredChartPoints;

  // Handle Noon Capital vault data 
  if (isNoonCapitalVault(vaultId) && noonCapitalChart.length > 0) {
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

  useEffect(() => {
    if (isNoonCapitalVault(vaultId)) {
      getNoonCapitalHistoricalAPY().then(setNoonCapitalChart);
    } else {
      getVaultHistoricalAPY(vaultId).then((data) => {
        if (data && Array.isArray(data)) {
          const apyArray = data.map((d) => d.apy);
          setHistoricalAPY(vaultId, apyArray);
        }
      });
    }
  }, [vaultId, setHistoricalAPY]);

  return (
    <div className="flex flex-col w-full rounded-lg pt-2 bg-[#3E73C40D] border border-[#3E3C59]">
      <div className="flex flex-row gap-1 items-center justify-between px-2">
        {/* <p className="font-normal text-sm leading-4 text-white pl-[9px]">
          Historical APY
        </p> */}
      </div>
      {/* Chart range toggle */}
      <div className="flex flex-row gap-2 px-2 pb-1 pt-1">
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

      {(hasChartData ||
        (isNoonCapitalVault(vaultId) && noonCapitalChart.length > 0)) && (
        <TableChart
          key={`${vaultId}-${chartRange}`}
          points={filteredChartPoints}
          percentageChange={percentageChange}
          timestamps={filteredTimestamps}
        />
      )}
    </div>
  );
};

export default ChartDropdown;
