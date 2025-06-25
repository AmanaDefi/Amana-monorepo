import React, { useState, useEffect, useRef } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Chain } from "viem";
import { SUPPORTED_CHAINS, CHAIN_ICONS } from "@/constants/chainConfig";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { warningToast } from "@/toasts/toastStyles";
import { CheckTheTxIsInProgress } from "@/utils/localStorageUtils";
import { DropdownChainsList } from "@/components/DropdownChainsList";
import { CHAINS_ICONS_BUTTON } from "@/constants/tokens";
import { useWallets } from "@privy-io/react-auth";

interface ChainSelectorProps {
  selectedChain?: Chain;
  onSelectChain: (chain: Chain) => void;
  className?: string;
  vaultId?: string;
  isFromTopUp?: boolean;
}

export default function ChainSelector({
  selectedChain,
  onSelectChain,
  className = "",
  vaultId,
  isFromTopUp,
}: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { activeChain, switchToChain, walletAddress } = useMultiChain();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {wallets} = useWallets();
  const activeAccount = wallets[0];

  console.log('walletClientType',activeAccount?.walletClientType)

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

  const handleChainSelect = async (
    event:
      | React.MouseEvent<HTMLParagraphElement, MouseEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
    chainName: string,
  ) => {
    event.stopPropagation();
    event.preventDefault();

    if (vaultId) {
      const isTxInProgress = CheckTheTxIsInProgress(vaultId);
      if (isTxInProgress) return;
    }

    if (!walletAddress) {
      warningToast("Please connect your wallet to select a chain");
      return;
    }

    const chainConfig = SUPPORTED_CHAINS.find(
      (config) => config.name === chainName,
    );
    if (!chainConfig) return;

    const chain = chainConfig;

    if (selectedChain?.id === chain.id) {
      setIsOpen(false);
      return;
    }

    onSelectChain(chain);

    if (activeChain?.id !== chain.id) {
      try {
        await switchToChain(chain);
      } catch (error) {
        console.log("Failed to switch chain:", error);
      }
    }

    setIsOpen(false);
  };

  const displayedChain = selectedChain || activeChain;

  const chainList = isFromTopUp ? SUPPORTED_CHAINS.slice(1) : SUPPORTED_CHAINS;

  const chainOptions = chainList.map((chainConfig) => ({
    value: chainConfig.name,
    icon: CHAIN_ICONS[chainConfig.id]?.url,
  }));

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

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (walletAddress && activeAccount?.walletClientType === "privy") return;

            if (vaultId) {
              const isTxInProgress = CheckTheTxIsInProgress(vaultId);
              if (isTxInProgress) return;
            }
            setIsOpen(!isOpen);
          }}
          className={`flex items-center justify-between gap-4 py-[6px] ${className} ${
            walletAddress && activeAccount?.walletClientType === "privy"
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
          {(!walletAddress || activeAccount?.walletClientType !== "privy") && (
            <ChevronDownIcon
              className={`w-5 h-5 text-[#9A9CB3] transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          )}
        </button>
        {(!walletAddress || activeAccount?.walletClientType !== "privy") && (
          <DropdownChainsList
            width={263}
            isIconButton={false}
            options={chainOptions}
            selectedOption={displayedChain?.name || ""}
            handleSelectedOption={handleChainSelect}
            isShownList={isOpen}
            needReset={false}
            alignment="right"
          />
        )}
      </div>
    </div>
  );
}
