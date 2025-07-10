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
}: SlippageSettingsBlockProps): JSX.Element {
  const { slippageValue, isAuto } = useSlippage(vaultId);

  const displayValue = isAuto ? "Auto" : `${slippageValue}%`;

  return (
    <SlippageSettingsDropdown
      setInputBalance={setInputBalance}
      vaultId={vaultId}
    />
  );
}
