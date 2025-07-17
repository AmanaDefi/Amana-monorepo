import { useState, useMemo, useEffect, SetStateAction } from "react";
import {
  VaultData,
  VaultAPY,
  VaultTotalAssets,
  UserVaultBalance,
} from "@/types/types";
import { DEFAULT_SORT_CONFIG } from "@/constants";
import LoadingLogo from "../LoadingLogo";
import { VaultFilters } from "./components/VaultFilters";
import { VaultCard } from "./components/VaultCard";
import { VaultRow } from "./components/VaultRow";
import { AppButton } from "../button/AppButton";
import { useLayoutStore } from "@/store/store";
import { useMyVaults } from "@/hooks/useMyVaults";
import { EmptyState } from "../DashboardWrapper/components/Tabs";
import { BreathingValue } from "../PendingDots";

export const calculateRiskLevel = (vault: VaultData): number => {
  return 1;
};

interface VaultsGridProps {
  loading: boolean;
  vaults: VaultData[];
  vaultAPYs: VaultAPY[];
  userVaultBalances: UserVaultBalance[];
  vaultTotalAssets: VaultTotalAssets[];
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (sortBy: string, sortOrder: "asc" | "desc") => void;
  searchTerm?: string;
  onSearchChange?: (searchTerm: string) => void;
  hasSearchTerm?: boolean;
  chainFilter?: string;
  onChainFilterChange?: (chainFilter: string) => void;
  hasNetworkFilter?: boolean;
  protocolFilter?: string;
  onProtocolFilterChange?: (protocolFilter: string) => void;
  hasProtocolFilter?: boolean;
}

