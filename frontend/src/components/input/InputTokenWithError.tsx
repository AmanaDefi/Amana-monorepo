"use client";
import React, { HTMLProps, useMemo, useState } from "react";
import { Token, VaultData } from "@/types/types";
import ChainTokenSelector from "@/components/input/ChainTokenSelector";
import InputNumber from "@/components/input/InputNumber";
import { formatCurrency } from "@/utils/utils";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import TokenIcon from "@/components/common/TokenIcon";
import PendingDots from "@/components/PendingDots";
import { ConversionOutput } from "@/components/VaultInputs";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { InfoBlock } from "../VaultsWrapper/components/InfoBlock.tsx";
import { Chain } from "viem";
import clsx from "clsx";
import SlippageSettingsBlock from "../VaultsDetailsWrapper/components/SlippageSettingsBlock";
import FeeDisplay from "../VaultsDetailsWrapper/components/FeeDisplay";

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
} & HTMLProps<HTMLInputElement>;

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
  ...props
}: InputTokenWithErrorProps): JSX.Element {
  const selectedTokenPrice = useTokenPriceBySymbol(selectedToken?.symbol);
  const { walletAddress } = useMultiChain();
  const [isInputFocused, setIsInputFocused] = useState(false);

  const isConnected = !!walletAddress;

  const showTokenSelector = useMemo(() => {
    return (
      ((isDeposit && !isOutput) || (!isDeposit && isOutput)) &&
      tokenList &&
      tokenList.length > 0 &&
      selectedChain
    );
  }, [isDeposit, isOutput, tokenList, selectedChain]);

  const renderTopSection = () => {
    if (!isOutput && isDeposit) {
      return (
        <>
          <span>You send (min 0.0015)</span>
          <button
            onClick={allowInput ? onMaxClick : undefined}
            className="text-[#3E73C4] hover:underline font-normal"
          >
            MAX
          </button>
        </>
      );
    }

    if (!isOutput && !isDeposit) {
      return (
        <>
          <button
            onClick={allowInput ? onMaxClick : undefined}
            className="text-[#3E73C4] hover:underline font-normal"
          >
            MAX
          </button>
          <span></span>
        </>
      );
    }

    if (isOutput && !isDeposit) {
      return (
        <>
          <span>You receive</span>
          <span></span>
        </>
      );
    }

    return null;
  };

  const renderUSDValue = () => {
    if (loadingOutputToken) {
      return <PendingDots />;
    }

    if (!isOutput) {
      return (
        "$ " +
        (selectedToken
          ? formatCurrency(Number(inputTokenbalance || 0) * selectedTokenPrice)
          : "0.00")
      );
    }

    return (
      "$ " +
      (isOutput
        ? conversionOutput.outputAmountInUSDFormatted
        : conversionOutput.finalConvertedAmountInUSDFormatted)
    );
  };

  const renderMainValue = () => {
    if (isOutput) {
      if (loadingOutputToken) {
        return <PendingDots />;
      }

      return conversionOutput.outputAmountFormatted &&
        Number(conversionOutput.outputAmountFormatted) !== 0
        ? conversionOutput.outputAmountFormatted
        : " ";

    }

    return (
      <InputNumber
        {...props}
        disabled={disabled}
        onFocus={() => setIsInputFocused(true)}
        onBlur={() => setIsInputFocused(false)}
      />
    );
  };

  return (
    <div className={disabled ? "opacity-50 cursor-default" : ""}>
      {isOutput && isConnected && isDeposit && (
        <div className="mb-10">
          <SlippageSettingsBlock
            setInputBalance={setInputBalance}
            vaultId={vaultData.id}
            showTransactionSettings={!isOutput && isSlippageExceedingLimit}
          />
        </div>
      )}

      {showFeeDisplay && debouncedInputBalance && (
        <div className="mb-10">
          <FeeDisplay
            isDeposit={isDeposit}
            vaultData={vaultData}
            conversionOutput={conversionOutput}
            debouncedInputBalance={debouncedInputBalance}
            performanceFee={performanceFee}
          />
        </div>
      )}

      {captionText && (
        <div className="flex items-center justify-between">
          <div className="text-white text-start flex text-[18px] font-bold items-center gap-2 mb-4">
            {captionText}
            {isOutput && (
              <InfoBlock isMiddle>
                💡 This is an estimated output amount. Actual amount may vary
                during transaction execution.
              </InfoBlock>
            )}
            {inputMoreThanBalance && (
              <span className="text-red-500 ml-2">Input More than Balance</span>
            )}
          </div>
        </div>
      )}

      <div className="relative flex w-full flex-col">
        <div
          style={{ boxShadow: "0 2px 6px 0 rgba(0, 0, 0, 0.25)" }}
          className={clsx(
            "w-full max-h-[75px] bg-[#161C27] pl-5 py-[11px] pr-[10px] rounded-lg border transition-all duration-200",
            errorMessage ? "border-red-500" : "border-[#535E73]",
            "hover:border-[#3E73C4]",
            isInputFocused && "border-[#3E73C4]",
          )}
        >
          <div className="flex items-center justify-between text-sm text-[#535E73]">
            {renderTopSection()}
            <p className="group-hover/max:text-white">{renderUSDValue()}</p>
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="text-white text-2xl">{renderMainValue()}</span>

            <div className="flex items-center">
              {showTokenSelector ? (
                <ChainTokenSelector
                  selectedToken={selectedToken}
                  selectedChain={selectedChain}
                  onSelectToken={onSelectToken}
                  vaultData={vaultData}
                  className="justify-end"
                />
              ) : (
                <div className="flex items-center">
                  <div className="md:mr-2 relative flex-none w-5 h-5">
                    <TokenIcon
                      token={selectedToken as Token}
                      icon={selectedToken?.imgURL}
                      imageSize="w-5 h-5"
                    />
                  </div>
                  <p className="font-medium text-lg leading-none text-white">
                    {selectedToken?.symbol}
                  </p>
                </div>
              )}
            </div>
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
