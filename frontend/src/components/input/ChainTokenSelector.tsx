"use client";

import React from "react";
import { Token, VaultData } from "@/types/types";
import { Chain } from "viem";
import { getOnlyTokenSymbol } from "@/utils/utils";
import { useChainTokenModalStore } from "@/store/chainTokenModalStore";

interface ChainTokenSelectorProps {
  selectedToken?: Token;
  selectedChain?: Chain | null;
  className?: string;
  onOpenModal?: () => void;
  isFromTopUp?: boolean;
  onSelectToken?: (token: Token) => void;
  onSelectChain?: (chain: Chain) => void;
  onSelectChainAndToken?: (chain: Chain, token: Token) => void;
  vaultData?: VaultData;
  onClick?: () => void;
}

export default function ChainTokenSelector({
  selectedToken,
  selectedChain,
  className = "",
  onOpenModal,
  isFromTopUp = false,
  onSelectToken,
  onSelectChain,
  onSelectChainAndToken,
  vaultData,
  onClick,
}: ChainTokenSelectorProps) {
  const chainTokenModalStore = useChainTokenModalStore();

  const handleOpenModalLegacy = () => {
    chainTokenModalStore.openModal(
      selectedChain || null,
      selectedToken ?? null,
      onSelectChain,
      onSelectChainAndToken,
      vaultData,
      false,
    );
  };

  const currentChain = selectedChain;
  const currentToken = selectedToken;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    e.stopPropagation();

    if (onOpenModal) {
      onOpenModal();
      return;
    }
    if (onSelectChainAndToken || onSelectChain) {
      handleOpenModalLegacy();
      return;
    }

    if (onClick) {
      onClick();
    }
  };

  if (!currentChain) {
    return (
      <div
        className={`flex items-center opacity-50 text-xs md:text-sm ${className}`}
      >
        <span className="text-gray-400">Select chain</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleClick}
        className="flex items-center gap-1 md:gap-2 rounded-lg text-white hover:opacity-80 transition-opacity"
      >
        {currentToken ? (
          <>
            <img
              src={currentToken.imgURL}
              alt={currentToken.symbol}
              width={20}
              height={21}
              className="rounded-full border border-white bg-[#10B981]"
            />
            <p className="max-w-[82px] md:max-w-[200px] truncate">
              {getOnlyTokenSymbol(currentToken.symbol)}
            </p>
          </>
        ) : (
          <p className="max-w-[82px] md:max-w-[200px] truncate text-xs md:text-sm">
            Select token
          </p>
        )}
      </button>
    </div>
  );
}