const VaultsGrid: React.FC<VaultsGridProps> = ({
  loading,
  vaults,
  vaultAPYs,
  userVaultBalances,
  vaultTotalAssets,
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  sortBy: externalSortBy = "apy",
  sortOrder: externalSortOrder = "desc",
  onSortChange,
  searchTerm: externalSearchTerm = "",
  onSearchChange,
  hasSearchTerm: externalHasSearchTerm = false,
  chainFilter: externalChainFilter = "",
  onChainFilterChange,
  hasNetworkFilter = false,
  protocolFilter: externalProtocolFilter = "",
  onProtocolFilterChange,
  hasProtocolFilter = false,
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const searchTerm = onSearchChange ? externalSearchTerm : localSearchTerm;
  const setSearchTerm = onSearchChange
    ? (value: SetStateAction<string>) => {
        const newValue =
          typeof value === "function" ? value(externalSearchTerm) : value;
        onSearchChange(newValue);
      }
    : setLocalSearchTerm;
  const hasSearchTerm = onSearchChange
    ? externalHasSearchTerm
    : searchTerm.length > 0;

  const [localChainFilter, setLocalChainFilter] = useState<string>("");
  const chainFilter = onChainFilterChange
    ? externalChainFilter
    : localChainFilter;
  const setChainFilter = onChainFilterChange
    ? (value: SetStateAction<string>) => {
        const newValue =
          typeof value === "function" ? value(externalChainFilter) : value;
        onChainFilterChange(newValue);
      }
    : setLocalChainFilter;
  const hasNetworkFilterActive = onChainFilterChange
    ? hasNetworkFilter
    : chainFilter.length > 0;

  const [localProtocolFilter, setLocalProtocolFilter] = useState<string>("");
  const protocolFilter = onProtocolFilterChange
    ? externalProtocolFilter
    : localProtocolFilter;
  const setProtocolFilter = onProtocolFilterChange
    ? (value: SetStateAction<string>) => {
        const newValue =
          typeof value === "function" ? value(externalProtocolFilter) : value;
        onProtocolFilterChange(newValue);
      }
    : setLocalProtocolFilter;
  const hasProtocolFilterActive = onProtocolFilterChange
    ? hasProtocolFilter
    : protocolFilter.length > 0;

  const [displayType, setDisplayType] = useState<"cards" | "list">("cards");

  const [sortBy, setSortBy] = useState<string>(externalSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(externalSortOrder);

  const MyVaults = useMyVaults({ vaults, userVaultBalances });

  const [isShownMyVaults, setIsShownMyVaults] = useState(
    !!Number(
      vaults?.some(
        (vault) =>
          userVaultBalances?.find((balance) => balance?.vaultId === vault?.id)
            ?.balance,
      ),
    ),
  );

  const itemsPerPage = useLayoutStore((state) => state.itemsPerPage);
  const setItemsPerPage = useLayoutStore((state) => state.setItemsPerPage);

  useEffect(() => {
    setSortBy(externalSortBy);
    setSortOrder(externalSortOrder);
  }, [externalSortBy, externalSortOrder]);

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

  const vaultsList = useMemo(() => {
    if (isShownMyVaults) {
      return MyVaults;
    }

    return vaults;
  }, [MyVaults, vaults, isShownMyVaults]);

  const shouldUseSubgraphSearch = hasSearchTerm && onSearchChange;
  const shouldUseSubgraphNetworkFilter =
    hasNetworkFilterActive && onChainFilterChange;
  const shouldUseSubgraphProtocolFilter =
    hasProtocolFilterActive && onProtocolFilterChange;

  const shouldUseSubgraphSort = false;

  const shouldUseLocalFiltering =
    !shouldUseSubgraphSearch &&
    !shouldUseSubgraphNetworkFilter &&
    !shouldUseSubgraphProtocolFilter &&
    !shouldUseSubgraphSort;

  const mode = shouldUseSubgraphSearch
    ? "Subgraph Search"
    : shouldUseSubgraphNetworkFilter
      ? "Subgraph Network Filter"
      : shouldUseSubgraphProtocolFilter
        ? "Subgraph Protocol Filter"
        : shouldUseSubgraphSort
          ? "Subgraph Sort"
          : "Local";

  const filteredVaults = useMemo(() => {
    if (!shouldUseLocalFiltering) {
      if (isShownMyVaults) {
        // Filter only vaults with deposits
        return vaultsList.filter((vault) => {
          const hasDeposited = userVaultBalances
            ? !!Number(
                userVaultBalances?.find(
                  (balance) => balance?.vaultId === vault?.id,
                )?.balance,
              )
            : false;
          return hasDeposited;
        });
      }
      return vaultsList;
    }

    // Local filtering for APY and Risk sorting
    return vaultsList.filter((vault) => {
      const matchesSearch =
        searchTerm === "" ||
        vault.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vault.protocol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vault.strategyNetwork || vault.protocol.network)
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesChain =
        chainFilter === "" ||
        (vault.strategyNetwork || vault.protocol.network) === chainFilter;
      const matchesProtocol =
        protocolFilter === "" || vault.protocol.name === protocolFilter;

      return matchesSearch && matchesChain && matchesProtocol;
    });
  }, [
    vaultsList,
    searchTerm,
    chainFilter,
    protocolFilter,
    shouldUseLocalFiltering,
    isShownMyVaults,
    userVaultBalances,
  ]);

  const sortedVaults = useMemo(() => {
    // Helper to compute value for sorting key (APY / Risk only)
    const getSortValue = (vault: VaultData) => {
      switch (sortBy.toLowerCase()) {
        case "apy":
          return Number(
            vaultAPYs.find((apy) => apy.vaultId === vault.id)?.APY7d || 0,
          );
        case "risk":
          return calculateRiskLevel(vault);
        default:
          return 0;
      }
    };

    if (sortBy.toLowerCase() === "tvl") {
      return sortOrder === "asc"
        ? [...filteredVaults].reverse()
        : filteredVaults;
    }

    // If we're relying on remote pagination but sorting field is APY or RISK,
    // we still need to sort the received page locally to ensure numeric order.
    const listToSort = [...filteredVaults];

    // (TVL handled above)

    // Perform local sorting for APY / TVL (My Vaults) / Risk
    return listToSort.sort((a, b) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });
  }, [
    filteredVaults,
    sortBy,
    sortOrder,
    vaultAPYs,
    vaultTotalAssets,
    shouldUseLocalFiltering,
  ]);

  const paginatedVaults = useMemo(() => {
    if (!shouldUseLocalFiltering) {
      return sortedVaults;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedVaults.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedVaults, currentPage, itemsPerPage, shouldUseLocalFiltering]);

  const localTotalPages = Math.ceil(sortedVaults.length / itemsPerPage);

  const displayTotalPages = useMemo(() => {
    if (isShownMyVaults && shouldUseLocalFiltering) {
      const myVaultPages = Math.ceil(MyVaults.length / itemsPerPage);
      return myVaultPages;
    }

    if (isShownMyVaults && !shouldUseLocalFiltering) {
      const myVaultsFromSubgraph = Math.ceil(
        filteredVaults.length / itemsPerPage,
      );
      return myVaultsFromSubgraph;
    }

    const pages = shouldUseLocalFiltering ? localTotalPages : totalPages;
    return pages;
  }, [
    isShownMyVaults,
    MyVaults.length,
    itemsPerPage,
    shouldUseLocalFiltering,
    localTotalPages,
    totalPages,
    filteredVaults.length,
  ]);

  const displayTotalCount = useMemo(() => {
    if (isShownMyVaults && shouldUseLocalFiltering) {
      return MyVaults.length;
    }

    if (isShownMyVaults && !shouldUseLocalFiltering) {
      return filteredVaults.length;
    }

    const count = shouldUseLocalFiltering ? filteredVaults.length : totalCount;
    return count;
  }, [
    isShownMyVaults,
    MyVaults.length,
    shouldUseLocalFiltering,
    filteredVaults.length,
    totalCount,
  ]);

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

  const handleSortByChange = (sortByValue: SetStateAction<string>) => {
    const newSortBy =
      typeof sortByValue === "function" ? sortByValue(sortBy) : sortByValue;
    handleSortChange(newSortBy, sortOrder);
  };

  const handleSortOrderChange = (
    sortOrderValue: SetStateAction<"asc" | "desc">,
  ) => {
    const newSortOrder =
      typeof sortOrderValue === "function"
        ? sortOrderValue(sortOrder)
        : sortOrderValue;
    handleSortChange(sortBy, newSortOrder);
  };

  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    } else {
      if (page >= 1 && page <= localTotalPages) {
      }
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setChainFilter("");
    setProtocolFilter("");
    handleSortChange(DEFAULT_SORT_CONFIG.sortBy, DEFAULT_SORT_CONFIG.sortOrder);
  };

  const renderVaultsContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-20 min-h-[400px]">
          <LoadingLogo />
        </div>
      );
    }

    if (displayType === "cards") {
      return (
        <div className="grid gap-6 md:gap-4 grid-cols-[repeat(auto-fill,minmax(328px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(350px,1fr))]">
          {paginatedVaults.map((vault) => (
            <VaultCard
              key={vault.id}
              vault={vault}
              vaultAPYs={vaultAPYs}
              vaultTotalAssets={vaultTotalAssets}
              userVaultBalances={userVaultBalances}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-center justify-between ">
          <p className="w-[30%] xl:w-[20%] mr-[10%] xl:mr-[20%] text-center">
            Pool
          </p>
          <div className="w-[60%] flex flex-row items-center  xl:mr-[5%]">
            <p className="w-[20%] xl:w-[40%] text-center ">TVL</p>
            <div className="w-[20%]" />
            <p className="w-[30%] xl:w-[60%] text-center">APY</p>
            <div className="w-[30%]" />
          </div>
        </div>
        {paginatedVaults.map((vault) => (
          <VaultRow
            key={vault.id}
            vault={vault}
            vaultAPYs={vaultAPYs}
            vaultTotalAssets={vaultTotalAssets}
          />
        ))}
      </div>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;

    if (paginatedVaults.length === 0) {
      if (isShownMyVaults && !MyVaults?.length) {
        return (
          <EmptyState
            title="No positions"
            description="This account has not yet added any assets"
            action={{
              label: "Earning in one click",
              onClick: () => setIsShownMyVaults(false),
            }}
            className="border-none shadow-none backdrop-blur-none bg-transparent"
          />
        );
      } else {
        return (
          <div className="flex flex-col items-center py-12 gap-3">
            <p className="text-white text-lg">
              {hasNetworkFilterActive && hasProtocolFilterActive
                ? `No vaults found for ${chainFilter} network and ${protocolFilter} protocol.`
                : hasNetworkFilterActive
                  ? `No vaults found for ${chainFilter} network.`
                  : hasProtocolFilterActive
                    ? `No vaults found for ${protocolFilter} protocol.`
                    : hasSearchTerm
                      ? "No vaults found matching your search."
                      : "No vaults found."}
            </p>
            <div className="w-[180px]">
              <AppButton variant="reverse" onClick={clearAllFilters}>
                <span className="relative z-2">Clear Filters</span>
              </AppButton>
            </div>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div className="font-gotham flex flex-col w-full h-full md:border md:border-[#302E44] rounded-3xl md:p-6 justify-between">
      <div className="flex-shrink-0">
        <VaultFilters
          vaults={vaults}
          setSortOrder={handleSortOrderChange}
          sortOrder={sortOrder}
          chainFilter={chainFilter}
          setChainFilter={setChainFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          protocolFilter={protocolFilter}
          setProtocolFilter={setProtocolFilter}
          sortBy={sortBy}
          setSortBy={handleSortByChange}
          onSortChange={handleSortChange}
          clearAllFilters={clearAllFilters}
          setDisplayType={setDisplayType}
          displayType={displayType}
          isShownMyVaults={isShownMyVaults}
          setIsShownMyVaults={setIsShownMyVaults}
        />

        <BreathingValue
          value={
            <div className="text-gray-400 mb-4 text-sm">
              Showing {paginatedVaults.length} of {displayTotalCount} vaults
            </div>
          }
          isBreathing={loading}
        />
      </div>

      <div className="flex-grow">
        {renderVaultsContent()}
        {renderEmptyState()}
      </div>

      {/* Pagination Section */}
      {!loading && displayTotalPages > 1 && (
        <div className="flex justify-center mt-6 flex-shrink-0">
          <div className="flex gap-2 flex-row items-center">
            <div className={`${currentPage === 1 && "cursor-not-allowed"}`}>
              <AppButton
                variant="gray"
                onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
              >
                ←
              </AppButton>
            </div>

            {Array.from({ length: displayTotalPages }).map((_, index) => (
              <div key={index} className="w-12">
                <AppButton
                  variant={index + 1 === currentPage ? "blue" : "gray"}
                  onClick={() => handlePageChange(index + 1)}
                >
                  {index + 1}
                </AppButton>
              </div>
            ))}

            <div
              className={`${currentPage === displayTotalPages && "cursor-not-allowed"}`}
            >
              <AppButton
                variant="gray"
                onClick={() =>
                  handlePageChange(Math.min(currentPage + 1, displayTotalPages))
                }
                disabled={currentPage === displayTotalPages}
              >
                →
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultsGrid;
