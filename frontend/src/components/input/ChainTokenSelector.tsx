"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Token, VaultData } from "@/types/types";
import { Chain } from "viem";
import { useChainTokenModalStore } from "@/store/chainTokenModalStore";
import { getOnlyTokenSymbol } from "@/utils/utils";
import { useFundWalletStore } from "@/store/fundWalletStore";
import { DropdownList } from "../VaultsWrapper/components/DropdownList";
import { APPROVED_TOKENS } from "@/constants/chainConfig";

interface ChainTokenSelectorProps {
  onSelectToken: (token: Token) => void;
  selectedToken?: Token;
  selectedChain?: Chain | null;
  className?: string;
  vaultData?: VaultData;
  onClick?: () => void;
  onSelectChain: ((chain: Chain) => void) | undefined;
  onSelectChainAndToken: ((chain: Chain, token: Token) => void) | undefined;
  isFromTopUp?: boolean;
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
  isFromTopUp = false,
}: ChainTokenSelectorProps) {
  const { selectedChainFromModal, selectedTokenFromModal, openModal } =
    useChainTokenModalStore();
  const { setStep, chain, currency, setCurrency } = useFundWalletStore();
  const [isOpenDropDown, setIsOpenDropdown] = useState(false);

  const currentChain = selectedChainFromModal || selectedChain;
  const currentToken = selectedToken;

  const availableTokens = useMemo(() => {
    if (!chain) return [];
    return APPROVED_TOKENS[chain.id];
  }, [chain]);

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
    if (isFromTopUp) {
      setIsOpenDropdown(true);
    } else {
      openModal(
        currentChain,
        currentToken ?? null,
        onSelectChain,
        onSelectChainAndToken,
        vaultData,
        false,
      );
    }
  };

  const tokenOptions = availableTokens.map((token) => {
    return {
      value: token.symbol,
      icon: token.imgURL,
    };
  });

  const handleSelectToken = (
    e:
      | React.MouseEvent<HTMLParagraphElement, MouseEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
    tokenSymbol: string,
  ) => {
    if (!isFromTopUp) return;

    e.preventDefault();
    e.stopPropagation();

    const selected = availableTokens.find(
      (token) => token.symbol === tokenSymbol,
    );

    if (selected) {
      onSelectToken(selected);
    }

    setIsOpenDropdown(false);
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
      <DropdownList
        handleSelectedOption={handleSelectToken}
        options={tokenOptions}
        selectedOption={currency?.symbol ?? ""}
        isShownList={isOpenDropDown}
        variant="token"
        isIconButton={false}
        width={150}
        needReset={false}
      />
    </div>
  );
}
