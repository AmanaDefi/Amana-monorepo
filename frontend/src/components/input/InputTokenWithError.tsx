'use client';
import React, { HTMLProps, useMemo, useState } from "react";
import { Token, VaultData } from "@/types/types";
import ChainTokenSelector from "@/components/input/ChainTokenSelector";
import InputNumber from "@/components/input/InputNumber";
import { formatCurrency } from "@/utils/utils";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import SlippageSettingsModal from "@/components/modal/SlippageSettingsModal";
import TokenIcon from "@/components/common/TokenIcon";
import PendingDots from "@/components/PendingDots";
import { ConversionOutput } from "@/components/VaultInputs";
import { InformationCircleIcon } from "@heroicons/react/24/solid";
import ResponsiveTooltip from "@/components/common/Tooltip";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { Chain } from "thirdweb";
import { formatTokenBalance } from "@/utils/utils";
import { InfoBlock } from "../VaultsWrapper/components/InfoBlock.tsx";
import clsx from "clsx";

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
  allowInput?: boolean;
  inputMoreThanBalance?: boolean;
  disabled?: boolean;
  isDeposit: Boolean;
  isOutput?: boolean;
  loadingOutputToken?: boolean;
  conversionOutput: ConversionOutput;
};

export default function InputTokenWithError({
  tokenList,
  selectedToken,
  inputTokenbalance,
  errorMessage,
  onMaxClick,
  onSelectToken,
  vaultData,
  captionText,
  getToken,
  allowInput,
  inputMoreThanBalance,
  disabled = false,
  isDeposit,
  isOutput,
  loadingOutputToken,
  conversionOutput,
  isSlippageExceedingLimit,
  setInputBalance,
  ...props
}: {
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
  isDeposit: Boolean;
  userVaultBalance?: string;
  isOutput?: boolean;
  loadingOutputToken?: boolean;
  conversionOutput: ConversionOutput;
  isSlippageExceedingLimit?: boolean;
} & HTMLProps<HTMLInputElement>): JSX.Element {
  const selectedTokenPrice = useTokenPriceBySymbol(selectedToken?.symbol);
  const { activeChain } = useMultiChain();
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Function to handle token selection with chain switching
  const handleTokenSelection = (token: Token) => {
    onSelectToken(token);
  };

  // Determine if token selection should be available
  const showTokenSelector = useMemo(() => {
    // Always show token selector if there are tokens available
    return tokenList && tokenList.length > 0;
  }, [tokenList]);

  // Format the balance with the appropriate number of decimal places
  const formattedTokenBalance = useMemo(() => {
    if (!inputTokenbalance || !selectedToken?.symbol) return "0";
    return formatTokenBalance(inputTokenbalance, selectedToken.symbol);
  }, [inputTokenbalance, selectedToken?.symbol]);

  return (
    <div className={disabled ? "opacity-50 cursor-default" : ""}>
      <div className="flex items-center gap-2">
        {!isOutput && isSlippageExceedingLimit && (
          <p className="hidden lg:block">Transaction settings</p>
        )}
        {!isOutput && (
          <div className="flex flex-row gap-2 mt-10 mb-[53px]">
            <p>Estimated slippage value: 0.1%</p>
            <SlippageSettingsModal
              setInputBalance={setInputBalance}
              vaultId={vaultData.id}
            />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mb-3">
        {captionText && (
          <div className="text-white text-start flex text-[18px] items-center gap-2">
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
        )}
      </div>
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
            {!isOutput && (
              <>
                <span>You send (min 0.0015)</span>
                <button
                  onClick={allowInput ? onMaxClick : undefined}
                  className="text-[#3E73C4] hover:underline font-normal"
                >
                  MAX
                </button>
              </>
            )}
            <p className="group-hover/max:text-white">
              {isDeposit && !isOutput ? (
                "$ " +
                (selectedToken
                  ? formatCurrency(
                      Number(inputTokenbalance || 0) * selectedTokenPrice,
                    )
                  : "0.00")
              ) : loadingOutputToken ? (
                <PendingDots />
              ) : (
                "$ " +
                (isOutput
                  ? conversionOutput.outputAmountInUSDFormatted
                  : conversionOutput.finalConvertedAmountInUSDFormatted)
              )}
            </p>
          </div>
          <div className="flex items-center justify-between mt-1">
            {isOutput ? (
              <span className="text-white text-2xl">
                {loadingOutputToken ? (
                  <PendingDots />
                ) : inputTokenbalance && Number(inputTokenbalance) !== 0 ? (
                  inputTokenbalance
                ) : (
                  " "
                )}
              </span>
            ) : (
              <InputNumber
                {...props}
                disabled={disabled}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
              />
            )}

            {/* <div
              className={`flex items-center ml-1 gap-2 group/max text-customGray300 ${
                allowInput && !isOutput
                  ? "group-hover/max:text-white cursor-pointer "
                  : ""
              }`}
              onClick={allowInput ? onMaxClick : () => {}}
            >
              <div
                className={`mb-1 ${
                  allowInput && !isOutput ? "group-hover/max:text-white" : ""
                }`}
              >
                
              </div>
              {
                <p
                  className={`${
                    allowInput && !isOutput ? "group-hover/max:text-white" : ""
                  }`}
                >
                  {inputTokenbalance ? formattedTokenBalance : "0"}
                </p>
              }
            </div> */}
            <div className="flex items-center">
              {showTokenSelector ? (
                <ChainTokenSelector
                  selectedToken={selectedToken}
                  onSelectToken={handleTokenSelection}
                  className="justify-end"
                  vaultData={vaultData}
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
