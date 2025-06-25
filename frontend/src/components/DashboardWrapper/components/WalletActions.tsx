"use client";
import Button from "@/components/Button";
import ReceiveIcon from "@/components/svg/ReceiveIcon";
import SaveIcon from "@/components/svg/SaveIcon";
import TopUpIcon from "@/components/svg/TopUpIcon";
import { useAuthStore } from "@/store/authStore";
import { useFundWalletStore } from "@/store/fundWalletStore";
import { useWallets } from "@privy-io/react-auth";
import React from "react";

const WalletActions = () => {
   const { openStep } =
     useAuthStore();

  const { setStep } = useFundWalletStore();
  const {wallets} = useWallets();
  const user = wallets[0];

  const handleSend = () => {
    openStep("send")
  };

  const handleTopUp = () => {
    setStep("chooseBuyWith");
  };

  return (
    <div className="grid grid-flow-col auto-cols-max gap-x-2 sm:gap-x-4">
      <Button variant="wallet" onClick={handleSend}>
        <SaveIcon width={12} height={10} className="mr-1" />
        Send
      </Button>

      <Button variant="wallet" onClick={() => openStep("recieve")}>
        <ReceiveIcon width={12} height={12} className="mr-1" />
        Receive
      </Button>

      {user?.walletClientType !== "privy" && (
        <Button variant="wallet" onClick={handleTopUp}>
          <TopUpIcon width={12} height={12} className="mr-1" />
          Top Up
        </Button>
      )}
    </div>
  );
};

export default WalletActions;
