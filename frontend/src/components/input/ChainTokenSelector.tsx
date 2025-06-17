"use client";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Token, VaultData } from "@/types/types";
import { APPROVED_TOKENS } from "@/constants/chainConfig";
import { Chain } from "viem";

import { CheckTheTxIsInProgress } from "@/utils/localStorageUtils";
import { DropdownList } from "../VaultsWrapper/components/DropdownList";
import { warningToast } from "@/toasts/toastStyles";
import { useMultiChain } from "@/providers/MultiChainProvider";


interface ChainTokenSelectorProps {
  onSelectToken: (token: Token) => void;
  selectedToken?: Token;
  selectedChain?: Chain;
  className?: string;
  vaultData?: VaultData;
}

export default function ChainTokenSelector({
  onSelectToken,
  selectedToken,
  selectedChain,
  className = "",
  vaultData,
}: ChainTokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { walletAddress } = useMultiChain();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getTokensForChain = useCallback(
    (chain: Chain) => {
      if (chain.id === 7000 || chain.id === 7001) {
        return vaultData?.inputToken ? [vaultData.inputToken] : [];
      }
      return APPROVED_TOKENS[chain.id] || [];
    },
    [vaultData],
  );

  const availableTokens = useMemo(() => {
    if (!selectedChain) return [];
    return getTokensForChain(selectedChain);
  }, [selectedChain, getTokensForChain]);

  const handleSelectToken = (
    event:
      | React.MouseEvent<HTMLParagraphElement>
      | React.MouseEvent<HTMLButtonElement>,
    tokenSymbol: string,
  ) => {
    event.stopPropagation();
    event.preventDefault();

    if (vaultData?.id && CheckTheTxIsInProgress(vaultData.id)) return;

    const selected = availableTokens.find((t) => t.symbol === tokenSymbol);
    if (selected) {
      onSelectToken(selected);
      setIsOpen(false);
    }
  };

  if (!selectedChain) {
    return (
      <div className={`flex items-center opacity-50 ${className}`}>
        <span className="text-gray-400">Select chain first</span>
      </div>
    );
  }

  const options = availableTokens.map((token) => ({
    value: token.symbol,
    icon: token.imgURL,
  }));

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (vaultData?.id && CheckTheTxIsInProgress(vaultData.id)) return;
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 rounded-lg text-white"
      >
        {selectedToken ? (
          <>
            <img
              src={selectedToken.imgURL}
              alt={selectedToken.symbol}
              width={24}
              height={24}
              className="rounded-full"
            />
            <p >{selectedToken.symbol}</p>
          </>
        ) : (
          <span>Select Token</span>
        )}
      </button>

      <DropdownList
        variant="token"
        width={240}
        isIconButton={false}
        options={options}
        selectedOption={selectedToken?.symbol || ""}
        handleSelectedOption={handleSelectToken}
        isShownList={isOpen}
        needReset={false}
      />

    </div>
  );
}
