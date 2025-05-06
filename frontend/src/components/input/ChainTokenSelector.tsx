import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Token, VaultData } from "@/types/types";
import { APPROVED_TOKENS, SUPPORTED_CHAINS } from "@/constants/chainConfig";
import Image from "next/image";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { Chain } from "thirdweb";
import '@/styles/ChainTokenSelector.css';
import { warningToast } from "@/toasts/toastStyles";

interface ChainTokenSelectorProps {
  onSelectToken: (token: Token, chain: Chain) => void;
  selectedToken?: Token;
  className?: string;
  vaultData?: VaultData;
}

export default function ChainTokenSelector({
  onSelectToken,
  selectedToken,
  className = "",
  vaultData
}: ChainTokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedChain, setExpandedChain] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { activeChain, switchToChain, walletAddress } = useMultiChain();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isInitialRender = useRef(true);
  const [selectedTokenChain, setSelectedTokenChain] = useState<number | null>(null);
  
  // Track if initial selection was made to avoid re-selecting on subsequent renders
  const initialSelectionMadeRef = useRef(false);
  // Track the last active chain to detect chain changes
  const lastActiveChainRef = useRef<number | null>(null);

  // Find the closest token to vault token on current chain
  const findClosestToken = useCallback(() => {
    if (!vaultData?.inputToken || !activeChain) {
      return null;
    }

    // Extract base symbol from vault token (e.g., "USDT" from "USDT.POL")
    const vaultTokenSymbol = vaultData.inputToken.symbol.split('.')[0].split(' ')[0];
    const currentChainTokens = APPROVED_TOKENS[activeChain.id] || [];
    
    // Check if vault token is a native token (ETH, BNB, AVAX, etc.)
    const isNativeVaultToken = ['ETH', 'BNB', 'MATIC', 'AVAX', 'FTM', 'ONE', 'CRO', 'SOL', 'GLMR'].includes(vaultTokenSymbol.toUpperCase());
    
    // If it's a native vault token, prefer returning the native token of the current chain
    if (isNativeVaultToken) {
      // Find the native token from the current chain (address 0x0000...)
      const nativeToken = currentChainTokens.find(token => 
        token.address === "0x0000000000000000000000000000000000000000" ||
        token.address === "11111111111111111111111111111111" // Solana native
      );
      
      if (nativeToken) {
        console.log(`Found native token ${nativeToken.symbol} for native vault token ${vaultTokenSymbol}`);
        return nativeToken;
      }
    }
    
    // First, try to find exact symbol match (non-native tokens prioritized for non-native vault tokens)
    const exactMatches = currentChainTokens.filter(token => {
      // Extract token base symbol (e.g., "USDT" from "USDT (POL)")
      const tokenBaseSymbol = token.symbol.split(' ')[0].split('.')[0];
      return tokenBaseSymbol === vaultTokenSymbol;
    });

    // If we have exact matches, prioritize based on vault token type
    if (exactMatches.length > 0) {
      // For non-native vault tokens (like stablecoins), prioritize non-native tokens
      if (!isNativeVaultToken) {
        // First try to find a non-native token with matching symbol
        const nonNativeMatch = exactMatches.find(token => 
          token.address !== "0x0000000000000000000000000000000000000000" &&
          token.address !== "11111111111111111111111111111111" // Solana native
        );
        
        if (nonNativeMatch) {
          return nonNativeMatch;
        }
      }
      
      // If no non-native match or it's a native vault token, return the first match (could be native)
      return exactMatches[0];
    }
    
    // If no exact symbol match, check if vault token is a stablecoin and try to find a stablecoin on current chain
    const isStablecoin = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD'].includes(vaultTokenSymbol);
    
    if (isStablecoin) {
      // Look for any stablecoin on the current chain, prioritizing the same type first (USDT -> USDT)
      const stablecoins = currentChainTokens.filter(token => {
        const tokenBaseSymbol = token.symbol.split(' ')[0].split('.')[0];
        return ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD'].includes(tokenBaseSymbol);
      });
      
      // First try to find the same type of stablecoin
      const sameTypeStable = stablecoins.find(token => 
        token.symbol.split(' ')[0].split('.')[0] === vaultTokenSymbol
      );
      
      if (sameTypeStable) {
        return sameTypeStable;
      }
      
      // Otherwise return any stablecoin
      if (stablecoins.length > 0) {
        return stablecoins[0];
      }
    }
    
    // If we get here, no matching token was found, so we try to find other similar tokens
    
    // Check if any token in the current chain is similar to the vault token (e.g., ETH-like, BTC-like)
    if (['ETH', 'WETH'].includes(vaultTokenSymbol)) {
      const ethLike = currentChainTokens.find(token => 
        ['ETH', 'WETH'].includes(token.symbol.split(' ')[0].split('.')[0])
      );
      if (ethLike) return ethLike;
    }
    
    if (['BTC', 'WBTC', 'BTCB'].includes(vaultTokenSymbol)) {
      const btcLike = currentChainTokens.find(token => 
        ['BTC', 'WBTC', 'BTCB'].includes(token.symbol.split(' ')[0].split('.')[0])
      );
      if (btcLike) return btcLike;
    }
    
    // Last resort: If nothing matches and we have tokens, return the first non-native token (or native if nothing else)
    const nonNativeTokens = currentChainTokens.filter(token => 
      token.address !== "0x0000000000000000000000000000000000000000" &&
      token.address !== "11111111111111111111111111111111"
    );
    
    if (nonNativeTokens.length > 0) {
      return nonNativeTokens[0];
    } else if (currentChainTokens.length > 0) {
      return currentChainTokens[0];
    }
    
    // No tokens available on this chain
    return null;
  }, [vaultData?.inputToken, activeChain]);

  // Track the last vault ID to know when user enters a new vault
  const lastVaultIdRef = useRef<string | null>(null);
  
  // Set default token on component mount and when dependencies change
  useEffect(() => {
    if (vaultData?.inputToken && activeChain && walletAddress) {
      const vaultId = vaultData.id as string;
      const isNewVault = vaultId !== lastVaultIdRef.current;
      
      // ALWAYS auto-select when entering a new vault (ignore selectedToken)
      if (isNewVault) {
        console.log("New vault detected, forcing token selection reset");
        const closestToken = findClosestToken();
        if (closestToken) {
          console.log("Auto-selecting closest token for new vault:", closestToken.symbol);
          const chain = SUPPORTED_CHAINS.find(c => c.id === activeChain.id) || activeChain;
          onSelectToken(closestToken, chain);
        }
      } else if (!selectedToken) {
        // If not a new vault but no token is selected yet
        const closestToken = findClosestToken();
        if (closestToken) {
          console.log("Auto-selecting closest token (no selection yet):", closestToken.symbol);
          const chain = SUPPORTED_CHAINS.find(c => c.id === activeChain.id) || activeChain;
          onSelectToken(closestToken, chain);
        }
      }
      
      // Update the last vault ID reference
      lastVaultIdRef.current = vaultId;
    }
  }, [vaultData?.inputToken, vaultData?.id, activeChain, walletAddress, findClosestToken, onSelectToken]);

  // Handle network changes and update token selection accordingly
  useEffect(() => {
    if (activeChain && lastActiveChainRef.current !== activeChain.id && walletAddress) {
      console.log(`Network changed from ${lastActiveChainRef.current} to ${activeChain.id}`);
      
      // Find the closest token on the new chain
      const closestToken = findClosestToken();
      
      if (closestToken) {
        console.log(`Selecting closest token on new chain: ${closestToken.symbol}`);
        const chain = SUPPORTED_CHAINS.find(c => c.id === activeChain.id) || activeChain;
        onSelectToken(closestToken, chain);
      } else if (selectedToken) {
        // If we have a selected token from another chain, try to find the same token on this chain
        const currentChainTokens = APPROVED_TOKENS[activeChain.id] || [];
        const selectedTokenBaseSymbol = selectedToken.symbol.split(' ')[0];
        
        // Look for matching token by base symbol
        const matchingToken = currentChainTokens.find(token => {
          const tokenBaseSymbol = token.symbol.split(' ')[0];
          return tokenBaseSymbol === selectedTokenBaseSymbol;
        });
        
        if (matchingToken) {
          console.log(`Found matching token ${matchingToken.symbol} on new chain`);
          const chain = SUPPORTED_CHAINS.find(c => c.id === activeChain.id) || activeChain;
          onSelectToken(matchingToken, chain);
        }
      }
      
      // Update the last active chain reference
      lastActiveChainRef.current = activeChain.id;
    } else if (activeChain && lastActiveChainRef.current === null) {
      // Initial chain setup
      lastActiveChainRef.current = activeChain.id;
    }
  }, [activeChain?.id, walletAddress, findClosestToken, onSelectToken, selectedToken]);

  // Handle initial token selection when component mounts
  useEffect(() => {
    if (!initialSelectionMadeRef.current && walletAddress && vaultData?.inputToken && activeChain) {
      const closestToken = findClosestToken();
      if (closestToken) {
        console.log("Initial mount - selecting closest token:", closestToken.symbol);
        const chain = SUPPORTED_CHAINS.find(c => c.id === activeChain.id) || activeChain;
        onSelectToken(closestToken, chain);
        initialSelectionMadeRef.current = true;
      }
    }
  }, [walletAddress, vaultData?.inputToken, activeChain, findClosestToken, onSelectToken]);

  // Auto-expand the active chain when opening the dropdown
  useEffect(() => {
    if (isOpen && activeChain) {
      setExpandedChain(activeChain.id);
    }
  }, [isOpen, activeChain]);

  // Track which chain the selected token belongs to
  useEffect(() => {
    if (selectedToken) {
      // Check if it's a native token (address 0x0000000000000000000000000000000000000000)
      const isNativeToken = selectedToken.address === "0x0000000000000000000000000000000000000000" ||
        selectedToken.address === "11111111111111111111111111111111"; // Solana native token

      if (isNativeToken) {
        // For native tokens, extract chain name from the symbol
        // e.g., "ETH (ETH)" -> find in which chain this symbol exists
        for (const chainId in APPROVED_TOKENS) {
          const chainTokens = APPROVED_TOKENS[Number(chainId)] || [];
          const tokenExists = chainTokens.some(
            token => token.symbol === selectedToken.symbol && token.address === selectedToken.address
          );
          if (tokenExists) {
            setSelectedTokenChain(Number(chainId));
            return;
          }
        }
      } else {
        // For non-native tokens, find by address as before
        for (const chainId in APPROVED_TOKENS) {
          const chainTokens = APPROVED_TOKENS[Number(chainId)] || [];
          const tokenExists = chainTokens.some(
            token => token.address === selectedToken.address
          );
          if (tokenExists) {
            setSelectedTokenChain(Number(chainId));
            return;
          }
        }
      }

      // Check if it's the vault token
      if (vaultData?.inputToken && selectedToken.address === vaultData.inputToken.address) {
        // Vault tokens belong to ZetaChain
        setSelectedTokenChain(7000); // or 7001 for testnet
      } else {
        // Default to active chain if we couldn't determine
        setSelectedTokenChain(activeChain?.id || null);
      }
    } else {
      setSelectedTokenChain(null);
    }
  }, [selectedToken, vaultData, activeChain]);

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

    // Check if wallet is connected
    if (!walletAddress) {
      warningToast("Please connect your wallet to select a token");
      return;
    }

    // Don't switch chains if selecting the same token again
    if (selectedToken?.address === token.address && activeChain?.id === chain.id) {
      setIsOpen(false);
      return;
    }

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

    // Update the selected token chain
    setSelectedTokenChain(chain.id);

    // Now that we're on the right chain, select the token
    console.log(`Selecting token ${token.symbol} on chain ${chain.id}`);
    onSelectToken(token, chain);
    setIsOpen(false);
    setExpandedChain(null);
  };

  // Enhanced token list to include vault asset tokens but ONLY in their own chains
  const getTokensForChain = useCallback((chain: Chain) => {
    // Only include tokens that belong to this specific chain
    let chainTokens: Token[] = [];

    const isZetaChain = chain.id === 7000 || chain.id === 7001;

    // Only for ZetaChain, ensure the vault token is included if available
    if (isZetaChain && vaultData?.inputToken) {
      const vaultTokenExists = chainTokens.some(token =>
        token.address === vaultData.inputToken.address
      );

      if (!vaultTokenExists) {
        chainTokens.push(vaultData.inputToken);
      }
    } else chainTokens = [...(APPROVED_TOKENS[chain.id] || [])];

    // If this is NOT ZetaChain, remove the vault token if it exists in this chain
    if (!isZetaChain && vaultData?.inputToken) {
      chainTokens = chainTokens.filter(token =>
        token.address !== vaultData.inputToken.address
      );
    }

    return chainTokens;
  }, [vaultData]);

  const filteredChains = useMemo(() => {
    if (!searchQuery) return SUPPORTED_CHAINS;

    return SUPPORTED_CHAINS.filter(chain => {
      const chainTokens = getTokensForChain(chain);
      const hasMatchingTokens = chainTokens.some(token =>
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return chain.name?.toLowerCase().includes(searchQuery.toLowerCase()) || hasMatchingTokens;
    });
  }, [searchQuery, getTokensForChain]);

  // Decide what to display in the selector button
  const displayContent = useMemo(() => {
    console.log("selectedToken", selectedToken);
    console.log("findClosestToken", findClosestToken());
    
    // Priority order:
    // 1. User's explicit selection (selectedToken)
    // 2. Closest token to vault token on current chain
    // 3. Default "Select Token" text
    
    if (selectedToken) {
      return (
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
      );
    } else if (walletAddress) {
      // If wallet is connected but no token selected yet, show closest token
      const defaultToken = findClosestToken();
      if (defaultToken) {
        return (
          <>
            <Image
              src={defaultToken.imgURL}
              alt={defaultToken.symbol}
              width={24}
              height={24}
              className="rounded-full"
            />
            <span className="text-white">{defaultToken.symbol}</span>
          </>
        );
      }
    }
    
    // Fallback to default text
    return <span className="text-white">Select Token</span>;
  }, [selectedToken, walletAddress, findClosestToken]);

  return (
    <div className="chain-token-selector relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`fluid-hover-button flex items-center space-x-2 rounded-lg px-4 py-2 ${className}`}
      >
        {displayContent}
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
              const chainTokens = getTokensForChain(chain);
              const filteredTokens = searchQuery
                ? chainTokens.filter(token =>
                  token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
                )
                : chainTokens;

              if (searchQuery && filteredTokens.length === 0) return null;

              // Don't show empty chains
              if (filteredTokens.length === 0) return null;

              return (
                <div key={chain.id}>
                  <button
                    onClick={(e) => handleChainClick(chain.id, e)}
                    className={`chain-button ${activeChain?.id === chain.id ? 'active-chain' : ''}`}
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
                      {selectedToken && chain.id === selectedTokenChain && (
                        <span className="ml-2 text-xs px-2 py-0.5 text-white bg-gradient-to-r from-[#262830] to-[#06afbc] rounded-full">
                          Connected
                        </span>
                      )}
                    </div>
                    <ChevronDownIcon
                      className={`w-5 h-5 text-white transition-transform ${expandedChain === chain.id ? 'rotate-180' : ''
                        }`}
                    />
                  </button>

                  {(expandedChain === chain.id || searchQuery) && filteredTokens.length > 0 && (
                    <div className="token-list">
                      {filteredTokens.map((token) => {
                        // Mark vault tokens with a highlight indicator
                        const isVaultToken = vaultData?.inputToken?.address === token.address;

                        // Special handling for native tokens (having zero address)
                        const isNativeToken = token.address === "0x0000000000000000000000000000000000000000" ||
                          token.address === "11111111111111111111111111111111"; // Solana native

                        // For native tokens, check both address and symbol
                        // For non-native tokens, just check the address
                        const isSelectedToken = isNativeToken
                          ? (selectedToken?.address === token.address &&
                            selectedToken?.symbol === token.symbol)
                          : (selectedToken?.address === token.address);

                        return (
                          <button
                            key={token.address + token.symbol}
                            onClick={(e) => handleTokenSelect(token, chain, e)}
                            className={`token-button ${isVaultToken ? 'vault-token' : ''} ${isSelectedToken ? 'selected-token' : ''}`}
                          >
                            <Image
                              src={token.imgURL}
                              alt={token.symbol}
                              width={20}
                              height={20}
                              className="token-icon"
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