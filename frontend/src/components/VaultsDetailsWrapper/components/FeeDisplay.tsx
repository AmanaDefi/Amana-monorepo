"use client";
import { InformationCircleIcon } from "@heroicons/react/24/solid";
import ResponsiveTooltip from "@/components/common/Tooltip";
import { getOnlyTokenSymbol } from "@/utils/utils";

import { VaultData } from "@/types/types";
import { ConversionOutput } from "@/components/VaultInputs";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";
import { InfoBlock } from "@/components/VaultsWrapper/components/InfoBlock.tsx";

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
      className={`flex justify-between items-center py-1 text-white mt-8 ${className}`}
    >
      <span className="text-white">Expected slippage:</span>
      <span className="font-normal flex-row gap-1">
        ({conversionOutput.slippageActualValue.toFixed(2)}%){" "}
        <span className="font-medium">{formattedUSDSlippage} </span>
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
  const hasValidGasFee =
    conversionOutput.gasFeeInVaultAsset &&
    Number(conversionOutput.gasFeeInVaultAsset) > 0 &&
    conversionOutput.gasFeeInETH &&
    conversionOutput.gasFeeInUSD;

  const isDepositTooLow =
    isDeposit &&
    isEthereumVault &&
    debouncedInputBalance.value > 0n &&
    Number(
      conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, ""),
    ) < Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, ""));

  return (
    <div>
      {isDeposit &&
        !vaultData.depositFeePaidFromGasTank &&
        conversionOutput.netDepositToVaultUSD &&
        Number(debouncedInputBalance.value) > 0 && (
          <p className="text-white font-bold mb-2 text-start flex items-center">
            <span>
              Net Deposit to Vault: ${conversionOutput.netDepositToVaultUSD}
            </span>
            <button id="net-deposit-breakdown" className="group ml-2">
              <InformationCircleIcon className="w-4 h-4 text-customGray300 group-hover:text-white transition-colors" />
            </button>
            <ResponsiveTooltip
              id={"net-deposit-breakdown"}
              content={
                <p className="w-60">
                  Input amount (${conversionOutput.inputAmountInUSDFormatted}) -
                  Gas fee (${conversionOutput.gasFeeInUSD}) = Net deposit ($
                  {conversionOutput.netDepositToVaultUSD})
                </p>
              }
            />
          </p>
        )}

      {isDepositTooLow && (
        <div className="bg-red-900/30 border border-red-500 py-2 px-4 rounded-lg mb-4">
          <p className="text-red-400 font-medium">
            Your deposit amount is too low to cover the deposit gas fee.
          </p>
        </div>
      )}

      <div className="w-full">
        <span className="flex flex-row items-center justify-between text-white py-1">
          <div className="flex items-center gap-2">
            <p>Fee</p>

            {isDeposit && isEthereumVault && hasValidGasFee && (
              <InfoBlock>
                <ErrorInputIcon
                  width={14}
                  height={14}
                  className="fill-[#1B46E0]"
                />
                This fee is required for processing your deposit transaction on
                the Ethereum network. It is deducted directly from your deposit
                amount and is not covered by Amana.
              </InfoBlock>
            )}

            {(!isDeposit || !isEthereumVault) && (
              <InfoBlock>
                💡 {performanceFee}% deducted from the profit earned in the
                vault.
              </InfoBlock>
            )}
          </div>
          <span className="font-bold">
            {isDeposit && isEthereumVault && hasValidGasFee
              ? `${conversionOutput.gasFeeInETH} ${getOnlyTokenSymbol("ETH")} (~$${conversionOutput.gasFeeInUSD})`
              : "0%"}
          </span>
        </span>
      </div>
    </div>
  );
}
