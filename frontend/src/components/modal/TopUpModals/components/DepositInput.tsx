"use client";

import ChainTokenSelector from "@/components/input/ChainTokenSelector";
import InputNumber from "@/components/input/InputNumber";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { useFundWalletStore } from "@/store/fundWalletStore";
import { Token } from "@/types/types";
import { useChain } from "@account-kit/react";
import clsx from "clsx";
import { useState } from "react";

export const DepositInput = () => {
  const { setCurrency, chain, setDepositAmount, depositAmount } =
    useFundWalletStore();
  const [token, setToken] = useState<Token>();
  const selectedTokenPrice = useTokenPriceBySymbol(token?.symbol);
  const onMaxClick = () => {};

  const onTokenSelect = (token: Token) => {
    setToken(token);
    setCurrency(token);
  };

  const usdValue = Number(depositAmount) * selectedTokenPrice;
  return (
    <div>
      <div className="relative flex w-full flex-col">
        <div
          style={{ boxShadow: "0 2px 6px 0 rgba(0, 0, 0, 0.25)" }}
          className={clsx(
            "w-full max-h-[75px] bg-[#161C27] pl-5 py-[11px] pr-[10px] rounded-lg border transition-all duration-200",
            "border-[#535E73]",
            "hover:border-[#3E73C4]",
            "focused:border-[#3E73C4]",
          )}
        >
          <div className="flex items-center justify-between text-sm text-[#535E73] relative">
            <span>You send (min 0.0015)</span>
            <button
              onClick={onMaxClick}
              className="text-[#3E73C4] hover:underline font-normal absolute left-[50%]"
            >
              MAX
            </button>
            <p className="group-hover/max:text-white">${usdValue.toFixed(2)}</p>
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="text-white text-2xl">
              {
                <InputNumber
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.currentTarget.value)}
                />
              }
            </span>

            <div className="flex items-center">
              <ChainTokenSelector
                selectedToken={token}
                selectedChain={chain}
                onSelectToken={onTokenSelect}
                className="justify-end"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
