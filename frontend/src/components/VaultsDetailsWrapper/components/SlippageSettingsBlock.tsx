import React from "react";
import SlippageSettingsDropdown from "@/components/modal/SlippageSettingsDropdown";
import { useSlippage } from "@/hooks/hooks";

interface SlippageSettingsBlockProps {
  setInputBalance: Function;
  vaultId: string;
  showTransactionSettings?: boolean;
  className?: string;
}

export default function SlippageSettingsBlock({
  setInputBalance,
  vaultId,
  showTransactionSettings = false,
  className = "",
}: SlippageSettingsBlockProps): JSX.Element {
  const { slippageValue, isAuto } = useSlippage();

  const displayValue = isAuto ? "Auto" : `${slippageValue}%`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showTransactionSettings && (
        <p className="hidden lg:block">Transaction settings</p>
      )}
      <div className="flex flex-row gap-2">
        <p className="w-[256px]">Estimated slippage value: {displayValue}</p>
        <SlippageSettingsDropdown
          setInputBalance={setInputBalance}
          vaultId={vaultId}
        />
      </div>
    </div>
  );
}
