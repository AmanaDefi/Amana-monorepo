"use client";

import React from "react";
import InvestIcon from "./svg/InvestIcon";
import Button from "./Button";
import { useSignerStatus } from "@account-kit/react";
import { AppButton } from "./button/AppButton";
import { useAuthStore } from "@/store/authStore";

const InvestBlock = () => {
  const { isConnected } = useSignerStatus();
  const { openStep } = useAuthStore();

  const handleFundWallet = () => {
    // Logic for replenishing the wallet
    console.log("Fund wallet clicked");
  };

  return (
    <div className="font-gotham pl-[44px] pr-[40px] py-[18px] flex items-center justify-between rounded-[16px] bg-[rgba(20,23,31,0.15)] backdrop-blur-[20px] shadow-md before-gradient-border">
      <div className="flex flex-row gap-4">
        <div className="rounded-full bg-[#1B46E0] w-[44px] h-[44px] flex items-center justify-center">
          <InvestIcon width={20} height={21} />
        </div>
        <div className="flex flex-col">
          <p className="text-white font-medium text-[24px]">
            Invest Without Limits
          </p>
          <p className="text-[#4874db] font-normal text-[16px] leading-[175%] mt-1">
            Any Asset, Any Chain, Only Performance Fees
          </p>
        </div>
      </div>

      {isConnected ? (
        <Button
          variant="primary"
          className="w-[192px] h-[56px] text-[14px] font-normal text-white"
          onClick={handleFundWallet}
        >
          Fund Wallet
        </Button>
      ) : (
        <div className="w-[192px]">
          <AppButton isBlue onClick={() => openStep("optionsA")}>
            Invest
          </AppButton>
        </div>
      )}
    </div>
  );
};

export default InvestBlock;
