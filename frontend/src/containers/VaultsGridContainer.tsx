"use client";

import { useState } from "react";
import { useVaultDataPaginated } from "@/hooks/useVaultData";
import VaultsGrid from "../components/VaultsGrid";
import { useLayoutStore } from "@/store/store";

const VaultsGridContainer = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('tvl');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const itemsPerPage = useLayoutStore((state) => state.itemsPerPage);

  const {
    loading,
    vaults,
    vaultAPYs,
    userVaultBalances,
    vaultTotalAssets,
    totalCount,
    totalPages,
    hasNextPage,
    hasPrevPage,
    hasError,
    error
  } = useVaultDataPaginated(currentPage, itemsPerPage, sortBy, sortOrder);

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

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-semibold mb-4">Unable to load vaults</h2>
        <p className="text-gray-600 mb-4">
          There was an error loading vault data. Please try again later.
        </p>
        <p className="text-sm text-gray-500">
          Error: {error?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <VaultsGrid
        loading={loading}
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
      />
    </div>
  );
};

export default VaultsGridContainer;
