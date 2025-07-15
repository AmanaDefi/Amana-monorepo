"use client";
import React, { HTMLProps, useMemo, useState } from "react";
import { Token, VaultData } from "@/types/types";
import ChainTokenSelector from "@/components/input/ChainTokenSelector";
import InputNumber from "@/components/input/InputNumber";
import { formatCurrency, getOnlyTokenSymbol } from "@/utils/utils";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import TokenIcon from "@/components/common/TokenIcon";
import { ConversionOutput } from "@/components/VaultInputs";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { Chain } from "viem";
import clsx from "clsx";
import { BreathingValue, MiniSpinner } from "../PendingDots";
import { useWallets } from "@privy-io/react-auth";

export type InputTokenWithErrorProps = {
  errorMessage?: string;
  onMaxClick: () => void;
  onSelectToken: (token: Token) => void;
  vaultData: VaultData;
  tokenList: Token[];
  selectedToken?: Token;
  inputTokenbalance?: string;
  captionText?: string;
  getToken?: Function;
  setInputBalance: Function;
  allowInput?: boolean;
  inputMoreThanBalance?: boolean;
  disabled?: boolean;
  isDeposit: boolean;
  userVaultBalance?: string;
  isOutput?: boolean;
  loadingOutputToken?: boolean;
  conversionOutput: ConversionOutput;
  isSlippageExceedingLimit?: boolean;
  selectedChain?: Chain | null;
  showFeeDisplay?: boolean;
  debouncedInputBalance?: { value: bigint };
  performanceFee?: number;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChain: ((chain: Chain) => void) | undefined;
  onSelectChainAndToken: ((chain: Chain, token: Token) => void) | undefined;
} & Omit<HTMLProps<HTMLInputElement>, "value" | "onChange">;

