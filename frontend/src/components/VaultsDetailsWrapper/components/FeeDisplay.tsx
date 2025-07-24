"use client";

import { VaultData } from "@/types/types";
import { ConversionOutput } from "@/components/VaultInputs";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";
import { InfoBlock } from "@/components/VaultsWrapper/components/InfoBlock.tsx";
import { formatUSDAmount } from "@/utils/tokenFormat";
import { BreathingValue } from "@/components/PendingDots";

interface FeeDisplayProps {
  isDeposit: boolean;
  vaultData: VaultData;
  conversionOutput: ConversionOutput;
  debouncedInputBalance: { value: bigint };
  performanceFee?: number;
  isBreathing?: boolean;
}

interface SwapSlippageProps {
  conversionOutput: ConversionOutput;
  isVisible?: boolean;
  className?: string;
  isBreathing?: boolean;
}

export const SwapSlippageBlock: React.FC<SwapSlippageProps> = ({
  conversionOutput,
  isVisible = true,
  className = "",
  isBreathing = false,
}) => {
  const swapSlippageUSDValue = parseFloat(
    conversionOutput.swapSlippageUSD?.replace(/[^0-9.]/g, "") || "0"
  );

  if (
    !isVisible ||
    !conversionOutput.swapSlippageUSD ||
    conversionOutput.swapSlippagePercentage === undefined ||
    conversionOutput.swapSlippagePercentage === 0 ||
    swapSlippageUSDValue < 0.01
  ) {
    return null;
  }

  return (
    <div
      className={`flex justify-between items-center py-1 text-white mb-4 text-[14px] md:text-base ${className}`}
    >
      <span className="text-white flex items-center gap-1">
        Swap Slippage:
        <InfoBlock>
          <ErrorInputIcon
            width={14}
            height={14}
            className="ml-1 cursor-pointer fill-[#1B46E0]"
          />
          <div className="text-xs text-white mt-2">
            The difference between the expected and actual amount received when swapping your input token to the vault&apos;s asset. This occurs when your input token differs from the vault&apos;s asset token.
          </div>
        </InfoBlock>
      </span>
      <BreathingValue
        value={
          <span className="font-normal flex-row gap-1">
            {conversionOutput.swapSlippagePercentage.toFixed(2)}%{" "}
            <span className="font-medium">({conversionOutput.swapSlippageUSD})</span>
          </span>
        }
        isBreathing={isBreathing}
      />
    </div>
  );
};

interface DepositSlippageProps {
  conversionOutput: ConversionOutput;
  isVisible?: boolean;
  className?: string;
  isBreathing?: boolean;
}

export const DepositSlippageBlock: React.FC<DepositSlippageProps> = ({
  conversionOutput,
  isVisible = true,
  className = "",
  isBreathing = false,
}) => {
  const depositSlippageUSDValue = parseFloat(
    conversionOutput.depositSlippageUSD?.replace(/[^0-9.]/g, "") || "0"
  );

  if (
    !isVisible ||
    !conversionOutput.depositSlippageUSD ||
    conversionOutput.depositSlippagePercentage === undefined ||
    conversionOutput.depositSlippagePercentage === 0 ||
    depositSlippageUSDValue < 0.01
  ) {
    return null;
  }

  return (
    <div
      className={`flex justify-between items-center py-1 text-white mb-4 text-[14px] md:text-base ${className}`}
    >
      <span className="text-white flex items-center gap-1">
        Deposit Slippage:
        <InfoBlock>
          <ErrorInputIcon
            width={14}
            height={14}
            className="ml-1 cursor-pointer fill-[#1B46E0]"
          />
          <div className="text-xs text-white mt-2">
            The difference between the amount sent to the strategy and the final output amount. This occurs due to the strategy&apos;s share calculation and any fees charged by the underlying yield source.
          </div>
        </InfoBlock>
      </span>
      <BreathingValue
        value={
          <span className="font-normal flex-row gap-1">
            {conversionOutput.depositSlippagePercentage.toFixed(2)}%{" "}
            <span className="font-medium">({conversionOutput.depositSlippageUSD})</span>
          </span>
        }
        isBreathing={isBreathing}
      />
    </div>
  );
};

// Keep the old ExpectedSlippageBlock for backward compatibility but mark as deprecated
// interface ExpectedSlippageProps {
//   conversionOutput: ConversionOutput;
//   isVisible?: boolean;
//   className?: string;
//   isBreathing?: boolean;
// }

// export const ExpectedSlippageBlock: React.FC<ExpectedSlippageProps> = ({
//   conversionOutput,
//   isVisible = true,
//   className = "",
//   isBreathing = false,
// }) => {
//   if (
//     !isVisible ||
//     conversionOutput.slippageActualValue === null ||
//     !conversionOutput.slippageAmountInUSDFormatted
//   ) {
//     return null;
//   }

//   const formattedUSDSlippage = conversionOutput.slippageAmountInUSDFormatted;

