import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  VaultData,
  VaultAPY,
  VaultTotalAssets,
  VaultTotalAssetsinToken,
  UserVaultBalance
} from '@/types/types';
import { formatNumberWithSuffix, getOnlyTokenSymbol, formatBalance, formatTokenBalance } from '@/utils/utils';
import { formatTokenBalanceUSD } from '@/utils/tokenFormat';
import LoadingLogo from './LoadingLogo';
import { useMultiChain } from '@/providers/MultiChainProvider';
import { useTokenPriceBySymbol } from '@/hooks/hooks';
import PointsIcon from "@/components/svg/PointsIcon";
import ResponsiveTooltip from "@/components/common/Tooltip";

import { useLayoutStore } from "@/store/store";
// import { formatTokenBalance } from '@/utils/utils';

// Risk levels mapping
export const RISK_LEVELS: Record<number, { level: string; color: string }> = {
  1: { level: "A", color: "bg-green-500" },
  2: { level: "B", color: "bg-yellow-500" },
  3: { level: "C", color: "bg-red-500" },
};

// Calculate risk level based on protocol (this is just an example, you'd want to use real risk metrics)
const calculateRiskLevel = (vault: VaultData): number => {
  // Temporarily setting all vaults to low risk (1) until proper risk calculation is implemented
  return 1;
};

// Helper function to check if a token is a stablecoin
const isStablecoin = (symbol: string): boolean => {
  const baseSymbol = symbol.split('.')[0].toUpperCase();
  return ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'FRAX', 'LUSD'].includes(baseSymbol);
};

// Helper function to format TVL in USD terms with proper K/M/B suffix
const formatTVLInUSD = (totalAssets: string | number, inputTokenSymbol: string, tokenPrice: number = 0): string => {
  const totalAssetsNumber = Number(totalAssets || 0);
  
  if (totalAssetsNumber === 0) {
    return "0";
  }
  
  // Check if the token is a stablecoin
  if (isStablecoin(inputTokenSymbol)) {
    // For stablecoins, the value is already in USD terms
    return formatNumberWithSuffix(totalAssetsNumber);
  } else {
    // For native tokens (like ETH), convert to USD using token price
    const usdValue = totalAssetsNumber * tokenPrice;
    return formatNumberWithSuffix(usdValue);
  }
};

// Generate a deterministic capacity percentage based on vault ID
// This ensures consistent values across renders but is still just mock data
const calculateCapacityPercentage = (vaultId: string): number => {
  // Use the last 2 characters of the ID to generate a number between 0-99
  const lastTwoChars = vaultId.slice(-2);
  // Convert hex to decimal and cap at 95%
  const decimal = parseInt(lastTwoChars, 16) % 96;
  // Ensure a minimum of 30%
  return Math.max(30, decimal);
};

interface VaultsGridProps {
  loading: boolean;
  vaults: VaultData[];
  vaultAPYs: VaultAPY[];
  userVaultBalances: UserVaultBalance[];
  vaultTotalAssets: VaultTotalAssets[];
  vaultTotalAssetsinToken?: VaultTotalAssetsinToken[];
  // Pagination
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  onPageChange?: (page: number) => void;
  // Sorting
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (sortBy: string, sortOrder: "asc" | "desc") => void;
}



