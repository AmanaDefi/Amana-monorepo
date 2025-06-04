import React from "react";

const InvestBlock = () => {
  return (
    <div className="w-[1296px] pl-[44px] pr-[40px] py-[18px] flex items-center justify-between rounded-[16px] bg-[rgba(20,23,31,0.15)] backdrop-blur-[20px] shadow-md before-gradient-border">
      <div className="flex flex-col">
        <p
          className="text-white font-medium text-[24px]"
        >
          Invest Without Limits
        </p>
        <p
          className="text-[#4874db] font-normal text-[16px] leading-[175%] mt-1"
        >
          Any Asset, Any Chain, Only Performance Fees
        </p>
      </div>

      <button className="px-6 py-3 bg-[#1B46E0] text-white rounded-lg hover:bg-[#4874DB] transition-colors">
        Sign In
      </button>
    </div>
  );
};

export default InvestBlock;
