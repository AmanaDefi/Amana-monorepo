"use client";
import Button from "@/components/Button";
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
        Send
      </Button>

      <Button variant="wallet" onClick={handleReceive}>
        Receive
      </Button>

      <Button variant="wallet" onClick={handleTopUp}>
        Top Up
      </Button>

      <Button
        variant="wallet"
        onClick={handleWithdraw}
        disabled={false} 
      >
        Withdraw
      </Button>
    </div>
  );
};

export default WalletActions;
