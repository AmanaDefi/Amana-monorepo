import React, { useState, useEffect, useRef } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Chain } from "viem";
import { SUPPORTED_CHAINS } from "@/constants/chainConfig";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { warningToast } from "@/toasts/toastStyles";
import { CheckTheTxIsInProgress } from "@/utils/localStorageUtils";
import { CHAINS_ICONS } from "@/constants/tokens";

interface ChainSelectorProps {
  selectedChain?: Chain;
  onSelectChain: (chain: Chain) => void;
  className?: string;
  vaultId?: string;
}

export default function ChainSelector({
  selectedChain,
  onSelectChain,
  className = "",
  vaultId,
}: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { activeChain, switchToChain, walletAddress } = useMultiChain();
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleChainSelect = async (chain: Chain, event: React.MouseEvent) => {
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

    if (selectedChain?.id === chain.id) {
      setIsOpen(false);
      return;
    }

    onSelectChain(chain);

    if (activeChain?.id !== chain.id) {
      try {
        await switchToChain(chain);
      } catch (error) {
        console.error("Failed to switch chain:", error);
      }
    }

    setIsOpen(false);
  };

  const displayedChain = selectedChain || activeChain;

    return (
      <div className="font-gotham w-full max-h-[56px] bg-[#161C27] pl-4 pr-[19px] py-3 rounded-lg shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] flex flex-row justify-between items-center">
        <div>
          <p className="text-[16px] font-normal">{displayedChain?.name || "ZetaChain"} </p>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (vaultId) {
                const isTxInProgress = CheckTheTxIsInProgress(vaultId);
                if (isTxInProgress) return;
              }
              setIsOpen(!isOpen);
            }}
            className={`flex items-center justify-between gap-4 py-[6px] ${className}`}
          >
            <div className="flex items-center -space-x-2">
              {CHAINS_ICONS.map((icon, index) => (
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
            <ChevronDownIcon
              className={`w-5 h-5 text-[#9A9CB3] transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isOpen && (
            <div className="absolute z-50 mt-2 w-full min-w-[200px] bg-[#161C27] border border-[#535E73] rounded-lg shadow-lg overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                {SUPPORTED_CHAINS.map((chainConfig) => {
                  const isSelected =
                    displayedChain?.id === chainConfig.chain.id;
                  const isActive = activeChain?.id === chainConfig.chain.id;

                  return (
                    <button
                      key={chainConfig.chain.id}
                      onClick={(e) => handleChainSelect(chainConfig.chain, e)}
                      className={`w-full px-4 py-3 text-left hover:bg-[#262830] transition-colors flex items-center justify-between ${
                        isSelected ? "bg-[#262830]" : ""
                      }`}
                    >
                      <span className="text-white">
                        {chainConfig.chain.name}
                      </span>
                      {isActive && (
                        <span className="text-xs px-2 py-0.5 text-white bg-gradient-to-r from-[#262830] to-[#06afbc] rounded-full">
                          Connected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
}
