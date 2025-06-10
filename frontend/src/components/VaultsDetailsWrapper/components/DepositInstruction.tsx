import ConfirmDepositIcon from "@/components/svg/instruction/ConfirmDepositIcon";
import CrossChainTransferIcon from "@/components/svg/instruction/CrossChainTransferIcon";
import FinalConfirmationIcon from "@/components/svg/instruction/FinalConfirmationIcon";
import SelectTokenIcon from "@/components/svg/instruction/SelectTokenIcon";
import React from "react";

interface DepositInstructionProps {}

const DepositInstruction: React.FC<DepositInstructionProps> = ({}) => {
  return (
    <div className="flex flex-col gap-[30px]">
      <div className="flex flex-row gap-4 items-center">
        <div className="rounded-full w-11 h-11 bg-[#535E73] flex items-center justify-center">
          <SelectTokenIcon width={20} height={20} />
        </div>
        <p className="text-[18px] font-bold tracking-[-0.06em]">
          Select the token you want to deposit
        </p>
      </div>
      <div className="flex flex-row gap-4 items-center">
        <div className="rounded-full w-11 h-11 bg-[#535E73] flex items-center justify-center">
          <ConfirmDepositIcon width={20} height={20} />
        </div>
        <p className="text-[18px] font-bold tracking-[-0.06em]">
          Confirm deposit
        </p>
      </div>
      <div className="flex flex-row gap-4 items-center">
        <div className="rounded-full w-11 h-11 bg-[#535E73] flex items-center justify-center">
          <CrossChainTransferIcon width={20} height={20} />
        </div>
        <p className="text-[18px] font-bold tracking-[-0.06em]">
          Cross-chain transfer and investment of funds
        </p>
      </div>
      <div className="flex flex-row gap-4 items-center">
        <div className="rounded-full w-11 h-11 bg-[#535E73] flex items-center justify-center">
          <FinalConfirmationIcon width={20} height={20} />
        </div>
        <p className="text-[18px] font-bold tracking-[-0.06em]">
          Final confirmation and issue of shares
        </p>
      </div>
      <div className="rounded-[4px] h-[2px] bg-[#535E73]"></div>
    </div>
  );
};

export default DepositInstruction;
