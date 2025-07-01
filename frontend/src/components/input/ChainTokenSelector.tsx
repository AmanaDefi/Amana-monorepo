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
  onSelectChain: ((chain: Chain) => void) | undefined;
  onSelectChainAndToken: ((chain: Chain, token: Token) => void) | undefined;
}

export default function ChainTokenSelector({
  onSelectToken,
  selectedToken,
  selectedChain,
  className = "",
  vaultData,
  onClick,
  onSelectChain,
  onSelectChainAndToken,
}: ChainTokenSelectorProps) {
  const { selectedChainFromModal, selectedTokenFromModal, openModal } =
    useChainTokenModalStore();

  const currentChain = selectedChainFromModal || selectedChain;
  const currentToken = selectedToken;

  if (!currentChain) {
    return (
      <div className={`flex items-center opacity-50 ${className}`}>
        <span className="text-gray-400">Select chain first</span>
      </div>
    );
  }

  const handleOpenModal = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    openModal(
      currentChain,
      currentToken ?? null,
      onSelectChain,
      onSelectChainAndToken,
      vaultData,
      false,
    );
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={(e) => handleOpenModal(e)}
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
