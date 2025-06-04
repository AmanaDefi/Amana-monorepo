import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  VaultData,
  VaultAPY,
  VaultTotalAssets,
  UserVaultBalance,
} from "@/types/types";
import { useMultiChain } from "@/providers/MultiChainProvider";
import LoadingLogo from "../LoadingLogo";
import { VaultFilters } from "./components/VaultFilters";
import { VaultCard } from "./components/VaultCard";
import { VaultRow } from "./components/VaultRow";

export const calculateRiskLevel = (vault: VaultData): number => {
  // Temporarily setting all vaults to low risk (1) until proper risk calculation is implemented
  return 1;
};

interface VaultsGridProps {
  loading: boolean;
  vaults: VaultData[];
  vaultAPYs: VaultAPY[];
  userVaultBalances: UserVaultBalance[];
  vaultTotalAssets: VaultTotalAssets[];
}

const VaultsGrid: React.FC<VaultsGridProps> = ({
  loading,
  vaults,
  vaultAPYs,
  userVaultBalances,
  vaultTotalAssets,
}) => {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [chainFilter, setChainFilter] = useState<string>("");
  const [protocolFilter, setProtocolFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("apy");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [displayType, setDisplayType] = useState<"cards" | "list">("cards");

  const itemsPerPage = 6;

  const filteredVaults = useMemo(() => {
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
  }, [vaults, searchTerm, chainFilter, protocolFilter]);

  // Sort vaults based on selected criteria
  const sortedVaults = useMemo(() => {
    return [...filteredVaults].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy.toLowerCase()) {
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
  }, [filteredVaults, sortBy, sortOrder, vaultAPYs, vaultTotalAssets]);

  // Pagination logic
  const paginatedVaults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedVaults.slice(startIndex, endIndex);
  }, [sortedVaults, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedVaults.length / itemsPerPage);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, chainFilter, protocolFilter, sortBy, sortOrder]);

  const handleVaultClick = (vaultId: string) => {
    router.push(`/vaults/${vaultId}`);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setChainFilter("");
    setProtocolFilter("");
    setSortBy("apy");
    setSortOrder("desc");
  };

  if (loading) {
    return <LoadingLogo />;
  }

  return (
    <div className="w-full border border-[#302E44] rounded-3xl p-6">
      <VaultFilters
        vaults={vaults}
        setSortOrder={setSortOrder}
        sortOrder={sortOrder}
        chainFilter={chainFilter}
        setChainFilter={setChainFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        protocolFilter={protocolFilter}
        setProtocolFilter={setProtocolFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        clearAllFilters={clearAllFilters}
        setDisplayType={setDisplayType}
        displayType={displayType}
      />

      {displayType === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedVaults.map((vault) => {
            return (
              <VaultCard
                key={vault.id}
                vault={vault}
                vaultAPYs={vaultAPYs}
                vaultTotalAssets={vaultTotalAssets}
                userVaultBalances={userVaultBalances}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {paginatedVaults.map((vault) => {
            return (
              <VaultRow
                key={vault.id}
                vault={vault}
                vaultAPYs={vaultAPYs}
                vaultTotalAssets={vaultTotalAssets}
              />
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {paginatedVaults.length === 0 && (
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
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md ${
                currentPage === 1
                  ? "bg-customNeutral300 text-gray-500 cursor-not-allowed"
                  : "bg-customNeutral300 text-white hover:bg-customNeutral100"
              }`}
            >
              ←
            </button>

            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
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
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md ${
                currentPage === totalPages
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
