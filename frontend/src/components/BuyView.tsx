import React from "react";
import { PayEmbed, useActiveWalletChain } from "thirdweb/react";
import { client } from "../utils/client";
import { ZC_ETH_BASE_ADDRESS } from "../../../constants";

const BuyView: React.FC = ({}) => {
  const activeChain = useActiveWalletChain();
  if (!activeChain) {
    throw new Error("No active chain found");
  }
  return (
    <div className="flex items-center justify-center mt-16 h-full w-full">

      <PayEmbed 
      client={client}
      payOptions={{
        mode: "fund_wallet",
        prefillBuy: {
          token: {
            address: ZC_ETH_BASE_ADDRESS,
            name: "Base Sepolia ETH",
            symbol: "ETH.BASE",
            icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
          },
          chain: activeChain,
          allowEdits: {
            amount: true, // allow editing buy amount
            token: true, // disable selecting buy token
            chain: false, // disable selecting buy chain
          },
        },
        buyWithCrypto: {
          prefillSource: {
            allowEdits: {
              chain: false,
              token: true,
            },
            chain: activeChain,
            // token: {
            //   address: ZC_USDC_ETH_ADDRESS,
            //   name: "Base USDC",
            //   symbol: "USDC",
            // }
          }
        },
        buyWithFiat: 
        {
        },
        metadata: {name: "Fund Wallet"},
      }}
      />

    </div>
  );
};

export default BuyView;
