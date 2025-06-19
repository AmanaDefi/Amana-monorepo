import Button from "@/components/Button";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";


const YourInvestment = ({}) => {
    return (
      <div className="bg-[#14171F] rounded-2xl py-6 px-[30px] border border-[#2A2D36]">
        <div className="flex flex-col gap-2">
          <p className="text-lg font-bold">Your Investment</p>
          <p className="text-[24px] font-medium">$185.56 USDC.ARB</p>
          <p className="flex flex-row gap-1 text-[#3E73C4] items-center">
            <ErrorInputIcon width={14} height={15} className="fill-[#1B46E0]" />
            Points Earned: 1,250 Aegies Points
          </p>
        </div>
        <Button variant="custom" disabled={true} className="!min-w-[294px] !h-10 !mt-[23px]">
          Claim
        </Button>
      </div>
    );
};

export default YourInvestment;