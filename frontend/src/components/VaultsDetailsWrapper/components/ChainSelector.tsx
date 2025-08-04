"use client";
import React from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Chain } from "viem";
import {
  APPROVED_TOKENS,
  CHAIN_ICONS,
  CHAIN_ID,
  SUPPORTED_CHAINS,
} from "@/constants/chainConfig";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { CheckTheTxIsInProgress } from "@/utils/localStorageUtils";
import { CHAINS_ICONS_BUTTON } from "@/constants/tokens";
import { useChainTokenModalStore } from "@/store/chainTokenModalStore";
import { Token, VaultData } from "@/types/types";
import { useFundWalletStore } from "@/store/fundWalletStore";

interface ChainSelectorProps {
  selectedChain?: Chain | null;
  onSelectChain: (chain: Chain) => void;
  selectedToken?: Token;
  onSelectChainAndToken?: (chain: Chain, token: Token) => void;
  className?: string;
  vaultId?: string;
  isFromTopUp?: boolean;
  vaultData?: VaultData;
}

export default function ChainSelector({
  selectedChain,
  onSelectChain,
  selectedToken,
  onSelectChainAndToken,
  className = "",
  vaultId,
  isFromTopUp,
  vaultData,
}: ChainSelectorProps) {
  const {
    activeChain,
    walletAddress,
    activeEvmWallet: activeAccount,
  } = useMultiChain();

  const { openModal, setSelectedChainFromModal } = useChainTokenModalStore();
  const { setStep } = useFundWalletStore();

  const isTxInProgress = vaultId ? CheckTheTxIsInProgress(vaultId) : false;

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isTxInProgress) return;

    if (isFromTopUp) {
      setStep("selectChain");
    } else {
      openModal(
        selectedChain || null,
        selectedToken || null,
        onSelectChain,
        onSelectChainAndToken,
        vaultData,
        isFromTopUp,
      );
    }
  };

  const displayedChain = selectedChain || activeChain;

  const handleChainSelect = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    chainId: number,
  ) => {
    e.stopPropagation();
    e.preventDefault();

    if (isTxInProgress) return;

    const chainToSelect = SUPPORTED_CHAINS.find(
      (chain) => chain.id === chainId,
    );

    if (chainToSelect) {
      const tokens = APPROVED_TOKENS[chainId] ?? [];
      const defaultToken =
        tokens.find((token) => token.symbol === "USDC") || tokens[0];

      const tokenForZetaChain = vaultData?.inputToken;

      onSelectChain(chainToSelect);

      if (onSelectChainAndToken && defaultToken) {
        setSelectedChainFromModal(chainToSelect);
        if ((chainId === 7000 || chainId === 7001) && tokenForZetaChain) {
          onSelectChainAndToken(chainToSelect, tokenForZetaChain);
        } else {
          onSelectChainAndToken(chainToSelect, defaultToken);
        }
      }
    }
  };

  const chainIconsList = CHAINS_ICONS_BUTTON;

  if (activeAccount?.walletClientType === "privy" && !isFromTopUp) {
    return (
      <div className="font-gotham w-full max-h-[56px] bg-[#161C27] pl-4 pr-[19px] py-3 rounded-lg shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] flex flex-row justify-between items-center">
        <div className="flex items-center gap-4">
          <img
            src={CHAIN_ICONS[CHAIN_ID["zetachain"]]?.url}
            alt={"Zetachain"}
            className="w-[32px] h-[32px] rounded-full"
          />
          <p className="text-sm md:text-[16px] font-normal">{"ZetaChain"}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleOpenModal}
      className={`font-gotham w-full max-h-[56px] bg-[#161C27] pl-4 pr-[10px] md:pr-[19px] py-3 rounded-lg shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] flex flex-row justify-between items-center ${
        isTxInProgress
          ? "opacity-50 cursor-not-allowed"
          : "hover:cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-4">
        <img
          src={CHAIN_ICONS[displayedChain?.id ?? CHAIN_ID["zetachain"]]?.url}
          alt={displayedChain?.name ?? "Zetachain"}
          className="w-[32px] h-[32px] rounded-full"
        />

        <p className="text-sm md:text-[16px] font-normal">
          {displayedChain?.name || "ZetaChain"}
        </p>
      </div>

      <div className="relative">
        <div
          className={`flex items-center justify-between gap-2 md:gap-4 py-[6px] ${className} ${
            isTxInProgress
              ? "cursor-not-allowed"
              : walletAddress &&
                  activeAccount?.walletClientType === "privy" &&
                  !isFromTopUp
                ? ""
                : "cursor-pointer"
          }`}
        >
          <div className="flex items-center -space-x-3 md:-space-x-2">
            {chainIconsList.map((icon, index) => (
              <button
                onClick={(e) => handleChainSelect(e, icon.id)}
                key={icon.symbol}
                disabled={isTxInProgress}
                className={`w-[30px] h-[30px] rounded-full overflow-hidden transition-transform duration-200 relative border border-white bg-[#3E73C4] ${
                  isTxInProgress
                    ? "cursor-not-allowed"
                    : "hover:scale-125"
                }`}
                style={{ zIndex: index }}
              >
                <img
                  src={icon.icon}
                  alt={icon.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
          <ChevronDownIcon
            className={`w-5 h-5 text-[#9A9CB3] transition-transform ${
              isTxInProgress ? "opacity-50" : ""
            }`}
          />
        </div>
      </div>
    </div>
  );
}
