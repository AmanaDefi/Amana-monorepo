import { FC } from "react";
import { useChartStore } from "@/store/chartStore";
import TableChart from "@/components/TableChart";
import { InfoBlock } from "@/components/VaultsWrapper/components/InfoBlock.tsx";

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
      <InfoBlock isLeft>💡 Historical APY</InfoBlock>
      <TableChart points={historicalData} percentageChange={percentageChange} />
    </div>
  );
};

export default ChartDropdown;
