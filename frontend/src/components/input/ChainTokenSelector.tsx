import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { Token, VaultData } from "@/types/types";
import { APPROVED_TOKENS, SUPPORTED_CHAINS } from "@/constants/chainConfig";
import Image from "next/image";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { Chain } from "thirdweb";
import "@/styles/ChainTokenSelector.css";
import { warningToast } from "@/toasts/toastStyles";
import { CheckTheTxIsInProgress } from "@/utils/localStorageUtils";

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
  vaultData,
}: ChainTokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedChain, setExpandedChain] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { activeChain, switchToChain, walletAddress } = useMultiChain();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isInitialRender = useRef(true);
  const [selectedTokenChain, setSelectedTokenChain] = useState<number | null>(
    null,
  );
  const lastActiveChainRef = useRef<number | null>(null);
  const lastVaultIdRef = useRef<string | null>(null);

  // Find the closest token to vault token on current chain
  const findClosestToken = useCallback(() => {
    if (!vaultData?.inputToken || !activeChain) {
      return null;
    }

    // Extract base symbol from vault token (e.g., "USDT" from "USDT.POL")
    const vaultTokenSymbol = vaultData.inputToken.symbol
      .split(".")[0]
      .split(" ")[0];
    const currentChainTokens = APPROVED_TOKENS[activeChain.id] || [];

    // Check if vault token is a native token (ETH, BNB, etc.)
    const isNativeVaultToken = [
      "ETH",
      "BNB",
      "MATIC",
      "AVAX",
      "FTM",
      "ONE",
      "CRO",
      "SOL",
      "GLMR",
    ].includes(vaultTokenSymbol.toUpperCase());

    // Check if vault token is a stablecoin
    const isStablecoin = [
      "USDT",
      "USDC",
      "DAI",
      "BUSD",
      "TUSD",
      "USDP",
      "FRAX",
      "LUSD",
    ].includes(vaultTokenSymbol.toUpperCase());

    const isZetaChain = activeChain.id === 7000 || activeChain.id === 7001;

    // PRIORITY 1: For ZetaChain, prioritize tokens specific to the connected chain first
    if (isZetaChain && isStablecoin) {
      // Look for a token with the current chain in its symbol (e.g., "USDC.ARB" on ZetaChain)
      const chainSpecificTokens = currentChainTokens.filter((token) => {
        // Check if the token has a chain suffix that matches the active chain
        const tokenParts = token.symbol.split(".");
        if (tokenParts.length === 2) {
          const tokenBaseSymbol = tokenParts[0];
          // Check if it's the right base symbol (USDC, USDT, etc)
          return (
            tokenBaseSymbol.toUpperCase() === vaultTokenSymbol.toUpperCase()
          );
        }
        return false;
      });

      // Sort tokens to prioritize chain-specific ones based on the chain we're connected to
      // This helps ensure USDC.ARB is chosen over USDC.ETH when on ZetaChain
      if (chainSpecificTokens.length > 0) {
        // Get user's connected chain suffix if possible
        let connectedChainSuffix = "";

        // Check if we can determine a chain suffix from the active wallet connection
        if (activeChain?.id) {
          // These are mappings of chain IDs to their suffix in token symbols
          const chainIdToSuffix: Record<number, string> = {
            1: "ETH", // Ethereum
            8453: "BASE", // Base
            137: "POL", // Polygon
            42161: "ARB", // Arbitrum
            43114: "AVAX", // Avalanche
            56: "BSC", // BNB Chain
          };

          connectedChainSuffix = chainIdToSuffix[activeChain.id] || "";
        }

        // Extract the vault token's chain suffix if it has one
        const vaultTokenParts = vaultData?.inputToken?.symbol.split(".") || [];
        const vaultTokenSuffix =
          vaultTokenParts.length === 2 ? vaultTokenParts[1] : "";

        // Sort by our prioritization logic
        const sortedTokens = [...chainSpecificTokens].sort((a, b) => {
          const aSuffix = a.symbol.split(".")[1] || "";
          const bSuffix = b.symbol.split(".")[1] || "";

          // If one token matches the current chain, it wins
          if (
            aSuffix === connectedChainSuffix &&
            bSuffix !== connectedChainSuffix
          )
            return -1;
          if (
            bSuffix === connectedChainSuffix &&
            aSuffix !== connectedChainSuffix
          )
            return 1;

          // If one token matches the vault token's original suffix, it comes next
          if (vaultTokenSuffix) {
            if (aSuffix === vaultTokenSuffix && bSuffix !== vaultTokenSuffix)
              return -1;
            if (bSuffix === vaultTokenSuffix && aSuffix !== vaultTokenSuffix)
              return 1;
          }

          // Otherwise, alphabetical order
          return aSuffix.localeCompare(bSuffix);
        });

        return sortedTokens[0];
      }
    }

    // PRIORITY 2: First try to find exact symbol match (original logic)
    const exactMatches = currentChainTokens.filter((token) => {
      // Extract token base symbol (e.g., "USDT" from "USDT (POL)")
      const tokenBaseSymbol = token.symbol.split(" ")[0].split(".")[0];
      return tokenBaseSymbol.toUpperCase() === vaultTokenSymbol.toUpperCase();
    });

    // If we have exact matches, handle based on vault token type
    if (exactMatches.length > 0) {
      // For stablecoin vaults, prioritize non-native tokens
      if (isStablecoin) {
        const nonNativeMatch = exactMatches.find(
          (token) =>
            token.address !== "0x0000000000000000000000000000000000000000" &&
            token.address !== "11111111111111111111111111111111", // Solana native
        );

        if (nonNativeMatch) {
          return nonNativeMatch;
        }
      }

      return exactMatches[0];
    }

    // PRIORITY 3: For stablecoin vaults, try to find any stablecoin
    if (isStablecoin) {
      const stablecoinMatch = currentChainTokens.find((token) => {
        const tokenBaseSymbol = token.symbol.split(" ")[0].split(".")[0];
        return [
          "USDT",
          "USDC",
          "DAI",
          "BUSD",
          "TUSD",
          "USDP",
          "FRAX",
          "LUSD",
        ].includes(tokenBaseSymbol.toUpperCase());
      });

      if (stablecoinMatch) {
        return stablecoinMatch;
      }
    }

    // PRIORITY 4: For native token vaults, prioritize native token
    if (isNativeVaultToken) {
      const nativeToken = currentChainTokens.find(
        (token) =>
          token.address === "0x0000000000000000000000000000000000000000" ||
          token.address === "11111111111111111111111111111111", // Solana native
      );

      if (nativeToken) {
        return nativeToken;
      }
    }

    // PRIORITY 5: Default to first token in the list for this chain
    if (currentChainTokens.length > 0) {
      return currentChainTokens[0];
    }

    return null;
  }, [vaultData?.inputToken, activeChain]);

  // Handle vault changes - reset token selection when vault changes
  useEffect(() => {
    if (vaultData?.id && lastVaultIdRef.current !== vaultData.id) {
      const isTxIsInProggress = CheckTheTxIsInProgress(vaultData.id);
      if (isTxIsInProggress) return;

      lastVaultIdRef.current = vaultData.id;

      // Reset selected token when vault changes
      if (activeChain && walletAddress) {
        const closestToken = findClosestToken();
        if (closestToken) {
          const chain =
            SUPPORTED_CHAINS.find((c) => c.id === activeChain.id) ||
            activeChain;
          onSelectToken(closestToken, chain);
        }
      }
    }
  }, [
    vaultData?.id,
    activeChain,
    walletAddress,
    findClosestToken,
    onSelectToken,
  ]);

  // Handle network changes - update token selection when network changes
  useEffect(() => {
    if (vaultData?.id) {
      const isTxIsInProggress = CheckTheTxIsInProgress(vaultData?.id);
      if (isTxIsInProggress) return;
    }

    if (
      activeChain &&
      lastActiveChainRef.current !== null &&
      lastActiveChainRef.current !== activeChain.id &&
      walletAddress
    ) {
      // Find the closest token on the new chain
      const closestToken = findClosestToken();

      if (closestToken) {
        const chain =
          SUPPORTED_CHAINS.find((c) => c.id === activeChain.id) || activeChain;
        onSelectToken(closestToken, chain);
      } else if (selectedToken) {
        // If we have a selected token from another chain, try to find the same token on this chain
        const currentChainTokens = APPROVED_TOKENS[activeChain.id] || [];
        const selectedTokenBaseSymbol = selectedToken.symbol
          .split(".")[0]
          .split(" ")[0];

        // Define a mapping of chain IDs to token symbol suffixes
        const chainIdToSuffix: Record<number, string> = {
          1: "ETH", // Ethereum
          8453: "BASE", // Base
          137: "POL", // Polygon
          42161: "ARB", // Arbitrum
          43114: "AVAX", // Avalanche
          56: "BSC", // BNB Chain
        };

        // Get the current chain's preferred suffix if it exists
        const preferredSuffix = chainIdToSuffix[activeChain.id] || "";

        // Extract the selected token's base symbol and original suffix
        const selectedTokenParts = selectedToken.symbol.split(".");
        const selectedTokenSuffix =
          selectedTokenParts.length === 2 ? selectedTokenParts[1] : "";

        // Try to find tokens matching the base symbol with any supported chain suffix
        const chainSpecificTokens = currentChainTokens.filter((token) => {
          const tokenParts = token.symbol.split(".");
          if (tokenParts.length === 2) {
            const tokenBaseSymbol = tokenParts[0];
            return (
              tokenBaseSymbol.toUpperCase() ===
              selectedTokenBaseSymbol.toUpperCase()
            );
          }
          return false;
        });

        // If we found any, sort and select based on our prioritization logic
        if (chainSpecificTokens.length > 0) {
          // Sort by our prioritization logic
          const sortedTokens = [...chainSpecificTokens].sort((a, b) => {
            const aSuffix = a.symbol.split(".")[1] || "";
            const bSuffix = b.symbol.split(".")[1] || "";

            // If one token matches the current chain, it wins
            if (aSuffix === preferredSuffix && bSuffix !== preferredSuffix)
              return -1;
            if (bSuffix === preferredSuffix && aSuffix !== preferredSuffix)
              return 1;

            // If one token matches the selected token's original suffix, it comes next
            if (selectedTokenSuffix) {
              if (
                aSuffix === selectedTokenSuffix &&
                bSuffix !== selectedTokenSuffix
              )
                return -1;
              if (
                bSuffix === selectedTokenSuffix &&
                aSuffix !== selectedTokenSuffix
              )
                return 1;
            }

            // Otherwise, alphabetical order
            return aSuffix.localeCompare(bSuffix);
          });

          const chain =
            SUPPORTED_CHAINS.find((c) => c.id === activeChain.id) ||
            activeChain;
          onSelectToken(sortedTokens[0], chain);
          return;
        }

        // If no chain-specific tokens were found, look for any matching token by base symbol as fallback
        const matchingToken = currentChainTokens.find((token) => {
          const tokenBaseSymbol = token.symbol.split(" ")[0].split(".")[0];
          return (
            tokenBaseSymbol.toUpperCase() ===
            selectedTokenBaseSymbol.toUpperCase()
          );
        });

        if (matchingToken) {
          const chain =
            SUPPORTED_CHAINS.find((c) => c.id === activeChain.id) ||
            activeChain;
          onSelectToken(matchingToken, chain);
          return;
        }

        // If we can't find a matching token, just select the first available
        if (currentChainTokens.length > 0) {
          const chain =
            SUPPORTED_CHAINS.find((c) => c.id === activeChain.id) ||
            activeChain;
          onSelectToken(currentChainTokens[0], chain);
        }
      }
    }

    // Update the last active chain reference
    if (activeChain) {
      lastActiveChainRef.current = activeChain.id;
    }
  }, [
    activeChain?.id,
    walletAddress,
    findClosestToken,
    onSelectToken,
    selectedToken,
    vaultData?.id,
    activeChain,
  ]);

  // Set default token on component mount and when dependencies change
  useEffect(() => {
    if (vaultData?.id) {
      const isTxIsInProggress = CheckTheTxIsInProgress(vaultData?.id);
      if (isTxIsInProggress) return;
    }

    if (
      vaultData?.inputToken &&
      activeChain &&
      walletAddress &&
      !selectedToken
    ) {
      const closestToken = findClosestToken();

      if (closestToken) {
        const chain =
          SUPPORTED_CHAINS.find((c) => c.id === activeChain.id) || activeChain;
        onSelectToken(closestToken, chain);
      }
    }
  }, [
    vaultData,
    activeChain,
    walletAddress,
    selectedToken,
    findClosestToken,
    onSelectToken,
  ]);

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
      const isNativeToken =
        selectedToken.address ===
          "0x0000000000000000000000000000000000000000" ||
        selectedToken.address === "11111111111111111111111111111111"; // Solana native token

      if (isNativeToken) {
        // For native tokens, extract chain name from the symbol
        // e.g., "ETH (ETH)" -> find in which chain this symbol exists
        for (const chainId in APPROVED_TOKENS) {
          const chainTokens = APPROVED_TOKENS[Number(chainId)] || [];
          const tokenExists = chainTokens.some(
            (token) =>
              token.symbol === selectedToken.symbol &&
              token.address === selectedToken.address,
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
            (token) => token.address === selectedToken.address,
          );
          if (tokenExists) {
            setSelectedTokenChain(Number(chainId));
            return;
          }
        }
      }

      // Check if it's the vault token
      if (
        vaultData?.inputToken &&
        selectedToken.address === vaultData.inputToken.address
      ) {
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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setExpandedChain(null);
      }
    }

    // Skip the first render to prevent immediate closure
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const handleTokenSelect = async (
    token: Token,
    chain: Chain,
    event: React.MouseEvent,
  ) => {
    if (vaultData?.id) {
      const isTxIsInProggress = CheckTheTxIsInProgress(vaultData?.id);
      if (isTxIsInProggress) return;
    }
    // Prevent the event from bubbling up
    event.stopPropagation();
    event.preventDefault();

    // Check if wallet is connected
    if (!walletAddress) {
      warningToast("Please connect your wallet to select a token");
      return;
    }

    // Don't switch chains if selecting the same token again
    if (
      selectedToken?.address === token.address &&
      activeChain?.id === chain.id
    ) {
      setIsOpen(false);
      return;
    }

    if (activeChain?.id !== chain.id) {
      try {
        // Call switchToChain and await its completion
        await switchToChain(chain);
      } catch (error) {
        console.error("Failed to switch chain:", error);
        return; // Don't proceed if chain switch failed
      }
    } else {
    }

    // Update the selected token chain
    setSelectedTokenChain(chain.id);

    // Now that we're on the right chain, select the token
    onSelectToken(token, chain);
    setIsOpen(false);
    setExpandedChain(null);
  };

  // Enhanced token list to include vault asset tokens but ONLY in their own chains
  const getTokensForChain = useCallback(
    (chain: Chain) => {
      // Only include tokens that belong to this specific chain
      let chainTokens: Token[] = [];

      const isZetaChain = chain.id === 7000 || chain.id === 7001;

      // Only for ZetaChain, ensure the vault token is included if available
      if (isZetaChain && vaultData?.inputToken) {
        const vaultTokenExists = chainTokens.some(
          (token) => token.address === vaultData.inputToken.address,
        );

        if (!vaultTokenExists) {
          chainTokens.push(vaultData.inputToken);
        }
      } else chainTokens = [...(APPROVED_TOKENS[chain.id] || [])];

      // If this is NOT ZetaChain, remove the vault token if it exists in this chain
      if (!isZetaChain && vaultData?.inputToken) {
        chainTokens = chainTokens.filter(
          (token) => token.address !== vaultData.inputToken.address,
        );
      }

      return chainTokens;
    },
    [vaultData],
  );

  const filteredChains = useMemo(() => {
    if (!searchQuery) return SUPPORTED_CHAINS;

    return SUPPORTED_CHAINS.filter((chain) => {
      const chainTokens = getTokensForChain(chain);
      const hasMatchingTokens = chainTokens.some((token) =>
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      return (
        chain.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hasMatchingTokens
      );
    });
  }, [searchQuery, getTokensForChain]);

  // Decide what to display in the selector button
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
    } else if (!walletAddress) {
      return <span className="text-white">Select Token</span>;
    } else {
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
              sizes="24px"
            />
            <span className="text-white">{defaultToken.symbol}</span>
          </>
        );
      } else {
        return <span className="text-white">Select Token</span>;
      }
    }
  }, [selectedToken, walletAddress, findClosestToken]);

  return (
    <div className="chain-token-selector relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (vaultData?.id) {
            const isTxIsInProggress = CheckTheTxIsInProgress(vaultData?.id);
            if (isTxIsInProggress) return;
          }
          setIsOpen(!isOpen);
        }}
        className={`fluid-hover-button flex items-center space-x-2 rounded-lg px-4 py-2 ${className}`}
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
                ? chainTokens.filter((token) =>
                    token.symbol
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                  )
                : chainTokens;

              if (searchQuery && filteredTokens.length === 0) return null;

              // Don't show empty chains
              if (filteredTokens.length === 0) return null;

              return (
                <div key={chain.id}>
                  <button
                    onClick={(e) => handleChainClick(chain.id, e)}
                    className={`chain-button ${activeChain?.id === chain.id ? "active-chain" : ""}`}
                  >
                    <div className="flex items-center space-x-3">
                      {chain.icon && (
                        <Image
                          src={chain.icon.url}
                          alt={chain.name || ""}
                          width={24}
                          height={24}
                          className="chain-icon"
                          sizes="24px"
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
                      className={`w-5 h-5 text-white transition-transform ${
                        expandedChain === chain.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {(expandedChain === chain.id || searchQuery) &&
                    filteredTokens.length > 0 && (
                      <div className="token-list">
                        {filteredTokens.map((token) => {
                          // Mark vault tokens with a highlight indicator
                          const isVaultToken =
                            vaultData?.inputToken?.address === token.address;

                          // Special handling for native tokens (having zero address)
                          const isNativeToken =
                            token.address ===
                              "0x0000000000000000000000000000000000000000" ||
                            token.address ===
                              "11111111111111111111111111111111"; // Solana native

                          // For native tokens, check both address and symbol
                          // For non-native tokens, just check the address
                          const isSelectedToken = isNativeToken
                            ? selectedToken?.address === token.address &&
                              selectedToken?.symbol === token.symbol
                            : selectedToken?.address === token.address;

                          return (
                            <button
                              key={token.address + token.symbol}
                              onClick={(e) =>
                                handleTokenSelect(token, chain, e)
                              }
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
