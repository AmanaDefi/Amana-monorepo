import React from "react";
import SlippageSettingsDropdown from "@/components/modal/SlippageSettingsDropdown";

interface SlippageSettingsBlockProps {
  setInputBalance: Function;
  vaultId: string;
  showTransactionSettings?: boolean;
  slippageValue?: string;
  className?: string;
}

export default function SlippageSettingsBlock({
  setInputBalance,
  vaultId,
  showTransactionSettings = false,
  slippageValue = "0.1%",
  className = "",
}: SlippageSettingsBlockProps): JSX.Element {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showTransactionSettings && (
        <p className="hidden lg:block">Transaction settings</p>
      )}
      <div className="flex flex-row gap-2">
        <p>Estimated slippage value: {slippageValue}</p>
        <SlippageSettingsDropdown
          setInputBalance={setInputBalance}
          vaultId={vaultId}
        />
      </div>
    </div>
  );
}
