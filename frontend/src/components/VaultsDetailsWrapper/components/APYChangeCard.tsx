import { InfoBlock } from "@/components/VaultsWrapper/components/InfoBlock.tsx";
import { useAPYStore } from "@/store/APYStore";
import { useTransactionStore } from "@/store/transactionStore";
import classNames from "classnames";

export type APYChangeCardProps = {
  isDeposit: boolean;
  minReceived: string;
  APYValue: string;
  vaultId: string;
};

export default function APYChangeCard({
  isDeposit,
  minReceived,
  APYValue,
  vaultId,
}: APYChangeCardProps): JSX.Element {
  const apyValue = Number(APYValue || 0);

  const {
    getAPYDirection,
    getAPYChange,
    previousAPY,
    hasAPYChangeData,
    activeTransactionVaultId,
  } = useAPYStore();
  const { finishedTransaction } = useTransactionStore();

  const apyDirection = getAPYDirection(vaultId);
  const apyChange = getAPYChange(vaultId);
  const hasChangeData = hasAPYChangeData(vaultId);

  const shouldShowAPYChange =
    hasChangeData &&
    finishedTransaction &&
    activeTransactionVaultId === vaultId &&
    apyDirection !== "unchanged";


  const getAPYChangeDisplay = () => {
    if (!shouldShowAPYChange) return null;

    const changeText = `${apyChange > 0 ? "+" : ""}${apyChange.toFixed(2)}%`;
    const changeClass = classNames("text-xs font-medium", {
      "text-green-400": apyDirection === "up",
      "text-red-400": apyDirection === "down",
    });

    const arrow = apyDirection === "up" ? "↗" : "↘";

    return (
      <span className={changeClass}>
        {arrow} {changeText}
      </span>
    );
  };

  return (
    <div className="bg-transparent md:bg-[#161C27] rounded-2xl px-0 py-0 md:px-12 md:py-6 font-normal text-[12px] md:text-sm text-white mt-8 md:mt-[44px]">
      <div className="space-y-4">
        {isDeposit && (
          <div className="flex justify-between items-center">
            <span>APY after your deposit</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {(apyValue * 100).toFixed(2)}%
              </span>
              {getAPYChangeDisplay()}
            </div>
          </div>
        )}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <span>Min. Received</span>
            <InfoBlock isLeft>
              💡
              {isDeposit
                ? "The minimum value your investment will be worth after deposit, accounting for maximum possible slippage during execution."
                : "The lowest amount you’re guaranteed to receive after withdrawal, based on worst-case slippage during execution."}
            </InfoBlock>
          </div>

          <span className="font-medium text-sm">${minReceived}</span>
        </div>
      </div>
      {/* <p className="text-[12px] text-[#535E73] mt-4">
        Last updated 21 minutes ago
      </p> */}
    </div>
  );
}
