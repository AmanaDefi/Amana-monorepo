import { FC } from "react";
import { useChartStore } from "@/store/chartStore";
import TableChart from "@/components/TableChart";
import InfoIcon from "@/components/svg/InfoIcon";

interface ChartDropdownProps {
  vaultId: string;
  vaultName: string;
}

const ChartDropdown: FC<ChartDropdownProps> = ({ vaultId, vaultName }) => {
  const { getHistoricalAPY, getPercentageChange } = useChartStore();

  const historicalData = getHistoricalAPY(vaultId);
  const percentageChange = getPercentageChange(vaultId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-white text-lg font-medium">Historical APY</h3>
        <InfoIcon />
      </div>
      <TableChart points={historicalData} percentageChange={percentageChange} />
    </div>
  );
};

export default ChartDropdown;
