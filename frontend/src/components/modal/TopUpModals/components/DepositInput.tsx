"use client";

import ChainTokenSelector from "@/components/input/ChainTokenSelector";
import InputNumber from "@/components/input/InputNumber";
import WarningIcon from "@/components/svg/WarningIcon";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { useMultichainTokenBalance } from "@/hooks/useMultichainTokenBalance";
import { useFundWalletStore } from "@/store/fundWalletStore";
import { Balance, Token } from "@/types/types";
import { getPublicClient } from "@/utils/getPublicClient";
import { EMPTY_BALANCE } from "@/utils/helpers";
import { format, getERC20TokenBalance } from "@/utils/utils";
import clsx from "clsx";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { formatEther } from "viem";

export const DepositInput = ({
  setError,
  error,
}: {
  setError: Dispatch<SetStateAction<string>>;
  error: string;
}) => {
  const {
    setCurrency,
    chain,
    setDepositAmount,
    depositAmount,
    currency,
    activeConnector,
    walletAddress,
  } = useFundWalletStore();
  const selectedTokenPrice = useTokenPriceBySymbol(currency?.symbol);
  const [tokenBalance, setTokenBalance] = useState<Balance>(EMPTY_BALANCE);

  const fetchTokenBalance = async (token: Token) => {
    if (walletAddress && token && chain) {
      let balance = EMPTY_BALANCE;
      if (token.isNative) {
        const publicClient = getPublicClient(chain.id);
        if (!publicClient) return;

        const balanceInEth = await publicClient.getBalance({
          address: walletAddress,
        });

        const formattedBalance = formatEther(balanceInEth);
        balance = { formatted: formattedBalance, value: balanceInEth };
      } else {
        const { balance: ercBalance, decimals } = await getERC20TokenBalance(
          walletAddress,
          token.address,
          chain,
        );

        balance = {
          value: ercBalance,
          formatted: format(ercBalance, decimals),
        };
      }

      setTokenBalance(balance);
    }
  };

  useEffect(() => {
    setTokenBalance(EMPTY_BALANCE);
    setError("");
    setDepositAmount("");
  }, [chain]);

  useEffect(() => {
    if (walletAddress && currency) {
      fetchTokenBalance(currency);
    }
  }, [walletAddress, currency]);

  const onTokenSelect = (token: Token) => {
    setCurrency(token);
    setError("");
    setDepositAmount("");
  };

  const onMaxClick = () => {
    if (tokenBalance) {
      setDepositAmount(tokenBalance?.formatted);
      setError("");
    }
  };

  const handleSetAmount = (e: React.FormEvent<HTMLInputElement>) => {
    e.preventDefault();

    setDepositAmount(e.currentTarget.value);
    if (
      e.currentTarget.value &&
      tokenBalance &&
      !!walletAddress &&
      chain &&
      currency
    ) {
      if (Number(e.currentTarget.value) > Number(tokenBalance.formatted ?? 0)) {
        setError("Not enough tokens on your wallet");
      } else if (error) {
        setError("");
      }
    } else if (error) {
      setError("");
    }
  };

  const usdValue = Number(tokenBalance?.formatted ?? 0) * selectedTokenPrice;
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
            {!!activeConnector && (
              <button
                onClick={onMaxClick}
                className="text-[#3E73C4] hover:underline font-normal absolute left-[50%]"
              >
                MAX
              </button>
            )}
            <p className="group-hover/max:text-white">${usdValue.toFixed(2)}</p>
          </div>

          <div className="flex items-center mt-1">
            <span className="text-white text-2xl">
              {<InputNumber value={depositAmount} onChange={handleSetAmount} />}
            </span>
            <div className="flex flex-center">
              <ChainTokenSelector
                selectedToken={currency}
                selectedChain={chain}
                onSelectToken={onTokenSelect}
                className="justify-end flex min-w-[150px]"
              />
            </div>
          </div>
        </div>
        {!!error && (
          <div className="flex flex-row items-center gap-[10px] mt-[10px]">
            <WarningIcon height={16} width={16} />
            <p className={`text-[#FFC700] text-xs leading-4`}>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
