import React, { useState, useEffect, useMemo, useRef } from "react";
import { Token } from "@/types/types";
import { APPROVED_TOKENS, SUPPORTED_CHAINS } from "@/constants/chainConfig";
import Image from "next/image";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { Chain } from "thirdweb";
import '@/styles/ChainTokenSelector.css';

interface ChainTokenSelectorProps {
  onSelectToken: (token: Token, chain: Chain) => void;
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isInitialRender = useRef(true);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setExpandedChain(null);
      }
    }

    // Skip the first render to prevent immediate closure
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleChainClick = (chainId: number, event: React.MouseEvent) => {
    // Prevent the event from bubbling up
    event.stopPropagation();
    event.preventDefault();
    
    if (expandedChain === chainId) {
      setExpandedChain(null);
    } else {
      setExpandedChain(chainId);
    }
  };

  const handleTokenSelect = async (token: Token, chain: Chain, event: React.MouseEvent) => {
    // Prevent the event from bubbling up
    event.stopPropagation();
    event.preventDefault();
    
    console.log(`Selected token: ${token.symbol} from chain ${chain.id} (${chain.name})`);
    console.log(`Current active chain: ${activeChain?.id} (${activeChain?.name})`);

    if (activeChain?.id !== chain.id) {
      console.log(`Attempting to switch from chain ${activeChain?.id} to ${chain.id}`);
      try {
        // Call switchToChain and await its completion
        await switchToChain(chain);
        console.log(`Chain switch completed for ${chain.id} (${chain.name})`);
      } catch (error) {
        console.error('Failed to switch chain:', error);
        return; // Don't proceed if chain switch failed
      }
    } else {
      console.log(`Already on chain ${chain.id} (${chain.name}), no switch needed`);
    }

    // Now that we're on the right chain, select the token
    console.log(`Selecting token ${token.symbol} on chain ${chain.id}`);
    onSelectToken(token, chain);
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
    <div className="chain-token-selector relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
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
          <div className="flex items-center space-x-2">
            <Image src="/tokens_colored.png" alt="Logo" width={24} height={24} className="rounded-full" />
            <span className="text-white">Select Token</span>
          </div>
        )}
        <ChevronDownIcon className={`w-5 h-5 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
              placeholder="Search chains or tokens"
              value={searchQuery}
              onClick={(e) => e.stopPropagation()}
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
                    onClick={(e) => handleChainClick(chain.id, e)}
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
                          onClick={(e) => handleTokenSelect(token, chain, e)}
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