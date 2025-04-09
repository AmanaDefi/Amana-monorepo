import React, { useState, useEffect, useMemo } from "react";
import { Token } from "@/types/types";
import { APPROVED_TOKENS, SUPPORTED_CHAINS } from "@/constants/chainConfig";
import Image from "next/image";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { Chain } from "thirdweb";
import '@/styles/ChainTokenSelector.css';

interface ChainTokenSelectorProps {
  onSelectToken: (token: Token) => void;
  selectedToken?: Token;
  className?: string;
}

export default function ChainTokenSelector({
  onSelectToken,
  selectedToken,
  className = ""
}: ChainTokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedChain, setExpandedChain] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { activeChain, switchToChain } = useMultiChain();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const dropdown = document.getElementById('chain-token-selector');
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setIsOpen(false);
        setExpandedChain(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChainClick = (chainId: number) => {
    if (expandedChain === chainId) {
      setExpandedChain(null);
    } else {
      setExpandedChain(chainId);
    }
  };

  const handleTokenSelect = async (token: Token, chain: Chain) => {
    if (activeChain?.id !== chain.id) {
      console.log(`Attempting to switch from chain ${activeChain?.id} to ${chain.id}`);
await switchToChain(chain);
console.log(`After switchToChain, activeChain is now ${activeChain?.id}`);
      await switchToChain(chain);
    }
    onSelectToken(token);
    setIsOpen(false);
    setExpandedChain(null);
  };

  const filteredChains = useMemo(() => {
    if (!searchQuery) return SUPPORTED_CHAINS;

    return SUPPORTED_CHAINS.filter(chain => {
      const chainTokens = APPROVED_TOKENS[chain.id] || [];
      const hasMatchingTokens = chainTokens.some(token => 
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return chain.name?.toLowerCase().includes(searchQuery.toLowerCase()) || hasMatchingTokens;
    });
  }, [searchQuery]);

  return (
    <div className="chain-token-selector relative" id="chain-token-selector">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 bg-customNeutral200 hover:bg-customNeutral300 rounded-lg px-4 py-2 ${className}`}
      >
        {selectedToken ? (
          <>
            <Image
              src={selectedToken.imgURL}
              alt={selectedToken.symbol}
              width={24}
              height={24}
              className="rounded-full"
            />
            <span className="text-white">{selectedToken.symbol}</span>
          </>
        ) : (
          <span className="text-white">Select Token</span>
        )}
        <ChevronDownIcon className={`w-5 h-5 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="dropdown-container absolute z-50 mt-2 w-72">
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="search-input pl-12"
              placeholder="Search chains or tokens"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {filteredChains.map((chain) => {
              const chainTokens = APPROVED_TOKENS[chain.id] || [];
              const filteredTokens = searchQuery
                ? chainTokens.filter(token => 
                    token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : chainTokens;

              if (searchQuery && filteredTokens.length === 0) return null;

              return (
                <div key={chain.id}>
                  <button
                    onClick={() => handleChainClick(chain.id)}
                    className="chain-button"
                  >
                    <div className="flex items-center space-x-3">
                      {chain.icon && (
                        <Image
                          src={chain.icon.url}
                          alt={chain.name || ''}
                          width={24}
                          height={24}
                          className="chain-icon"
                        />
                      )}
                      <span className="text-white">{chain.name}</span>
                    </div>
                    <ChevronDownIcon 
                      className={`w-5 h-5 text-white transition-transform ${
                        expandedChain === chain.id ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>
                  
                  {(expandedChain === chain.id || searchQuery) && filteredTokens.length > 0 && (
                    <div className="token-list">
                      {filteredTokens.map((token) => (
                        <button
                          key={token.address}
                          onClick={() => handleTokenSelect(token, chain)}
                          className="token-button"
                        >
                          <Image
                            src={token.imgURL}
                            alt={token.symbol}
                            width={20}
                            height={20}
                            className="token-icon"
                          />
                          <span className="text-white">{token.symbol}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}