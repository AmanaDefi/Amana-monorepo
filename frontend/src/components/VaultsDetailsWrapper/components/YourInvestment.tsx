import Button from "@/components/Button";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";


const YourInvestment = ({}) => {
    return (
      <>
        <div className="flex flex-col gap-2">
          <p className="text-lg font-bold">Your Investment</p>
          <p className="text-[24px] font-medium">$185.56 USDC.ARB</p>
          <p className="flex flex-row gap-1 text-[#3E73C4]">
            <ErrorInputIcon />
            Points Earned: 1,250 Aegies Points
          </p>
        </div>
        <Button variant="custom" className="!max-w-[249px] !h-10 !mt-[23px]">Claim</Button>
      </>
    );
};

export default YourInvestment;