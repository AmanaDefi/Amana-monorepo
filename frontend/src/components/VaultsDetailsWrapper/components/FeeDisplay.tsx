"use client";

import { VaultData } from "@/types/types";
import { ConversionOutput } from "@/components/VaultInputs";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";
import { InfoBlock } from "@/components/VaultsWrapper/components/InfoBlock.tsx";
import { formatUSDAmount } from "@/utils/tokenFormat";

interface FeeDisplayProps {
  isDeposit: boolean;
  vaultData: VaultData;
  conversionOutput: ConversionOutput;
  debouncedInputBalance: { value: bigint };
  performanceFee?: number;
}

interface ExpectedSlippageProps {
  conversionOutput: ConversionOutput;
  isVisible?: boolean;
  className?: string;
}

export const ExpectedSlippageBlock: React.FC<ExpectedSlippageProps> = ({
  conversionOutput,
  isVisible = true,
  className = "",
}) => {
  if (
    !isVisible ||
    conversionOutput.slippageActualValue === null ||
    !conversionOutput.slippageAmountInUSDFormatted
  ) {
    return null;
  }

  const formattedUSDSlippage = conversionOutput.slippageAmountInUSDFormatted;

  return (
    <div
      className={`flex justify-between items-center py-1 text-white mb-6 text-[14px] md:text-base ${className}`}
    >
      <span className="text-white flex items-center gap-1">
        Expected slippage:
        <InfoBlock>
          <ErrorInputIcon
            width={14}
            height={14}
            className="ml-1 cursor-pointer fill-[#1B46E0]"
          />
          <div className="text-xs text-white mt-2 flex flex-col gap-1">
            <div className="flex justify-between">
              <span>Swap Slippage:</span> 
              <span>
              {conversionOutput.swapSlippagePercentage?.toFixed(2)}% ({conversionOutput.swapSlippageUSD})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Deposit Slippage:</span> 
              <span>
              {conversionOutput.depositSlippagePercentage?.toFixed(2)}% ({conversionOutput.depositSlippageUSD})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Slippage:</span> 
              <span>
              {conversionOutput.slippageActualValue?.toFixed(2)}% ({conversionOutput.slippageAmountInUSDFormatted})
              </span>
            </div>
            {/* <div className="flex justify-between">
              <span>Total Loss:</span> 
              <span>
              {conversionOutput.totalLossPercentage?.toFixed(2)}% ({conversionOutput.totalLossUSD})
              </span>
            </div> */}
          </div>
        </InfoBlock>
      </span>
      <span className="font-normal flex-row gap-1">
        {conversionOutput.slippageActualValue.toFixed(2)}%{" "}
        <span className="font-medium">({formattedUSDSlippage}) </span>
      </span>
    </div>
  );
};

export default function FeeDisplay({
  isDeposit,
  vaultData,
  conversionOutput,
  debouncedInputBalance,
  performanceFee = 0,
}: FeeDisplayProps): JSX.Element {
  const isEthereumVault = !vaultData.depositFeePaidFromGasTank;

  const hasNonZeroGasFee =
    conversionOutput.gasFeeInInputToken &&
    Number(conversionOutput.gasFeeInInputToken) > 0;

  const shouldShowDepositFee = isDeposit && isEthereumVault && hasNonZeroGasFee;
  const shouldShowWithdrawalFee = !isDeposit && performanceFee > 0;

  const isDepositTooLow =
    isDeposit &&
    isEthereumVault &&
    debouncedInputBalance.value > 0n &&
    Number(
      conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, ""),
    ) < Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, ""));

  const netDepositValue = parseFloat(
    conversionOutput.netDepositToVaultUSD?.replace(/[^0-9.]/g, "") || "0",
  );

  return (
    <div>
      {isDepositTooLow && (
        <div className="bg-red-900/30 border border-red-500 py-2 px-4 rounded-lg mb-4 text-[14px] md:text-base mt-2 md:mt-0">
          <p className="text-red-400 font-medium">
            Your deposit amount is too low to cover the deposit gas fee.
          </p>
        </div>
      )}

      {shouldShowDepositFee || shouldShowWithdrawalFee ? (
        <div className="w-full text-[14px] md:text-base">
          <span className="flex flex-row items-center justify-between text-white py-1">
            <div className="flex items-center gap-2">
              <p>{isDeposit ? "Ethereum Deposit Fee" : "Withdrawal Fee"}</p>

              {shouldShowDepositFee && (
                <InfoBlock>
                  <ErrorInputIcon
                    width={14}
                    height={14}
                    className="fill-[#1B46E0]"
                  />
                  This fee is required for processing your deposit transaction
                  on the Ethereum network. It is deducted directly from your
                  deposit amount and is not covered by Amana.
                </InfoBlock>
              )}

              {shouldShowWithdrawalFee && (
                <InfoBlock isMiddle>
                  💡 {performanceFee}% deducted from the profit earned in the
                  vault.
                </InfoBlock>
              )}
            </div>
            <span className="font-bold">
              {shouldShowDepositFee
                ? `${conversionOutput.gasFeeInUSD}`
                : shouldShowWithdrawalFee
                  ? `$${performanceFee}`
                  : "$0"}
            </span>
          </span>
        </div>
      ) : null}

      {isDeposit &&
        !vaultData.depositFeePaidFromGasTank &&
        conversionOutput.netDepositToVaultUSD &&
        Number(debouncedInputBalance.value) > 0 &&
        netDepositValue > 0 && (
          <p className="text-white font-normal mt-4 text-start flex items-center text-[14px] md:text-base justify-between">
            <span className="mr-2 flex flex-row gap-1 items-center">
              Net Deposit to Vault: 
            <InfoBlock isMiddle>
              {(() => {
                const inputUSD = parseFloat(
                  conversionOutput.inputAmountInUSDFormatted?.replace(
                    /[^0-9.]/g,
                    "",
                  ) || "0",
                );
                const netDepositUSD = netDepositValue;
                const actualFeeUSD = inputUSD - netDepositUSD;

                return `Input amount (${formatUSDAmount(inputUSD)}) - Gas fee (${formatUSDAmount(actualFeeUSD)}) = Net deposit (${formatUSDAmount(netDepositUSD)})`;
              })()}
            </InfoBlock>
            </span>
            <span className="font-bold">
              {formatUSDAmount(netDepositValue)}
            </span>
          </p>
        )}
    </div>
  );
}