//   return (
//     <div
//       className={`flex justify-between items-center py-1 text-white mb-6 text-[14px] md:text-base ${className}`}
//     >
//       <span className="text-white flex items-center gap-1">
//         Expected slippage:
//         <InfoBlock>
//           <ErrorInputIcon
//             width={14}
//             height={14}
//             className="ml-1 cursor-pointer fill-[#1B46E0]"
//           />
//           <div className="text-xs text-white mt-2 flex flex-col gap-1">
//             <div className="flex justify-between">
//               <span>Swap Slippage:</span> 
//               <span>
//               {conversionOutput.swapSlippagePercentage?.toFixed(2)}% ({conversionOutput.swapSlippageUSD})
//               </span>
//             </div>
//             <div className="flex justify-between">
//               <span>Deposit Slippage:</span> 
//               <span>
//               {conversionOutput.depositSlippagePercentage?.toFixed(2)}% ({conversionOutput.depositSlippageUSD})
//               </span>
//             </div>
//             <div className="flex justify-between">
//               <span>Total Slippage:</span> 
//               <span>
//               {conversionOutput.slippageActualValue?.toFixed(2)}% ({conversionOutput.slippageAmountInUSDFormatted})
//               </span>
//             </div>
//             {/* <div className="flex justify-between">
//               <span>Total Loss:</span> 
//               <span>
//               {conversionOutput.totalLossPercentage?.toFixed(2)}% ({conversionOutput.totalLossUSD})
//               </span>
//             </div> */}
//           </div>
//         </InfoBlock>
//       </span>
//       <BreathingValue
//         value={
//           <span className="font-normal flex-row gap-1">
//             {conversionOutput.slippageActualValue.toFixed(2)}%{" "}
//             <span className="font-medium">({formattedUSDSlippage})</span>
//           </span>
//         }
//         isBreathing={isBreathing}
//       />
//     </div>
//   );
// };

interface NetDepositBlockProps {
  conversionOutput: ConversionOutput;
  vaultData: VaultData;
  debouncedInputBalance: { value: bigint };
  isDeposit: boolean;
  isVisible?: boolean;
  className?: string;
  isBreathing?: boolean;
}

export const NetDepositBlock: React.FC<NetDepositBlockProps> = ({
  conversionOutput,
  vaultData,
  debouncedInputBalance,
  isDeposit,
  isVisible = true,
  className = "",
  isBreathing = false,
}) => {
  if (
    !isVisible ||
    !isDeposit ||
    vaultData.depositFeePaidFromGasTank ||
    !conversionOutput.netDepositToVaultUSD ||
    Number(debouncedInputBalance.value) <= 0 ||
    parseFloat(conversionOutput.netDepositToVaultUSD.replace(/[^0-9.]/g, "") || "0") <= 0
  ) {
    return null;
  }

  return (
    <div
      className={`flex justify-between items-center py-1 text-white mb-4 text-[14px] md:text-base ${className}`}
    >
      <span className="mr-2 flex flex-row gap-1 items-center">
        Net Deposit to Vault:
        <InfoBlock isMiddle>
          {(() => {
            const inputUSD = parseFloat(
              conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, "") || "0"
            );
            const gasFeeUSD = parseFloat(
              conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, "") || "0"
            );
            const swapSlippageUSD = parseFloat(
              conversionOutput.swapSlippageUSD?.replace(/[^0-9.]/g, "") || "0"
            );
            const netDepositUSD = parseFloat(
              conversionOutput.netDepositToVaultUSD?.replace(/[^0-9.]/g, "") || "0"
            );

            return `Input amount (${formatUSDAmount(inputUSD)}) - Gas fee (${formatUSDAmount(gasFeeUSD)}) - Swap slippage (${formatUSDAmount(swapSlippageUSD)}) = Net deposit (${formatUSDAmount(netDepositUSD)})`;
          })()}
        </InfoBlock>
      </span>
      <BreathingValue
        value={conversionOutput.netDepositToVaultUSD}
        isBreathing={isBreathing}
        className="font-bold"
      />
    </div>
  );
};

export default function FeeDisplay({
  isDeposit,
  vaultData,
  conversionOutput,
  debouncedInputBalance,
  performanceFee = 0,
  isBreathing = false,
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

  // Calculate deposit fee percentage
  let depositFeePercentage = 0;
  const inputAmountUSD = Number(conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, ""));
  const gasFeeUSD = Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, ""));
  if (inputAmountUSD > 0 && gasFeeUSD > 0) {
    depositFeePercentage = (gasFeeUSD / inputAmountUSD) * 100;
  }

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
            <BreathingValue
              value={
                shouldShowDepositFee
                  ? `${depositFeePercentage.toFixed(2)}% (${conversionOutput.gasFeeInUSD})`
                  : shouldShowWithdrawalFee
                    ? `$${performanceFee}`
                    : "$0"
              }
              isBreathing={isBreathing}
              className="font-bold"
            />
          </span>
        </div>
      ) : null}


    </div>
  );
}
