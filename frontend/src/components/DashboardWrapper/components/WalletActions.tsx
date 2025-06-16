"use client";
import Button from "@/components/Button";
import ReceiveIcon from "@/components/svg/ReceiveIcon";
import SaveIcon from "@/components/svg/SaveIcon";
import TopUpIcon from "@/components/svg/TopUpIcon";
import WithdrawIcon from "@/components/svg/WithdrawIcon";
import React from "react";


const WalletActions = () => {
  const handleSend = () => {
    console.log("Send clicked");
  };

  const handleReceive = () => {
    console.log("Receive clicked");
  };

  const handleTopUp = () => {
    console.log("Top Up clicked");
  };

  const handleWithdraw = () => {
    console.log("Withdraw clicked");
  };

  return (
    <div className="flex flex-wrap gap-4">
      <Button variant="wallet" onClick={handleSend}>
        <SaveIcon width={12} height={10} className="mr-1" />
        Send
      </Button>

      <Button variant="wallet" onClick={handleReceive}>
        <ReceiveIcon width={12} height={12} className="mr-1" />
        Receive
      </Button>

      <Button variant="wallet" onClick={handleTopUp}>
        <TopUpIcon width={12} height={12} className="mr-1" />
        Top Up
      </Button>

      <Button variant="wallet" onClick={handleWithdraw} disabled={false}>
        <WithdrawIcon width={12} height={16} className="mr-1" />
        Withdraw
      </Button>
    </div>
  );
};

export default WalletActions;
