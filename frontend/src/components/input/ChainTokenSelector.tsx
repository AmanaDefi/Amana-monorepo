import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { Token, VaultData } from "@/types/types";
import { APPROVED_TOKENS } from "@/constants/chainConfig";
import Image from "next/image";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Chain } from "viem";
import "@/styles/ChainTokenSelector.css";
import { CheckTheTxIsInProgress } from "@/utils/localStorageUtils";

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
  const [searchQuery, setSearchQuery] = useState("");
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

  const handleTokenSelect = (token: Token, event: React.MouseEvent) => {
    if (vaultData?.id) {
      const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
      if (isTxInProgress) return;
    }

    event.stopPropagation();
    event.preventDefault();

    onSelectToken(token);
    setIsOpen(false);
  };

  const getTokensForChain = useCallback(
    (chain: Chain) => {
      let chainTokens: Token[] = [];

      const isZetaChain = chain.id === 7000 || chain.id === 7001;

      if (isZetaChain) {
        if (vaultData?.inputToken) {
          chainTokens = [vaultData.inputToken];
        }
      } else {
        chainTokens = [...(APPROVED_TOKENS[chain.id] || [])];
      }

      return chainTokens;
    },
    [vaultData],
  );

  const availableTokens = useMemo(() => {
    if (!selectedChain) {
      return [];
    }

    const tokens = getTokensForChain(selectedChain);

    return tokens;
  }, [selectedChain, getTokensForChain]);

  const filteredTokens = useMemo(() => {
    if (!searchQuery) return availableTokens;

    return availableTokens.filter((token) =>
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery, availableTokens]);

  const displayContent = useMemo(() => {
    if (selectedToken) {
      return (
        <>
          <Image
            src={selectedToken.imgURL}
            alt={selectedToken.symbol}
            width={24}
            height={24}
            className="rounded-full"
            sizes="24px"
          />
          <span className="text-white">{selectedToken.symbol}</span>
        </>
      );
    } else {
      return <span className="text-white">Select Token</span>;
    }
  }, [selectedToken]);

  if (!selectedChain) {
    return (
      <div className={`flex items-center space-x-2 opacity-50 ${className}`}>
        <span className="text-gray-400">Select chain first</span>
      </div>
    );
  }

  return (
    <div
      className="chain-token-selector relative whitespace-nowrap"
      ref={dropdownRef}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (vaultData?.id) {
            const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
            if (isTxInProgress) return;
          }
          setIsOpen(!isOpen);
        }}
        className={`flex items-center space-x-2 rounded-lg ${className}`}
        disabled={!selectedChain}
      >
        {displayContent}
        <ChevronDownIcon
          className={`w-5 h-5 text-white transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="dropdown-container absolute z-50 mt-2 w-72">
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex mx-2 items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="search-input pl-12 text-center"
              placeholder="Search tokens"
              value={searchQuery}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredTokens.length > 0 ? (
              <div className="token-list">
                {filteredTokens.map((token) => {
                  // Mark vault tokens with a highlight indicator
                  const isVaultToken =
                    vaultData?.inputToken?.address === token.address;

                  // Special handling for native tokens (having zero address)
                  const isNativeToken =
                    token.address ===
                      "0x0000000000000000000000000000000000000000" ||
                    token.address === "11111111111111111111111111111111"; // Solana native

                  // For native tokens, check both address and symbol
                  // For non-native tokens, just check the address
                  const isSelectedToken = isNativeToken
                    ? selectedToken?.address === token.address &&
                      selectedToken?.symbol === token.symbol
                    : selectedToken?.address === token.address;

                  return (
                    <button
                      key={token.address + token.symbol}
                      onClick={(e) => handleTokenSelect(token, e)}
                      className={`token-button ${isVaultToken ? "vault-token" : ""} ${isSelectedToken ? "selected-token" : ""}`}
                    >
                      <Image
                        src={token.imgURL}
                        alt={token.symbol}
                        width={20}
                        height={20}
                        className="token-icon"
                        sizes="20px"
                      />
                      <span className="text-white flex items-center">
                        {token.symbol}
                        {isVaultToken && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-gradient-to-r from-[#262830] to-[#06afbc] rounded-full">
                            Vault
                          </span>
                        )}
                        {isSelectedToken && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-gradient-to-r from-[#262830] to-[#06afbc] rounded-full">
                            Selected
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-400">
                No tokens found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