const VaultsGrid: React.FC<VaultsGridProps> = ({
  loading,
  vaults,
  vaultAPYs,
  userVaultBalances,
  vaultTotalAssets,
  vaultTotalAssetsinToken = [],
  // Pagination
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  pageSize = 6,
  onPageChange,
  // Sorting
  sortBy: externalSortBy = "apy",
  sortOrder: externalSortOrder = "desc",
  onSortChange,
}) => {
  const router = useRouter();
  const { walletAddress } = useMultiChain();
  const filterRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State for filters and sorting""
  const [searchTerm, setSearchTerm] = useState("");
  const [chainFilter, setChainFilter] = useState<string>("");
  const [protocolFilter, setProtocolFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>(externalSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(externalSortOrder);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Use useLayoutStore for adaptive page size
  const itemsPerPage = useLayoutStore((state) => state.itemsPerPage);
  const setItemsPerPage = useLayoutStore((state) => state.setItemsPerPage);

  // Adaptive logic for VaultsGrid
  useEffect(() => {
    const updatePageSize = () => {
      const width = window.innerWidth;
      const newSize = width >= 1805 ? 8 : 6;
      if (newSize !== itemsPerPage) {
        setItemsPerPage(newSize);
      }
    };

    updatePageSize();
    window.addEventListener("resize", updatePageSize);

    return () => {
      window.removeEventListener("resize", updatePageSize);
    };
  }, [setItemsPerPage, itemsPerPage]);

  useEffect(() => {
    setSortBy(externalSortBy);
    setSortOrder(externalSortOrder);
  }, [externalSortBy, externalSortOrder]);

  const shouldUseLocalFiltering = !onPageChange || !onSortChange;

  // Extract unique chains and protocols for filters
  const chains = useMemo(() => {
    return Array.from(new Set(vaults.map((vault) => vault.protocol.network)));
  }, [vaults]);

  const protocols = useMemo(() => {
    return Array.from(new Set(vaults.map((vault) => vault.protocol.name)));
  }, [vaults]);

  // Filter vaults based on search, chain, and protocol
  const filteredVaults = useMemo(() => {
    if (!shouldUseLocalFiltering) {
      return vaults;
    }

    return vaults.filter((vault) => {
      const matchesSearch =
        searchTerm === "" ||
        vault.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vault.protocol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vault.protocol.network.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesChain =
        chainFilter === "" || vault.protocol.network === chainFilter;

      const matchesProtocol =
        protocolFilter === "" || vault.protocol.name === protocolFilter;

      return matchesSearch && matchesChain && matchesProtocol;
    });
  }, [
    vaults,
    searchTerm,
    chainFilter,
    protocolFilter,
    shouldUseLocalFiltering,
  ]);

  // Sort vaults based on selected criteria
  const sortedVaults = useMemo(() => {
    if (!shouldUseLocalFiltering) {
      return filteredVaults;
    }

    return [...filteredVaults].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "apy":
          aValue = Number(
            vaultAPYs.find((apy: VaultAPY) => apy.vaultId === a.id)?.APY7d || 0,
          );
          bValue = Number(
            vaultAPYs.find((apy: VaultAPY) => apy.vaultId === b.id)?.APY7d || 0,
          );
          break;
        case "tvl":
          aValue = Number(
            vaultTotalAssets.find(
              (asset: VaultTotalAssets) => asset.vaultId === a.id,
            )?.totalAssets || 0,
          );
          bValue = Number(
            vaultTotalAssets.find(
              (asset: VaultTotalAssets) => asset.vaultId === b.id,
            )?.totalAssets || 0,
          );
          break;
        case "risk":
          aValue = calculateRiskLevel(a);
          bValue = calculateRiskLevel(b);
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [
    filteredVaults,
    sortBy,
    sortOrder,
    vaultAPYs,
    vaultTotalAssets,
    shouldUseLocalFiltering,
  ]);

  // Pagination logic
  const paginatedVaults = useMemo(() => {
    if (!shouldUseLocalFiltering) {
      return sortedVaults;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedVaults.slice(startIndex, endIndex);
  }, [sortedVaults, currentPage, pageSize, shouldUseLocalFiltering]);

  const localTotalPages = Math.ceil(sortedVaults.length / pageSize);
  const displayTotalPages = shouldUseLocalFiltering
    ? localTotalPages
    : totalPages;
  const displayTotalCount = shouldUseLocalFiltering
    ? filteredVaults.length
    : totalCount;

  const handleSortChange = (
    newSortBy: string,
    newSortOrder: "asc" | "desc",
  ) => {
    if (onSortChange) {
      onSortChange(newSortBy, newSortOrder);
    } else {
      setSortBy(newSortBy);
      setSortOrder(newSortOrder);
    }
  };

  const toggleSortOrder = () => {
    const newOrder = sortOrder === "asc" ? "desc" : "asc";
    handleSortChange(sortBy, newOrder);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setChainFilter("");
    setProtocolFilter("");
    handleSortChange("apy", "desc");
  };

  // Reset pagination when filters change
  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage);
    }
  }, [currentPage, onPageChange]);

  // Handle clicks outside the filter dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setShowMobileFilters(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleVaultClick = (vaultId: string) => {
    router.push(`/vaults/${vaultId}`);
  };

  // Create a mapping of token prices
  const tokenPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    return prices;
  }, []);

  // Use hooks to get prices for each unique token
  const ethPrice = useTokenPriceBySymbol("ETH");
  const wethPrice = useTokenPriceBySymbol("WETH");
  const msethPrice = useTokenPriceBySymbol("msETH");
  
  // Update tokenPrices object
  useEffect(() => {
    tokenPrices["ETH.ETH"] = ethPrice;
    tokenPrices["WETH"] = wethPrice;
    tokenPrices["msETH"] = msethPrice;
  }, [ethPrice, wethPrice, msethPrice, tokenPrices]);

  // Helper function to get token price
  const getTokenPrice = useCallback((tokenSymbol: string): number => {
    // For stablecoins, return 1 as they're pegged to USD
    if (isStablecoin(tokenSymbol)) {
      return 1;
    }
    
    // For other tokens, try to get their price
    return tokenPrices[tokenSymbol] || 0;
  }, [tokenPrices]);

  if (loading) {
    return <LoadingLogo />;
  }

  return (
    <div className="w-full" ref={containerRef}>
      {/* Mobile Filter Button */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full p-3 bg-customNeutral200 text-white rounded-lg flex justify-between items-center"
        >
          <span>Filter & Sort Vaults</span>
          <span>{showMobileFilters ? "↑" : "↓"}</span>
        </button>
      </div>

      {/* Filters and Sort Section */}
      <div
        ref={filterRef}
        className={`bg-customNeutral200 p-4 rounded-lg mb-6 ${showMobileFilters ? "block" : "hidden md:block"}`}
      >
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search vaults..."
              className="w-full p-2 rounded-md bg-customNeutral300 text-white border border-customNeutral100 focus:border-cyan-400 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="p-2 rounded-md bg-customNeutral300  text-white border border-customNeutral100 focus:border-cyan-400 focus:outline-none"
              value={chainFilter}
              onChange={(e) => setChainFilter(e.target.value)}
            >
              <option value="">All Chains</option>
              {chains.map((chain) => (
                <option key={chain} value={chain}>
                  {chain}
                </option>
              ))}
            </select>
            <select
              className="p-2 rounded-md bg-customNeutral300 text-white border border-customNeutral100 focus:border-cyan-400 focus:outline-none"
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
            >
              <option value="">All Protocols</option>
              {protocols.map((protocol) => (
                <option key={protocol} value={protocol}>
                  {protocol}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
          <div className="text-white mr-2 flex items-center">Sort by:</div>
          {["apy", "tvl", "risk"].map((option) => (
            <button
              key={option}
              onClick={() => {
                if (sortBy === option) {
                  toggleSortOrder();
                } else {
                  handleSortChange(option, "desc");
                }
              }}
              className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${
                sortBy === option
                  ? "bg-gradient-to-r from-[#262830] to-[#06afbc] text-white"
                  : "bg-customNeutral300 text-white"
                }`}
            >
              {option.toUpperCase()}
              {sortBy === option && (
                <span className="ml-1">{sortOrder === "desc" ? "↓" : "↑"}</span>
              )}
            </button>
          ))}
        </div>

        {/* Active filters display and clear button */}
        {(searchTerm || chainFilter || protocolFilter) && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-customNeutral100">
            <div className="text-white mr-2 flex items-center text-sm">
              Active filters:
            </div>
            {searchTerm && (
              <div className="px-2 py-1 bg-customNeutral300 rounded-md text-xs text-white flex items-center gap-1">
                <span>Search: {searchTerm}</span>
                <button
                  onClick={() => setSearchTerm("")}
                  className="ml-1 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}
            {chainFilter && (
              <div className="px-2 py-1 bg-customNeutral300 rounded-md text-xs text-white flex items-center gap-1">
                <span>Chain: {chainFilter}</span>
                <button
                  onClick={() => setChainFilter("")}
                  className="ml-1 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}
            {protocolFilter && (
              <div className="px-2 py-1 bg-customNeutral300 rounded-md text-xs text-white flex items-center gap-1">
                <span>Protocol: {protocolFilter}</span>
                <button
                  onClick={() => setProtocolFilter("")}
                  className="ml-1 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}
            <button
              onClick={clearAllFilters}
              className="px-2 py-1 text-xs text-cyan-400 hover:text-cyan-300"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-gray-400 mb-4 text-sm">
        Showing {paginatedVaults.length} of {displayTotalCount} vaults
      </div>

      {/* Vaults Grid */}
      <div
        className="grid gap-2 md:gap-4 
  grid-cols-[repeat(auto-fit,minmax(350px,1fr))]
  md:grid-cols-[repeat(auto-fit,minmax(380px,1fr))]
  xl:grid-cols-[repeat(auto-fit,minmax(400px,1fr))]"
      >
        {paginatedVaults.map((vault) => {
          const vaultAPY = vaultAPYs.find((apy) => apy.vaultId === vault.id);

          // const totalAssets = vaultTotalAssets.find(
          //   (asset) => asset.vaultId === vault.id,
          // );

          const vaultTotalAssetsData = vaultTotalAssets.find((asset: VaultTotalAssets) => asset.vaultId === vault.id);

          const riskLevel = calculateRiskLevel(vault);
          const capacityPercentage = calculateCapacityPercentage(vault.id);

          return (
            <div
              key={vault.id}
              className="bg-customNeutral200 rounded-lg overflow-hidden border border-customNeutral100 hover:border-cyan-400 transition-all cursor-pointer"
              onClick={() => handleVaultClick(vault.id)}
            >
              {/* Card Header with Protocol and Risk (was Chain) */}
              <div className="flex justify-between items-center p-3 bg-customNeutral300 border-b border-customNeutral100">
                <div className="flex items-center gap-2 ml-[10px]">
                  <Image
                    src={vault.protocol.imgURL || ""}
                    alt={vault.protocol.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                    sizes="24px"
                  />
                  <div className="flex items-center">
                    <span className="text-gray-400 md:block hidden">
                      Protocol:
                    </span>
                    <span className="text-white font-medium md:ml-1">
                      {vault.protocol.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mr-[10px]">
                  <span className="text-gray-400 text-xs">Risk:</span>
                  <div
                    className={`w-3 h-3 rounded-full ${RISK_LEVELS[riskLevel].color}`}
                  ></div>
                  <span className="text-white text-xs">
                    {RISK_LEVELS[riskLevel].level}
                  </span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-4">
                <div className="flex md:flex-row flex-col gap-2 justify-between">
                  <div className="flex items-center gap-3 mb-3 p-2 rounded-md">
                    <Image
                      src={vault.inputToken.imgURL}
                      alt={vault.inputToken.symbol}
                      width={36}
                      height={36}
                      className="rounded-full"
                      sizes="36px"
                    />
                    <div>
                      <p className="text-white font-medium">{vault.name}</p>
                    </div>
                  </div>
                  {/* Chain with Logo (was Lending Pool) */}
                  <div className="flex items-center gap-3 mb-3 p-2 rounded-md">
                    <Image
                      src={vault.imgURL || ""}
                      alt={vault.protocol.network}
                      width={36}
                      height={36}
                      className="rounded-full"
                      sizes="36px"
                    />
                    <div>
                      <span className="text-gray-400 text-xs">Chain</span>
                      <h3 className="text-white font-bold">
                        {vault.protocol.network}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* APY and TVL */}
                <div className="grid grid-cols-2 gap-2 p-3">
                  <div className="bg-customNeutral300 p-3 rounded-md">
                    <p className="text-gray-400 text-xs mb-1">APY (7d)</p>
                    <div className="flex items-center gap-1">
                    <p className="text-cyan-400 font-bold text-xl">
                      {`${(Number(vaultAPY?.APY7d || 0) * 100).toFixed(2)}%`}
                    </p>
                      {/* Points Icon and Tooltip - using vault data from subgraph */}
                      {vault.protocolPoints && vault.protocolPoints > 0 && (
                        <div className="flex items-center">
                          <button
                            id={`points-tooltip-${vault.id}`}
                            className="ml-1"
                          >
                            <PointsIcon className="w-4 h-4" color="#06afbc" />
                          </button>
                          <ResponsiveTooltip
                            id={`points-tooltip-${vault.id}`}
                            content={
                              <div className="w-48">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-gray-300 text-sm">
                                    {vault.protocol.name} native yield
                                  </span>
                                  <span className="text-cyan-400 font-medium">
                                    {`${(Number(vaultAPY?.APY7d || 0) * 100).toFixed(2)}%`}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-300 text-sm">
                                    {vault.protocolPointsDescription || `+ ${vault.protocol.name} Points`}
                                  </span>
                                  <span className="text-white font-medium">
                                    {vault.protocolPoints} pts/$/day
                                  </span>
                                </div>
                              </div>
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-customNeutral300 p-3 rounded-md">
                    <p className="text-gray-400 text-xs mb-1">TVL</p>
                    <p className="text-white font-bold text-xl">
                        {formatTVLInUSD(Number(vaultTotalAssetsData?.totalAssets || 0), vault.inputToken.symbol, getTokenPrice(vault.inputToken.symbol))}
                    </p>
                  </div>
                </div>

                {/* Capacity Bar */}
                <div className="mb-4">
                  {/* <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Capacity</span>
                    <span>{capacityPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-customNeutral300 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-[#262830] to-[#06afbc] h-2 rounded-full" 
                      style={{ width: `${capacityPercentage}%` }}
                    ></div>
                  </div> */}

                  {/* User Deposits */}
                  {walletAddress && (
                    <div className="mt-2 px-3">
                      <div className="flex justify-around text-[16px] mb-1">
                        <span className="text-gray-400">Your Deposits:</span>
                        <span className="text-white font-medium">
                          {formatTokenBalanceUSD(
                            userVaultBalances.find(
                              (balance: UserVaultBalance) =>
                                balance.vaultId === vault.id,
                            )?.balance || 0,
                            vault.inputToken.symbol,
                            getTokenPrice(vault.inputToken.symbol),
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <button
                    className="flex-1 fluid-hover-button text-white py-2 px-4 rounded-md transition-all"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      router.push(`/vaults/${vault.id}?tab=deposit`);
                    }}
                  >
                    <span className="relative z-2">Deposit</span>
                  </button>

                  {userVaultBalances.find(
                    (balance: UserVaultBalance) => balance.vaultId === vault.id,
                  )?.balance &&
                    Number(
                      userVaultBalances.find(
                        (balance: UserVaultBalance) =>
                          balance.vaultId === vault.id,
                      )?.balance,
                    ) > 0 && (
                      <button
                        className="flex-1 border border-customNeutral100 hover:border-cyan-400 text-white py-2 px-4 rounded-md transition-all"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          router.push(`/vaults/${vault.id}?tab=withdraw`);
                        }}
                      >
                        Withdraw
                      </button>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {paginatedVaults.length === 0 && !loading && (
        <div className="text-center py-12 bg-customNeutral200 rounded-lg">
          <p className="text-white text-lg">
            No vaults found matching your filters
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-4 fluid-hover-button text-white py-2 px-4 rounded-md"
          >
            <span className="relative z-2">Clear Filters</span>
          </button>
        </div>
      )}

      {/* Pagination */}
      {displayTotalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (onPageChange) {
                  onPageChange(Math.max(currentPage - 1, 1));
                }
              }}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md ${
                currentPage === 1
                  ? "bg-customNeutral300 text-gray-500 cursor-not-allowed"
                  : "bg-customNeutral300 text-white hover:bg-customNeutral100"
                }`}
            >
              ←
            </button>
            {Array.from({ length: displayTotalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (onPageChange) {
                    onPageChange(index + 1);
                  }
                }}
                className={`px-3 py-1 rounded-md ${
                  currentPage === index + 1
                    ? "bg-gradient-to-r from-[#262830] to-[#06afbc] text-white"
                    : "bg-customNeutral300 text-white hover:bg-customNeutral100"
                  }`}
              >
                {index + 1}
              </button>
            ))}

            <button
              onClick={() => {
                if (onPageChange) {
                  onPageChange(Math.min(currentPage + 1, displayTotalPages));
                }
              }}
              disabled={currentPage === displayTotalPages}
              className={`px-3 py-1 rounded-md ${
                currentPage === displayTotalPages
                  ? "bg-customNeutral300 text-gray-500 cursor-not-allowed"
                  : "bg-customNeutral300 text-white hover:bg-customNeutral100"
                }`}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultsGrid;
