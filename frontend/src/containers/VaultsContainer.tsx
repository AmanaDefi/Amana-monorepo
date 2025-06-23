"use client";

import { useState, useEffect } from "react";
import VaultsGrid from "../components/VaultsWrapper";
import { Chain } from "viem";
import { UseUserResult } from "@account-kit/react";
import { useVaultDataWithSearch } from "@/hooks/useVaultData";
import { useLayoutStore } from "@/store/store";

interface VaultsContainerProps {
  activeChain?: Chain; // Make activeChain optional
  defaultAccount?: UseUserResult; // Optional default account
}

const VaultsContainer: React.FC<VaultsContainerProps> = () => {

  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('tvl');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [chainFilter, setChainFilter] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('');

  const itemsPerPage = useLayoutStore((state) => state.itemsPerPage);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 800);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    loading,
    vaults,
    vaultAPYs,
    userVaultBalances,
    vaultTotalAssets,
    hasError,
    error,
    totalCount,
    totalPages,
    hasNextPage,
    hasPrevPage,
    hasSearchTerm,
    networkFilter,
    hasNetworkFilter,
    timedOut,
    _debug
  } = useVaultDataWithSearch(debouncedSearchTerm, currentPage, itemsPerPage, sortBy, sortOrder, chainFilter, protocolFilter);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    if (newSortBy !== sortBy || newSortOrder !== sortOrder) {
      setSortBy(newSortBy);
      setSortOrder(newSortOrder);
      setCurrentPage(1);
    }
  };

  const handleSearchChange = (newSearchTerm: string) => {
    if (newSearchTerm !== searchTerm) {
      setSearchTerm(newSearchTerm);
      setCurrentPage(1);
    }
  };

  if (hasError) {
    const isSearchError = error?.message?.includes('Search') || error?.message?.includes('timeout');

    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-semibold mb-4">
          {isSearchError ? 'Search Error' : 'Unable to load vaults'}
        </h2>
        <p className="text-gray-600 mb-4">
          {isSearchError
            ? 'The search request timed out or failed. Please try a different search term or try again later.'
            : 'There was an error loading vault data. Please try again later.'
          }
        </p>
        {isSearchError && (
          <button
            onClick={() => setSearchTerm('')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Clear Search
          </button>
        )}
      </div>
    );
  }

  const isSearching = searchTerm !== debouncedSearchTerm && searchTerm.length > 0;

  const isSearchTermTooLong = searchTerm.length > 100;

  const shouldShowLoading = (!timedOut && (loading ||
    (vaults.length > 0 && vaultAPYs.length === 0) ||
    (vaults.length > 0 && vaultTotalAssets.length === 0) ||
    (vaults.length === 0 && !hasError) ||
    isSearching));

  if (isSearchTermTooLong) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-semibold mb-4 text-orange-600">Search Term Too Long</h2>
        <p className="text-gray-600 mb-4">
          Search term cannot exceed 100 characters. Please shorten your search query.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Current length: {searchTerm.length} characters
        </p>
        <button
          onClick={() => setSearchTerm('')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Clear Search
        </button>
      </div>
    );
  }

  if (timedOut && vaults.length === 0 && debouncedSearchTerm.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-semibold mb-4">No Results Found</h2>
        <p className="text-gray-600 mb-4">We could not find any vaults matching your search query.</p>
        <button
          onClick={() => setSearchTerm('')}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Clear Search
        </button>
      </div>
    );
  }

  return (
    <VaultsGrid
      loading={shouldShowLoading}
      vaults={vaults}
      vaultAPYs={vaultAPYs}
      userVaultBalances={userVaultBalances}
      vaultTotalAssets={vaultTotalAssets}
      // Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={itemsPerPage}
      hasNextPage={hasNextPage}
      hasPrevPage={hasPrevPage}
      onPageChange={handlePageChange}
      // Sorting
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={handleSortChange}
      // Search
      searchTerm={searchTerm}
      onSearchChange={handleSearchChange}
      hasSearchTerm={!!hasSearchTerm}
      // Network filter
      chainFilter={chainFilter}
      onChainFilterChange={setChainFilter}
      hasNetworkFilter={!!hasNetworkFilter}
      // Protocol filter
      protocolFilter={protocolFilter}
      onProtocolFilterChange={setProtocolFilter}
      hasProtocolFilter={!!protocolFilter}
    />
  );
};

export default VaultsContainer;
