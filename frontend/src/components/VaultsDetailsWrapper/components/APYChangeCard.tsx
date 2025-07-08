import { InfoBlock } from "@/components/VaultsWrapper/components/InfoBlock.tsx";

export type APYChangeCardProps = {
  isDeposit: boolean;
  minReceived: string;
  APYValue: string
};

export default function APYChangeCard({
  isDeposit,
  minReceived,
  APYValue
}: APYChangeCardProps): JSX.Element {
  const apyValue = Number(APYValue || 0);
  return (
    <div className="bg-transparent md:bg-[#161C27] rounded-2xl px-0 py-0 md:px-12 md:py-6 font-normal text-[12px] md:text-sm text-white mt-8 md:mt-[44px]">
      <div className="space-y-4">
        {isDeposit && (
          <div className="flex justify-between items-center">
            <span>APY after your deposit</span>
            <span className="font-medium text-sm"> {(apyValue * 100).toFixed(2)}%</span>
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
