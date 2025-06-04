import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  VaultData,
  VaultAPY,
  VaultTotalAssets,
  VaultTotalAssetsinToken,
  UserVaultBalance,
} from "@/types/types";
import { formatNumberWithSuffix, formatTokenBalance } from "@/utils/utils";
import { useMultiChain } from "@/providers/MultiChainProvider";
import LoadingLogo from "../LoadingLogo";
import { VaultFilters } from "./components/VaultFilters";

const RISK_LEVELS: Record<number, { level: string; color: string }> = {
  1: { level: "Low", color: "bg-green-500" },
  2: { level: "Medium", color: "bg-yellow-500" },
  3: { level: "High", color: "bg-red-500" },
};

const calculateRiskLevel = (vault: VaultData): number => {
  // Temporarily setting all vaults to low risk (1) until proper risk calculation is implemented
  return 1;
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
}

const VaultsGrid: React.FC<VaultsGridProps> = ({
  loading,
  vaults,
  vaultAPYs,
  userVaultBalances,
  vaultTotalAssets,
}) => {
  const router = useRouter();
  const { walletAddress } = useMultiChain();

  // State for filters and sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [chainFilter, setChainFilter] = useState<string>("");
  const [protocolFilter, setProtocolFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("apy");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  // Extract unique chains and protocols for filters

  // Filter vaults based on search, chain, and protocol
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
    <div className="w-full">
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
      />

      {/* Results count */}
      <div className="text-gray-400 mb-4 text-sm">
        Showing {paginatedVaults.length} of {filteredVaults.length} vaults
      </div>

      {/* Vaults Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedVaults.map((vault) => {
          const vaultAPY = vaultAPYs.find((apy) => apy.vaultId === vault.id);
          const totalAssets = vaultTotalAssets.find(
            (asset) => asset.vaultId === vault.id,
          );
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
                  {/* Lending Pool with Logo (was Protocol) */}
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
                      <span className="text-gray-400 text-xs">
                        Lending Pool
                      </span>
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
                    <p className="text-cyan-400 font-bold text-xl">
                      {(Number(vaultAPY?.APY7d || 0) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-customNeutral300 p-3 rounded-md">
                    <p className="text-gray-400 text-xs mb-1">TVL</p>
                    <p className="text-white font-bold text-xl">
                      {formatNumberWithSuffix(
                        Number(totalAssets?.totalAssets || 0),
                      )}
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
                          {formatTokenBalance(
                            userVaultBalances.find(
                              (balance: UserVaultBalance) =>
                                balance.vaultId === vault.id,
                            )?.balance || 0,
                            vault.inputToken.symbol,
                          )}{" "}
                          {vault.inputToken.symbol}
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
