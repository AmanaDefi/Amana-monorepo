import { FC, useState } from "react";
import { useChartStore } from "@/store/chartStore";
import TableChart from "@/components/TableChart";
import { getFilteredChartData } from '@/utils/chart';

interface ChartDropdownProps {
  vaultId: string;
  vaultName: string;
}

const ChartDropdown: FC<ChartDropdownProps> = ({ vaultId, vaultName }) => {
  const { getHistoricalAPY, getPercentageChange, hasHistoricalData } = useChartStore();
  const [chartRange, setChartRange] = useState<'30d' | '90d'>('30d');

  const historicalData = getHistoricalAPY(vaultId);
  const percentageChange = getPercentageChange(vaultId);
  const hasChartData = hasHistoricalData(vaultId);

  const { filteredTimestamps, filteredChartPoints } = getFilteredChartData(historicalData, chartRange);

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
  );
};

export default ChartDropdown;
