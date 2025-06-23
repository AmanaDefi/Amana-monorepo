"use client";

import React from "react";
import InvestIcon from "./svg/InvestIcon";
import Button from "./Button";
import { useUser } from "@account-kit/react";
import { useAuthStore } from "@/store/authStore";
import { useFundWalletStore } from "@/store/fundWalletStore";
import { useMultiChain } from "@/providers/MultiChainProvider";

const InvestBlock = () => {
  const { walletAddress } = useMultiChain();
  const { openStep } = useAuthStore();
  const { setStep } = useFundWalletStore();
  const user = useUser();

  const handleFundWallet = () => {
    if (user?.type === "eoa") {
      openStep("recieve");
    } else {
      setStep("chooseBuyWith");
    }
  };

  return (
    <div className="font-gotham pl-[44px] pr-[40px] py-[18px] hidden md:flex items-center justify-between rounded-[16px] bg-[rgba(20,23,31,0.15)] backdrop-blur-[20px] shadow-md before-gradient-border">
      <div className="flex flex-row gap-4">
        <div className="rounded-full bg-[#1B46E0] w-[44px] h-[44px] flex items-center justify-center">
          <InvestIcon width={25} height={25} />
        </div>
        <div className="flex flex-col">
          <p className="text-white font-medium text-lg lg:text-[24px]">
            Invest Without Limits
          </p>
          <p className="text-[#4874db] font-normal text-sm lg:text-[16px] leading-[175%] mt-1">
            Any Asset, Any Chain, Only Performance Fees
          </p>
        </div>
      </div>

      {!!walletAddress ? (
        <Button
          variant="primary"
          className="w-[192px] h-[56px] text-[14px] font-normal text-white"
          onClick={handleFundWallet}
        >
          Fund Wallet
        </Button>
      ) : (
        <div className="thirdweb-invest-button">
          <button
            onClick={() => openStep("optionsA")}
            className="w-[192px] h-[56px] text-[18px] font-normal rounded-lg bg-[#1B46E0] text-white border border-[#323234] shadow-[0_4px_4px_0_rgba(0,0,0,0.15),inset_0_2px_4px_0_#5251c5] backdrop-blur-[20px] hover:backdrop-blur-[20px] hover:shadow-[inset_0_2px_4px_0_#5251c5] active:bg-[#1B46E0] active:backdrop-blur-[20px] active:shadow-[inset_0_2px_4px_0_#5251c5] flex items-center justify-center transition"
          >
            Invest
          </button>
        </div>
      )}
    </div>
  );
};

export default InvestBlock;
