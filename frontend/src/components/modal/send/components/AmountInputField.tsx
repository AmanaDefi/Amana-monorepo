"use client";

import React from "react";
import { UseFormRegister, FieldErrors, UseFormWatch } from "react-hook-form";
import { Token, Balance } from "@/types/types";
import { formatTokenBalance, getOnlyTokenSymbol } from "@/utils/utils";
import { formatUSDAmount } from "@/utils/tokenFormat";
import { BreathingValue } from "@/components/PendingDots";
import TokenIcon from "@/components/common/TokenIcon";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";

interface AmountInputFieldProps {
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  errors: FieldErrors<any>;
  fieldName?: string;

  selectedToken: Token | null;
  tokenBalances?: Map<
    string,
    { balance: Balance; price: number; isLoading: boolean }
  >;
  activeChain?: any;

  label?: string;
  placeholder?: string;
  showMaxButton?: boolean;
  onMaxClick?: () => void;
  errorMessage?: string;
  disabled?: boolean;

  getMaxAmount?: () => string;
}

export const AmountInputField: React.FC<AmountInputFieldProps> = ({
  register,
  watch,
  errors,
  fieldName = "amount",
  selectedToken,
  tokenBalances,
  activeChain,
  label = "Amount",
  placeholder = "0.00",
  showMaxButton = true,
  onMaxClick,
  errorMessage,
  disabled = false,
  getMaxAmount,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
    ];
    const isNumberKey = /^[0-9]$/.test(e.key);
    const isDecimalPoint = e.key === ".";

    if (allowedKeys.includes(e.key) || isNumberKey) {
      return;
    }
    if (isDecimalPoint) {
      const currentValue = (e.target as HTMLInputElement).value;
      if (currentValue.includes(".")) {
        e.preventDefault();
        return;
      }
      return;
    }

    e.preventDefault();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");
    const regex = /^\d*\.?\d*$/;

    if (!regex.test(pastedText)) {
      e.preventDefault();
    }
  };

  const renderUSDValue = (): string => {
    const amount = watch(fieldName);

    if (!selectedToken || !amount || isNaN(parseFloat(amount))) {
      return formatUSDAmount(0);
    }

    if (tokenBalances && activeChain) {
      const tokenKey = `${selectedToken.address.toLowerCase()}-${activeChain?.id}`;
      const tokenData = tokenBalances.get(tokenKey);
      const selectedTokenPrice = tokenData?.price || 0;

      const usdValue = Number(amount) * selectedTokenPrice;
      return formatUSDAmount(usdValue);
    }

    return formatUSDAmount(0);
  };

  const getDisplayMaxAmount = (): string => {
    if (getMaxAmount) {
      const maxAmount = getMaxAmount();
      return maxAmount;
    }

    if (!selectedToken || !activeChain || !tokenBalances) {
      return "0";
    }

    const tokenKey = `${selectedToken.address.toLowerCase()}-${activeChain?.id}`;
    const tokenData = tokenBalances.get(tokenKey);

    return tokenData?.balance?.formatted || "0";
  };

  const fieldError = errors[fieldName];
  const hasError = Boolean(fieldError || errorMessage);

  const errorText = errorMessage || (fieldError as any)?.message || "";

  return (
    <div>
      {/* MAX button */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <p className="text-[18px] font-bold">{label}</p>
        </div>
        {selectedToken && showMaxButton && onMaxClick && (
          <div className="text-right">
            <button
              type="button"
              onClick={onMaxClick}
              disabled={disabled}
              className="text-[#3E73C4] hover:underline font-normal text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              MAX
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          boxShadow: "0 2px 6px 0 rgba(0, 0, 0, 0.25)",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gridTemplateRows: "auto auto",
          gridTemplateAreas: `
            "top-left top-center top-right"
            "main-left main-center main-right"
          `,
          gap: "4px 8px",
        }}
        className={`w-full max-h-[77px] md:max-h-[75px] bg-[#161C27] pl-5 py-2 pr-[10px] rounded-lg border transition-all duration-200 ${
          hasError
            ? "border-[#FFC700]"
            : "border-[#535E73] hover:border-[#3E73C4] focus-within:border-[#3E73C4]"
        } ${disabled ? "opacity-50" : ""}`}
      >
        {/* Available Balance */}
        <div
          style={{ gridArea: "top-left" }}
          className="flex items-center text-sm text-[#535E73]"
        >
          {selectedToken && (
            <span>
              Available:{" "}
              {formatTokenBalance(getDisplayMaxAmount(), selectedToken.symbol)}
            </span>
          )}
        </div>

        <div
          style={{ gridArea: "top-center" }}
          className="flex items-center justify-center"
        ></div>

        {/* USD Value */}
        <div
          style={{ gridArea: "top-right" }}
          className="flex justify-end items-start text-sm"
        >
          <BreathingValue
            value={renderUSDValue()}
            isBreathing={false}
            className="text-[#535E73]"
          />
        </div>

        {/* Input Field */}
        <div style={{ gridArea: "main-left" }} className="flex">
          <input
            type="text"
            inputMode="decimal"
            placeholder={placeholder}
            disabled={disabled}
            onKeyDown={handleKeyPress}
            onPaste={handlePaste}
            {...register(fieldName)}
            className="text-white text-2xl bg-transparent border-none outline-none placeholder-[#535E73] w-full disabled:cursor-not-allowed"
          />
        </div>

        <div
          style={{ gridArea: "main-center" }}
          className="flex items-center justify-center"
        ></div>

        {/* Token Info */}
        <div
          style={{ gridArea: "main-right" }}
          className="flex items-center justify-end"
        >
          {selectedToken ? (
            <div className="flex items-center">
              <div className="md:mr-2 relative flex-none w-5 h-5 border border-white rounded-full bg-[#10B981]">
                <TokenIcon
                  token={selectedToken}
                  icon={selectedToken.imgURL}
                  imageSize="w-5 h-5"
                />
              </div>
              <p className="font-normal text-base leading-none text-white">
                {getOnlyTokenSymbol(selectedToken.symbol)}
              </p>
            </div>
          ) : (
            <div className="text-[#535E73] text-sm">Select token first</div>
          )}
        </div>
      </div>

      {/* Error message */}
      {hasError && (
        <div className="flex gap-1 items-center mt-2 text-[#FFC700]">
          <ErrorInputIcon width={16} height={16} className="text-[#FFC700]" />
          <p className="text-[12px] font-normal">{errorText}</p>
        </div>
      )}
    </div>
  );
};
