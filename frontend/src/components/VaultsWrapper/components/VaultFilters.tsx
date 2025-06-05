import { Dispatch, FC, useEffect, useMemo, useRef, useState } from "react";
import { SetStateAction } from "jotai";

import { VaultData } from "@/types/types";
import { Dropdown } from "./Dropdown";
import FiltersIcon from "@/components/svg/Filters";
import CardsMenuIcon from "@/components/svg/ListMenuCards";
import ListMenuIcon from "@/components/svg/ListMenuIcon";
import SearchIcon from "@/components/svg/Search";

const SORT_BY_LIST = ["APY", "TVL", "RISK"];

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
  displayType: "cards" | "list";
  setDisplayType: Dispatch<SetStateAction<"cards" | "list">>;
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
  setSortBy,
  clearAllFilters,
  displayType,
  setDisplayType,
}) => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleFilterClick = (filter: string) => {
    if (sortBy === filter) {
      toggleSortOrder();
    } else {
      setSortBy(filter);
      setSortOrder("desc");
    }
  };

  const handleChangeVaultsDisplay = (display: "cards" | "list") => {
    setDisplayType(display);
  };

  return (
      <div
        ref={filterRef}
        className={` ${showMobileFilters ? "block" : "hidden md:block"}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Dropdown
              emptyLabel="All Chains"
              options={chains}
              selectedOption={chainFilter}
              setSelectedOption={setChainFilter}
              width={150}
            />
            <Dropdown
              emptyLabel="All Protocols"
              options={protocols}
              selectedOption={protocolFilter}
              setSelectedOption={setProtocolFilter}
              width={210}
            />
            <button
              type="button"
              onClick={clearAllFilters}
              className="underline font-bold text-lg lg:text-sm xl:text-lg leading-5 text-[#535E73] hover:text-blue-button active:scale-90"
            >
              Clear Filters
            </button>
          </div>

          <div className="flex flex-row gap-6 items-center">
            <div className="flex flex-row gap-2 items-center">
              <button
                type="button"
                onClick={() => handleChangeVaultsDisplay("list")}
              >
                <ListMenuIcon
                  color={displayType !== "list" ? "#535E73" : "#1B46E0"}
                />
              </button>
              <button
                type="button"
                onClick={() => handleChangeVaultsDisplay("cards")}
              >
                <CardsMenuIcon
                  color={displayType !== "cards" ? "#535E73" : "#1B46E0"}
                />
              </button>
              <Dropdown
                options={SORT_BY_LIST}
                selectedOption={sortBy}
                setSelectedOption={handleFilterClick}
                IconButton={FiltersIcon}
              />
            </div>
            <div
              onClick={() => inputRef?.current?.focus()}
              className="focus-within:border-blue-button  bg-[#14171F] w-[340px] px-4 py-3 pl-[56px] rounded-lg border border-[#454363] relative"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Search name or paste address"
                className="text-white focus:outline-none bg-transparent w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute left-4 top-3">
                <SearchIcon />
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};
