"use client";
import React from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Chain } from "viem";
import { CHAIN_ICONS } from "@/constants/chainConfig";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { warningToast } from "@/toasts/toastStyles";
import { CheckTheTxIsInProgress } from "@/utils/localStorageUtils";
import { CHAINS_ICONS_BUTTON } from "@/constants/tokens";
import { useUser } from "@account-kit/react";
import { useChainTokenModalStore } from "@/store/chainTokenModalStore";
import { Token, VaultData } from "@/types/types";

interface ChainSelectorProps {
  selectedChain?: Chain;
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
  const { activeChain, walletAddress } = useMultiChain();
  const activeAccount = useUser();
  const { openModal } = useChainTokenModalStore();

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (walletAddress && activeAccount?.type !== "eoa") {
      return;
    }

    if (vaultId) {
      const isTxInProgress = CheckTheTxIsInProgress(vaultId);
      if (isTxInProgress) return;
    }

    if (!walletAddress) {
      warningToast("Please connect your wallet to select a chain");
      return;
    }
    openModal(
      selectedChain || null,
      selectedToken || null,
      onSelectChain,
      onSelectChainAndToken,
      vaultData,
      isFromTopUp,
    );
  };

  const displayedChain = selectedChain || activeChain;

  return (
    <div className="font-gotham w-full max-h-[56px] bg-[#161C27] pl-4 pr-[19px] py-3 rounded-lg shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] flex flex-row justify-between items-center">
      <div className="flex items-center gap-4">
        {displayedChain?.id && (
          <img
            src={CHAIN_ICONS[displayedChain.id]?.url}
            alt={displayedChain.name}
            className="w-[32px] h-[32px] rounded-full"
          />
        )}
        <p className="text-[16px] font-normal">
          {displayedChain?.name || "ZetaChain"}
        </p>
      </div>

      <div className="relative">
        <button
          onClick={handleOpenModal}
          className={`flex items-center justify-between gap-4 py-[6px] ${className} ${
            walletAddress && activeAccount?.type !== "eoa"
              ? ""
              : "cursor-pointer"
          }`}
        >
          <div className="flex items-center -space-x-2">
            {CHAINS_ICONS_BUTTON.map((icon, index) => (
              <div
                key={icon.symbol}
                className="w-[20px] h-[20px] rounded-full overflow-hidden hover:scale-110 transition-transform duration-200 relative border border-white bg-[#3E73C4]"
                style={{ zIndex: index }}
              >
                <img
                  src={icon.icon}
                  alt={icon.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          {(!walletAddress || activeAccount?.type === "eoa") && (
            <ChevronDownIcon className="w-5 h-5 text-[#9A9CB3] transition-transform" />
          )}
        </button>
      </div>
    </div>
  );
}
