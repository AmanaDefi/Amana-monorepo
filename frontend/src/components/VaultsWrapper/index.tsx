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
import { useUser } from "@account-kit/react";

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

  const [isShownMyVaults, setIsShownMyVaults] = useState(
    !!Number(
      vaults?.some(
        (vault) =>
          userVaultBalances?.find((balance) => balance?.vaultId === vault?.id)
            ?.balance,
      ),
    ),
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemsPerPage = useLayoutStore((state) => state.itemsPerPage);
  const setItemsPerPage = useLayoutStore((state) => state.setItemsPerPage);
  const user = useUser();

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

  const MyVaults = useMemo(() => {
    return filteredVaults.filter((vault) => {
      const hasDeposited = userVaultBalances
        ? !!Number(
            userVaultBalances?.find((balance) => balance?.vaultId === vault?.id)
              ?.balance,
          )
        : false;

      return hasDeposited;
    });
  }, [filteredVaults, userVaultBalances]);

  const vaultsList = useMemo(() => {
    if (isShownMyVaults) {
      return MyVaults;
    }

    return filteredVaults;
  }, [MyVaults, filteredVaults, isShownMyVaults]);

  const sortedVaults = useMemo(() => {
    return [...vaultsList].sort((a, b) => {
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
  }, [vaultsList, sortBy, sortOrder, vaultAPYs, vaultTotalAssets]);

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
          isShownMyVaults={isShownMyVaults}
          setIsShownMyVaults={setIsShownMyVaults}
          shouldShowTabs={!!user && !!MyVaults?.length}
        />

        <div className="text-gray-400 mb-4 text-sm">
          Showing {paginatedVaults.length} of {vaultsList.length} vaults
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
        )}

        {vaultsList.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-3">
            <p className="text-white text-lg">No vaults found.</p>
            <div className="w-[180px]">
              <AppButton variant="reverse" onClick={clearAllFilters}>
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
                variant="gray"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ←
              </AppButton>
            </div>

            {Array.from({ length: totalPages }).map((_, index) => (
              <div key={index} className="w-12">
                <AppButton
                  variant={index + 1 === currentPage ? "blue" : "gray"}
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
                variant="gray"
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
