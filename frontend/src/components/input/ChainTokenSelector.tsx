"use client";

import React, { useCallback, useMemo, useState } from "react";
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
  onOpenModal?: () => void;
  isFromTopUp?: boolean;
  onSelectChain?: (chain: Chain) => void;
  onSelectChainAndToken?: (chain: Chain, token: Token) => void;
}

export default function ChainTokenSelector({
  selectedToken,
  selectedChain,
  className = "",
  onOpenModal,
  isFromTopUp = false,
  onSelectChain,
  onSelectChainAndToken,
  vaultData,
  onClick,
}: ChainTokenSelectorProps) {
  const { selectedChainFromModal, selectedTokenFromModal, openModal } =
    useChainTokenModalStore();

  const currentChain = selectedChainFromModal || selectedChain;
  const currentToken = vaultData?.inputToken || selectedToken;

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
        className={`flex items-center text-xs md:text-sm text-white ${className}`}
      >
        <div className="flex flex-row gap-1 md:gap-2">
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
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleClick}
        className="flex items-center gap-1 md:gap-2 rounded-lg text-white"
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