export default function InputTokenWithError({
  tokenList,
  selectedToken,
  inputTokenbalance,
  errorMessage,
  onMaxClick,
  onSelectToken,
  vaultData,
  captionText,
  allowInput,
  inputMoreThanBalance,
  disabled = false,
  isDeposit,
  isOutput,
  loadingOutputToken,
  conversionOutput,
  isSlippageExceedingLimit,
  setInputBalance,
  selectedChain,
  showFeeDisplay = false,
  debouncedInputBalance,
  performanceFee,
  value,
  onChange,
  onSelectChain,
  onSelectChainAndToken,
  ...props
}: InputTokenWithErrorProps): JSX.Element {
  const selectedTokenPrice = useTokenPriceBySymbol(selectedToken?.symbol);
  const { walletAddress } = useMultiChain();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const { wallets } = useWallets();
  const filteredWallets = wallets.filter(
    (wallet) => wallet.meta.id !== "app.phantom",
  );
  const activeAccount = filteredWallets[0];

  const isConnected = !!walletAddress;

  const showTokenSelector = useMemo(() => {
    return (
      ((isDeposit && !isOutput) || (!isDeposit && isOutput)) &&
      tokenList &&
      tokenList.length > 0 &&
      activeAccount?.walletClientType !== "privy"
    );
  }, [isDeposit, isOutput, tokenList, activeAccount]);

  const renderTopSection = () => {
    if (!isOutput && isDeposit) {
      return {
        leftText: "You send (min 0.0015)",
        showMaxButton: true,
        maxButtonPosition: "left",
      };
    }

    if (!isOutput && !isDeposit) {
      return {
        leftText: "",
        showMaxButton: true,
        maxButtonPosition: "left",
      };
    }

    if (isOutput && !isDeposit) {
      return {
        leftText: "You receive",
        showMaxButton: false,
        maxButtonPosition: null,
      };
    }

    if (isOutput && isDeposit) {
      return {
        leftText: "You receive",
        showMaxButton: false,
        maxButtonPosition: null,
      };
    }

    return {
      leftText: "",
      showMaxButton: false,
      maxButtonPosition: null,
    };
  };

  const renderUSDValue = () => {
    let usdValue: string;

    if (!isOutput) {
      usdValue = selectedToken
        ? formatCurrency(Number(value || 0) * selectedTokenPrice)
        : "0.00";
    } else {
      usdValue = isOutput
        ? conversionOutput.outputAmountInUSDFormatted
        : conversionOutput.finalConvertedAmountInUSDFormatted;
    }

    if (isOutput && loadingOutputToken) {
      const justifyClass = isDeposit ? "justify-end" : "justify-start";
      const spinnerSize = isDeposit ? 18 : 12;
      const height = isDeposit ? "h-9" : "h-5";

      return (
        <div className={clsx("flex items-center", height, justifyClass)}>
          <MiniSpinner size={spinnerSize} color="#3E73C4" />
        </div>
      );
    }

    return (
      <BreathingValue
        value={`$${usdValue}`}
        isBreathing={!isOutput && !!loadingOutputToken}
        className={shouldSwapValues ? "" : "text-[#535E73]"}
      />
    );
  };

  const renderMainValue = () => {
    if (isOutput) {
      const outputAmount = conversionOutput.outputAmountFormatted || "0.00";

      if (loadingOutputToken) {
        const justifyClass = isDeposit ? "justify-end" : "justify-start";
        const spinnerSize = isDeposit ? 12 : 18;
        const height = isDeposit ? "h-5" : "h-9";

        return (
          <div className={clsx("flex items-center", height, justifyClass)}>
            <MiniSpinner size={spinnerSize} color="#3E73C4" />
          </div>
        );
      }
      // Hide shares number from UI display only - return empty span
      return <span></span>;
    }

    return (
      <BreathingValue
        value={
          <InputNumber
            {...props}
            value={value}
            onChange={onChange}
            disabled={disabled}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
          />
        }
        isBreathing={!!loadingOutputToken}
      />
    );
  };

  const shouldSwapValues = isOutput && isDeposit;

  const topSectionData = renderTopSection();

  return (
    <div className={disabled ? "opacity-50 cursor-default" : ""}>
      {captionText && (
        <p className="text-white text-sm lg:text-lg font-medium mb-2">
          {captionText}
        </p>
      )}
      <div className="relative flex w-full flex-col">
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
          className={clsx(
            "w-full max-h-[77px] md:max-h-[75px] bg-[#161C27] pl-5 py-2 pr-[10px] rounded-lg border transition-all duration-200",
            errorMessage ? "border-red-500" : "border-[#535E73]",
            "hover:border-[#3E73C4]",
            isInputFocused && "border-[#3E73C4]",
          )}
        >
          <div
            style={{ gridArea: "top-left" }}
            className="flex items-center text-sm text-[#535E73]"
          >
            <span className="text-xs md:text-sm whitespace-nowrap mr-2">
              {topSectionData.leftText}
            </span>
            {topSectionData.showMaxButton &&
              topSectionData.maxButtonPosition === "left" && (
                <button
                  onClick={onMaxClick}
                  className={`text-[#3E73C4] hover:underline font-normal text-xs md:text-sm text-start ${!isDeposit ? "-ml-2" : ""}`}
                >
                  MAX
                </button>
              )}
          </div>

          <div
            style={{ gridArea: "top-center" }}
            className="flex items-center justify-center"
          ></div>

          <div
            style={{ gridArea: "top-right" }}
            className={
              shouldSwapValues
                ? "flex justify-end items-start text-xs md:text-sm"
                : "flex justify-end items-start text-xs md:text-sm"
            }
          >
            {shouldSwapValues ? (
              <p className="group-hover/max:text-white text-[#535E73]">
                {renderMainValue()}
              </p>
            ) : (
              <p className="group-hover/max:text-white">{renderUSDValue()}</p>
            )}
          </div>

          <div
            style={{ gridArea: "main-left" }}
            className={shouldSwapValues ? "flex" : "flex "}
          >
            {shouldSwapValues ? (
              loadingOutputToken ? (
                <div className="flex items-center h-9 justify-start">
                  <MiniSpinner size={18} color="#3E73C4" />
                </div>
              ) : (
                <span
                  className={`text-white text-2xl ${conversionOutput.outputAmountInUSDFormatted && conversionOutput.outputAmountInUSDFormatted !== "0.00" ? "font-medium" : "font-normal"}`}
                >
                  {conversionOutput.outputAmountInUSDFormatted || "0.00"}
                </span>
              )
            ) : (
              <span className="text-white text-2xl">{renderMainValue()}</span>
            )}
          </div>

          <div
            style={{ gridArea: "main-center" }}
            className="flex items-center justify-center"
          ></div>

          <div
            style={{ gridArea: "main-right" }}
            className="flex items-center justify-end"
          >
            {showTokenSelector ? (
              <ChainTokenSelector
                selectedToken={selectedToken}
                selectedChain={selectedChain}
                onSelectToken={onSelectToken}
                vaultData={vaultData}
                className="justify-end"
                onSelectChain={onSelectChain}
                onSelectChainAndToken={onSelectChainAndToken}
              />
            ) : (
              <div className="flex items-center flex-row gap-1 md:gap-2">
                <div className="relative flex-none w-5 h-5 border border-white rounded-full bg-[#10B981]">
                  <TokenIcon
                    token={selectedToken as Token}
                    icon={selectedToken?.imgURL}
                    imageSize="w-5 h-5"
                  />
                </div>
                <p className="font-normal text-base leading-none text-white ">
                  {selectedToken?.symbol
                    ? getOnlyTokenSymbol(selectedToken.symbol)
                    : ""}
                </p>
              </div>
            )}
          </div>
        </div>

        {errorMessage && (
          <p
            className={`${
              !isOutput &&
              "absolute bottom-0 left-0 translate-y-full lg:translate-y-full"
            } pt-0.5 lg:pt-1 text-red-500 leading-6`}
          >
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
