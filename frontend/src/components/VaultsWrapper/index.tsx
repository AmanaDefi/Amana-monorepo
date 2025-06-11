import { useState, useMemo, useEffect, useRef } from "react";
import {
  VaultData,
  VaultAPY,
  VaultTotalAssets,
  UserVaultBalance,
} from "@/types/types";
import LoadingLogo from "../LoadingLogo";
import { VaultFilters } from "./components/VaultFilters";
import { VaultCard } from "./components/VaultCard";
import { VaultRow } from "./components/VaultRow";
import { AppButton } from "../button/AppButton";
import classNames from "classnames";
import { useLayoutStore } from "@/store/store";

export const calculateRiskLevel = (vault: VaultData): number => {
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
  const [searchTerm, setSearchTerm] = useState("");
  const [chainFilter, setChainFilter] = useState<string>("");
  const [protocolFilter, setProtocolFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("apy");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [displayType, setDisplayType] = useState<"cards" | "list">("cards");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemsPerPage = useLayoutStore((state) => state.itemsPerPage);
  const setItemsPerPage = useLayoutStore((state) => state.setItemsPerPage);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width >= 1805) {
        setItemsPerPage(8);
      } else {
        setItemsPerPage(8);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [setItemsPerPage]);

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

  const sortedVaults = useMemo(() => {
    return [...filteredVaults].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy.toLowerCase()) {
        case "apy":
          aValue = Number(
            vaultAPYs.find((apy) => apy.vaultId === a.id)?.APY7d || 0,
          );
          bValue = Number(
            vaultAPYs.find((apy) => apy.vaultId === b.id)?.APY7d || 0,
          );
          break;
        case "tvl":
          aValue = Number(
            vaultTotalAssets.find((asset) => asset.vaultId === a.id)
              ?.totalAssets || 0,
          );
          bValue = Number(
            vaultTotalAssets.find((asset) => asset.vaultId === b.id)
              ?.totalAssets || 0,
          );
          break;
        case "risk":
          aValue = calculateRiskLevel(a);
          bValue = calculateRiskLevel(b);
          break;
        default:
          return 0;
      }

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });
  }, [filteredVaults, sortBy, sortOrder, vaultAPYs, vaultTotalAssets]);

  const paginatedVaults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedVaults.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedVaults, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedVaults.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    chainFilter,
    protocolFilter,
    sortBy,
    sortOrder,
    itemsPerPage,
  ]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setChainFilter("");
    setProtocolFilter("");
    setSortBy("apy");
    setSortOrder("desc");
  };

  if (loading) return <LoadingLogo />;

  return (
    <div
      ref={containerRef}
      className="font-gotham flex flex-col w-full h-full border border-[#302E44] rounded-3xl p-6 justify-between"
    >
      <div>
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

        <div className="text-gray-400 mb-4 text-sm">
          Showing {paginatedVaults.length} of {filteredVaults.length} vaults
        </div>

        {displayType === "cards" ? (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
            }}
          >
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
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-row items-center justify-between">
              <p className="w-[30%] mr-[10%] text-center">Pool</p>
              <div className="w-[60%] flex flex-row items-center">
                <p className="w-[40%] text-center xl:pl-[10%]">TVL</p>
                <p className="w-[60%] text-center pr-[20%]">APY</p>
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
        )}

        {paginatedVaults.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-3">
            <p className="text-white text-lg">
              No vaults found matching your filters
            </p>
            <div className="w-[180px]">
              <AppButton onClick={clearAllFilters}>
                <span className="relative z-2">Clear Filters</span>
              </AppButton>
            </div>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex gap-2 flex-row items-center">
            <div className={`${currentPage === 1 && "cursor-not-allowed"}`}>
              <AppButton
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ←
              </AppButton>
            </div>

            {Array.from({ length: totalPages }).map((_, index) => (
              <div key={index} className="w-12">
                <AppButton
                  isBlue={index + 1 === currentPage}
                  onClick={() => setCurrentPage(index + 1)}
                >
                  {index + 1}
                </AppButton>
              </div>
            ))}

            <div
              className={`${currentPage === totalPages && "cursor-not-allowed"}`}
            >
              <AppButton
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
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
