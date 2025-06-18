"use client";
import Button from "@/components/Button";
import ReceiveIcon from "@/components/svg/ReceiveIcon";
import SaveIcon from "@/components/svg/SaveIcon";
import TopUpIcon from "@/components/svg/TopUpIcon";
import { useAuthStore } from "@/store/authStore";
import { useFundWalletStore } from "@/store/fundWalletStore";
import { useUser } from "@account-kit/react";
import React from "react";

const WalletActions = () => {
   const { openStep } =
     useAuthStore();

  const { setStep } = useFundWalletStore();
  const user = useUser();

  const handleSend = () => {
    console.log("Send clicked");
  };
  const handleReceive = () => {
    console.log("Receive clicked");
  };

  const handleTopUp = () => {
    setStep("chooseBuyWith");
  };

  return (
    <div className="flex flex-wrap gap-4">
      <Button variant="wallet" onClick={() => openStep("send")}>
        <SaveIcon width={12} height={10} className="mr-1" />
        Send
      </Button>

      <Button
        variant="wallet"
        onClick={() => openStep("recieve")}
      >
        <ReceiveIcon width={12} height={12} className="mr-1" />
        Receive
      </Button>

      {user?.type === "sca" && (
        <Button variant="wallet" onClick={handleTopUp}>
          <TopUpIcon width={12} height={12} className="mr-1" />
          Top Up
        </Button>
      )}
    </div>
  );
};

export default WalletActions;
