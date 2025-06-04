import { VaultData } from "@/types/types";
import { SetStateAction } from "jotai";
import { Dispatch, FC, useEffect, useMemo, useRef, useState } from "react";
import { Dropdown } from "./Dropdown";

type Props = {
  vaults: VaultData[];
  setSortOrder: Dispatch<SetStateAction<"asc" | "desc">>;
  chainFilter: string;
  setChainFilter: Dispatch<SetStateAction<string>>;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  protocolFilter: string;
  setProtocolFilter: Dispatch<SetStateAction<string>>;
  sortBy: string;
  sortOrder: "asc" | "desc";
  setSortBy: Dispatch<SetStateAction<string>>;
  clearAllFilters: () => void;
};

export const VaultFilters: FC<Props> = ({
  vaults,
  setSortOrder,
  chainFilter,
  searchTerm,
  setChainFilter,
  setProtocolFilter,
  setSearchTerm,
  protocolFilter,
  sortBy,
  sortOrder,
  setSortBy,
  clearAllFilters,
}) => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const chains = useMemo(() => {
    return Array.from(new Set(vaults.map((vault) => vault.protocol.network)));
  }, [vaults]);

  const protocols = useMemo(() => {
    return Array.from(new Set(vaults.map((vault) => vault.protocol.name)));
  }, [vaults]);

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

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <div>
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
              className="p-2 rounded-md bg-customNeutral300 text-white border border-customNeutral100 focus:border-cyan-400 focus:outline-none"
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
            <Dropdown
              emptyLabel="All Chains"
              options={chains}
              selectedOption={chainFilter}
              setSelectedOption={setChainFilter}
              width={150}
            />
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
                  setSortBy(option);
                  setSortOrder("desc");
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
    </div>
  );
};
