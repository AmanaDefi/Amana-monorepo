import React from "react";
import Link from "next/link";
import { Token, VaultData } from "@/types/types";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";

interface VaultInformationContentProps {
  vaultData: VaultData;
  vaultExplorerBaseUrl: string;
  strategyExplorerBaseUrl: string;
  walletAddress?: string;
  selectedToken?: Token;
  selectedChain?: any; 
}

const VaultInformationContent: React.FC<VaultInformationContentProps> = ({
  vaultData,
  vaultExplorerBaseUrl,
  strategyExplorerBaseUrl,
  walletAddress,
  selectedToken,
  selectedChain,
}) => {
 
  if (walletAddress) {
    const sourceToken =
      selectedToken && selectedChain
        ? `${selectedToken.symbol}.${selectedChain.name || "Unknown"}`
        : selectedToken
          ? selectedToken.symbol
          : "your selected token";

    const targetToken = `${vaultData.inputToken.symbol}.${vaultData.protocol.network}`;

    return (
      <div className="space-y-4">
        <p className="text-white font-normal text-base leading-relaxed">
          We take your deposit and swap it from {sourceToken} to {targetToken} -
          afterwards, we add it to the {vaultData.protocol.name} and earn yield
          for you. Verify the Pool{" "}
          <Link
            href={`${strategyExplorerBaseUrl}/address/${vaultData.protocol.strategyAddress}`}
            className="text-white font-bold underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            here
          </Link>
        </p>
        <p className="text-white/80 font-normal text-base leading-relaxed">
          You can harvest your yield whenever you want.
        </p>
      </div>
    );
  }

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
