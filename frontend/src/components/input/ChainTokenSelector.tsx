"use client";

import React from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Token, VaultData } from "@/types/types";
import { Chain } from "viem";
import { useChainTokenModalStore } from "@/store/chainTokenModalStore";
import { getOnlyTokenSymbol } from "@/utils/utils";

interface ChainTokenSelectorProps {
  onSelectToken: (token: Token) => void;
  selectedToken?: Token;
  selectedChain?: Chain | null;
  className?: string;
  vaultData?: VaultData;
  onClick?: () => void;
}

export default function ChainTokenSelector({
  onSelectToken,
  selectedToken,
  selectedChain,
  className = "",
  vaultData,
  onClick,
}: ChainTokenSelectorProps) {
  const { selectedChainFromModal, selectedTokenFromModal } =
    useChainTokenModalStore();

  const currentChain = selectedChainFromModal || selectedChain;
  const currentToken = selectedTokenFromModal || selectedToken;

  if (!currentChain) {
    return (
      <div className={`flex items-center opacity-50 ${className}`}>
        <span className="text-gray-400">Select chain first</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={onClick}
        className="flex items-center gap-1 md:gap-2 rounded-lg text-white"
      >
        {currentToken ? (
          <>
            <img
              src={currentToken.imgURL}
              alt={currentToken.symbol}
              width={20}
              height={21}
              className="rounded-full border border-white"
            />
            <p className="max-w-[82px] md:max-w-[200px] truncate">
              {getOnlyTokenSymbol(currentToken.symbol)}
            </p>
          </>
        ) : (
          <p className="max-w-[82px] md:max-w-[200px] truncate">Select token</p>
        )}
      </button>
    </div>
  );
}
