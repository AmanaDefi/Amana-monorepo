import React from "react";
import Link from "next/link";
import { VaultData } from "@/types/types";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";

interface VaultInformationContentProps {
  vaultData: VaultData;
  vaultExplorerBaseUrl: string;
  strategyExplorerBaseUrl: string;
}

const VaultInformationContent: React.FC<VaultInformationContentProps> = ({
  vaultData,
  vaultExplorerBaseUrl,
  strategyExplorerBaseUrl,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-white font-semibold text-base mb-2">
          {vaultData.name}
        </p>
        <p className="text-white/80 font-normal text-base leading-relaxed">
          {vaultData.des}
        </p>
      </div>
      <div>
        <p className="text-white font-semibold text-base mb-2">
          {vaultData.protocol.name}
        </p>
        <p className="text-white/80 font-normal text-base leading-relaxed">
          {vaultData.protocol.des}
        </p>
      </div>
      <div>
        <p className="text-white font-semibold text-base mb-2">
          {vaultData.protocol.network}
        </p>
        <p className="text-white/80 font-normal text-base leading-relaxed">
          {vaultData.protocol.netdes}
        </p>
      </div>
      <div>
        <p className="text-white font-semibold text-base mb-2">Vault Address</p>
        <Link
          href={`${vaultExplorerBaseUrl}/address/${vaultData.id}`}
          className="flex items-center gap-2 group text-white underline-offset-2 hover:underline hover:opacity-80 transition-opacity"
          target="_blank"
          rel="noopener noreferrer"
        >
          <p className="font-normal text-base break-all">{vaultData.id}</p>
          <ArrowTopRightOnSquareIcon className="w-4 h-4 flex-shrink-0" />
        </Link>
      </div>
      <div>
        <p className="text-white font-semibold text-base mb-2">
          Strategy Address
        </p>
        <Link
          href={`${strategyExplorerBaseUrl}/address/${vaultData.protocol.strategyAddress}`}
          className="flex items-center gap-2 group text-white underline-offset-2 hover:underline hover:opacity-80 transition-opacity"
          target="_blank"
          rel="noopener noreferrer"
        >
          <p className="font-normal text-base break-all">
            {vaultData.protocol.strategyAddress}
          </p>
          <ArrowTopRightOnSquareIcon className="w-4 h-4 flex-shrink-0" />
        </Link>
      </div>
      <div>
        <p className="text-white font-semibold text-base mb-2">Input Token</p>
        <p className="text-white/80 font-normal text-base">
          {vaultData.inputToken.symbol}
        </p>
      </div>
    </div>
  );
};

export default VaultInformationContent;
