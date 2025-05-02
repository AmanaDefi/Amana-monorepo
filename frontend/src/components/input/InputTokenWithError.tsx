import React, { HTMLProps, useMemo } from "react";
import { Token, VaultData } from "@/types/types";
import ChainTokenSelector from "@/components/input/ChainTokenSelector";
import InputNumber from "@/components/input/InputNumber";
import {
  formatCurrency,
  formatBalance,
  getOnlyTokenSymbol,
  isZetachain,
} from "@/utils/utils";
import { useState, useEffect } from "react";
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

  // Function to handle token selection with chain switching
  const handleTokenSelection = (token: Token, chain: Chain) => {
    console.log("Selected token:", token.symbol, "on chain:", chain.name);
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

  // Add prettifyBalance function at the top
  const prettifyBalance = (balance: string): string => {
    const num = parseFloat(balance);
    if (isNaN(num)) return "0";
    
    // Format with appropriate decimals
    if (num >= 1000) return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (num >= 1) return num.toLocaleString('en-US', { maximumFractionDigits: 4 });
    return num.toLocaleString('en-US', { maximumFractionDigits: 6 });
  };

  return (
    <div className={disabled ? "opacity-50 cursor-default" : ""}>
      <div className="flex items-center justify-between mb-4">
        {captionText && (
          <div className="text-white text-start flex items-center gap-2">
            <p className="text-lg font-semibold">{captionText}</p>
            {isOutput && (
              <>
                <button id="output-amount-button" className="group">
                  <InformationCircleIcon className="w-5 h-5 text-customGray300 group-hover:text-white group-hover:transition-colors" />
                </button>
                <ResponsiveTooltip
                  id={"output-amount-button"}
                  content={
                    <p className="w-48">
                      {
                        "This is an estimated output amount. Actual amount may vary during transaction execution."
                      }
                    </p>
                  }
                />
              </>
            )}
            {inputMoreThanBalance && (
              <span className="text-red-500 ml-2">Input More than Balance</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          {!isOutput && isSlippageExceedingLimit && (
            <p className="hidden lg:block">Transaction settings</p>
          )}
          {!isOutput && (
            <SlippageSettingsModal setInputBalance={setInputBalance} />
          )}
        </div>
      </div>

      <div className="bg-customNeutral300 rounded-lg border border-customNeutral100 focus-within:border-teal-500 transition-colors shadow-sm hover:border-gray-500">
        <div className="flex items-stretch">
          <div className="flex-grow">
            <div className="text-sm text-gray-400 px-4 pt-3">
              Balance: {prettifyBalance(inputTokenbalance || "0")}
            </div>
            {isOutput ? (
              <div className="px-4 py-3">
                <span className="text-white text-lg font-medium">
                  {loadingOutputToken ? <PendingDots /> : props.value || "0.0"}
                </span>
              </div>
            ) : (
              <div className="mx-4 my-2 w-4/5">
                <InputNumber
                  disabled={disabled || !allowInput || isOutput}
                  value={props.value}
                  onChange={props.onChange}
                  {...props}
                  className="bg-transparent text-white text-lg font-medium py-3 px-4 focus:outline-none"
                />
              </div>
            )}
            
              {/* USD Equivalent for Input Amount */}
            <div className="flex justify-between items-center px-4 pb-3">
              <div className="text-gray-400 text-sm">
                {isOutput && loadingOutputToken ? (
                  <div className="flex items-center font-medium gap-1">
                    <p className="text-customGray400 text-sm">Calculating</p>
                    <PendingDots />
                  </div>
                ) : (
                  <div className="flex items-center">
                    {"$ " +
                    (isOutput
                      ? conversionOutput.outputAmountInUSDFormatted
                      : formatCurrency(Number(props.value || 0) * selectedTokenPrice))}
                    
                    {/* Add gas fee indicator for non-gas tank deposits */}
                    {isOutput && isDeposit && !vaultData.depositFeePaidFromGasTank && conversionOutput?.gasFeeInVaultAsset && Number(conversionOutput.gasFeeInVaultAsset) > 0 && (
                      <>
                        <button id="gas-fee-button" className="group ml-2">
                          <InformationCircleIcon className="w-4 h-4 text-customGray300 group-hover:text-white group-hover:transition-colors" />
                        </button>
                        <ResponsiveTooltip
                          id={"gas-fee-button"}
                          content={
                            <p className="w-48">
                              This output includes a deposit gas fee of {conversionOutput.gasFeeInETH} ETH (~${conversionOutput.gasFeeInUSD}) which will be deducted from your deposit.
                            </p>
                          }
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
              {!isOutput && (
                <button
                  type="button"
                  onClick={onMaxClick}
                  disabled={disabled}
                  className="text-xs px-2 py-1 bg-gradient-to-r from-teal-700 to-teal-500 text-white rounded hover:from-teal-600 hover:to-teal-400 active:from-teal-700 active:to-teal-500 transition-colors focus:outline-none disabled:opacity-50"
                >
                  MAX
                </button>
              )}
             
            </div>
          </div>
         
            <div className="border-l border-customNeutral100 flex items-center flex-col justify-center px-2 gap-2">
              {showTokenSelector ? (
                <><span className="text-white text-lg font-bold">
Select Token
              </span><ChainTokenSelector
                  selectedToken={selectedToken}
                  onSelectToken={handleTokenSelection}
                  className="w-full justify-end"
                  vaultData={vaultData} /></>
              ) : (
                    <div className="flex items-center bg-[#7c7a85] p-2 rounded-lg m-2">
                  <div className="md:mr-2 relative flex-none w-5 h-5">
                    <TokenIcon
                      token={selectedToken as Token}
                      icon={selectedToken?.imgURL}
                      imageSize="w-5 h-5" />
                  </div>
                  <p className="font-medium text-lg leading-none text-white">
                    {selectedToken?.symbol}
                  </p>
                </div>
              )}
            </div>
        </div>
      </div>

      {errorMessage && <p className="text-red-500 text-sm mt-1">{errorMessage}</p>}
    </div>
  );
}
