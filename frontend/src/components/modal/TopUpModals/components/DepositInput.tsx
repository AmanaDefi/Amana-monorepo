"use client";

import ChainTokenSelector from "@/components/input/ChainTokenSelector";
import InputNumber from "@/components/input/InputNumber";
import WarningIcon from "@/components/svg/WarningIcon";
import { useFundWalletStore } from "@/store/fundWalletStore";
import { Token } from "@/types/types";
import { useWallets } from "@privy-io/react-auth";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMultichainTokenBalanceForModal } from "@/hooks/useMultichainTokenBalanceForModal";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import clsx from "clsx";
import { Dispatch, SetStateAction, useEffect, useMemo } from "react";
import { MiniSpinner } from "@/components/PendingDots";
import { formatTokenBalanceUSD } from "@/utils/tokenFormat";

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
    walletAddress,
    setStep,
  } = useFundWalletStore();

  const { publicKey } = useWallet();
  const { wallets } = useWallets();
  const filteredWallets = wallets.filter(
    (wallet) => wallet.meta.id !== "app.phantom",
  );

  const activeWallet = filteredWallets[0];

  const walletAddressForBalance = useMemo(() => {
    let result;
    if (!chain) {
      result = walletAddress;
    } else if (chain.name === "Solana") {
      result = publicKey?.toString() || walletAddress;
    } else {
      result =
        activeWallet?.address && activeWallet.walletClientType !== "privy"
          ? activeWallet.address
          : walletAddress;
    }

    return result;
  }, [chain, publicKey, activeWallet, walletAddress]);

  const { balance: tokenBalance, isLoading } =
    useMultichainTokenBalanceForModal(currency, chain, walletAddressForBalance);

  const selectedTokenPrice = useTokenPriceBySymbol(currency?.symbol);

  const balanceUsdValue = useMemo(() => {
    if (!currency || !tokenBalance?.formatted) {
      return "$0.00";
    }
    return formatTokenBalanceUSD(
      tokenBalance.formatted,
      currency.symbol,
      selectedTokenPrice,
    );
  }, [tokenBalance?.formatted, selectedTokenPrice, currency]);

  const depositAmountUsdValue = useMemo(() => {
    if (
      !currency ||
      !depositAmount ||
      depositAmount === "0.00" ||
      !selectedTokenPrice
    ) {
      return "$0.00";
    }
    return formatTokenBalanceUSD(
      depositAmount,
      currency.symbol,
      selectedTokenPrice,
    );
  }, [depositAmount, selectedTokenPrice, currency]);

  useEffect(() => {
    setError("");
    setDepositAmount("0.00");
  }, [chain, setDepositAmount, setError]);

  useEffect(() => {
    setError("");
    setDepositAmount("0.00");
  }, [currency, setError, setDepositAmount]);

  const onTokenSelect = (token: Token) => {
    setCurrency(token);
    setError("");
  };

  const onMaxClick = () => {
    if (tokenBalance && tokenBalance.formatted) {
      const formattedAmount = Number(tokenBalance.formatted).toFixed(7);
      const cleanAmount = parseFloat(formattedAmount).toString();
      setDepositAmount(cleanAmount);
      setError("");
    }
  };

  const handleSetAmount = (e: React.FormEvent<HTMLInputElement>) => {
    setDepositAmount(e.currentTarget.value);
    if (
      e.currentTarget.value &&
      tokenBalance &&
      !!walletAddressForBalance &&
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

  const handleOpenChainsModal = () => {
    setStep("selectChain");
  };

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
          <div className="flex items-center justify-between text-xs md:text-sm text-[#535E73] relative">
            <span>You send (min 0.0015)</span>
            <button
              onClick={onMaxClick}
              className="text-[#3E73C4] hover:underline font-normal absolute left-[65%]"
            >
              MAX
            </button>
            <p className="group-hover/max:text-white">
              {isLoading ? (
                <MiniSpinner size={12} color="#1B46E0" />
              ) : depositAmount && depositAmount !== "0.00" ? (
                `${depositAmountUsdValue}`
              ) : (
                `${balanceUsdValue}`
              )}
            </p>
          </div>

          <div className="flex items-center mt-1">
            <span className="text-white text-2xl">
              <InputNumber value={depositAmount} onChange={handleSetAmount} />
            </span>
            <div className="flex flex-center">
              <ChainTokenSelector
                selectedToken={currency}
                selectedChain={chain}
                className="justify-end flex min-w-[150px]"
                isFromTopUp={true}
                onOpenModal={handleOpenChainsModal}
                onSelectToken={onTokenSelect}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex flex-row h-4 items-center gap-[10px] mt-[10px] mb-2">
            <WarningIcon height={16} width={16} />
            <p className={`text-[#FFC700] text-xs leading-4`}>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
