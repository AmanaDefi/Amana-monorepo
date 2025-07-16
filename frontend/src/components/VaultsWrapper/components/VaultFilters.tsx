import { Dispatch, FC, useEffect, useRef, useState } from "react";
import { SetStateAction } from "jotai";

import { VaultData } from "@/types/types";
import { Dropdown } from "./Dropdown";
import FiltersIcon from "@/components/svg/Filters";
import CardsMenuIcon from "@/components/svg/ListMenuCards";
import ListMenuIcon from "@/components/svg/ListMenuIcon";
import SearchIcon from "@/components/svg/Search";
import classNames from "classnames";
import {
  NETWORK_FILTER_OPTIONS,
  PROTOCOL_FILTER_OPTIONS,
} from "@/constants/chainConfig";

const SORT_BY_LIST = [{ value: "APY" }, { value: "TVL" }, { value: "Risk" }];

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
  isShownMyVaults: boolean;
  setIsShownMyVaults: Dispatch<SetStateAction<boolean>>;
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
  isShownMyVaults,
  setIsShownMyVaults,
}) => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isHiddenFilterButton, setIsHiddenFilterButton] = useState(false);

  const [localSearch, setLocalSearch] = useState(searchTerm);

  // Sync local state when external searchTerm changes from parent (e.g., clear)
  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  // Debounce: update parent after delay
  useEffect(() => {
    const timerId = setTimeout(() => {
      if (localSearch !== searchTerm) {
        setSearchTerm(localSearch);
      }
    }, 800);

    return () => clearTimeout(timerId);
  }, [localSearch]);

  const chains = NETWORK_FILTER_OPTIONS;
  const protocols = PROTOCOL_FILTER_OPTIONS;

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
    const normalizedFilter = filter.toLowerCase();
    if (sortBy.toLowerCase() === normalizedFilter) {
      toggleSortOrder();
    } else {
      setSortBy(normalizedFilter);
      setSortOrder("desc");
    }
  };

  const handleChangeVaultsDisplay = (display: "cards" | "list") => {
    setDisplayType(display);
  };

  return (
    <div ref={filterRef}>
      <div className="flex flex-col-reverse lg:flex-row lg:items-center lg:justify-between flex-wrap gap-4 mb-4">
        <div className="flex flex-col-reverse md:flex-row gap-4 items-center">
          <div className="lg:flex flex-row gap-4 items-center hidden">
            <button
              onClick={() => setIsShownMyVaults(true)}
              className={classNames(
                "flex hover:cursor-pointer font-gotham font-medium !text-lg leading-[22px]  border-[#535E73] hover:!border-[#1B46E0] flex-row px-3 justify-between py-[6px] border-[0.5px] rounded-lg gap-1 h-fit",
                {
                  "!border-[#1B46E0]": isShownMyVaults,
                },
              )}
            >
              My Vaults
            </button>
            <button
              onClick={() => setIsShownMyVaults(false)}
              className={classNames(
                "flex font-medium text-lg font-gotham leading-[22px] hover:cursor-pointer border-[#535E73] hover:!border-[#1B46E0] flex-row px-3 justify-between py-[6px] border-[0.5px] rounded-lg gap-1  h-fit",
                {
                  "!border-[#1B46E0]": !isShownMyVaults,
                },
              )}
            >
              All Vaults
            </button>
          </div>

          <div className="flex flex-row gap-4 items-center w-full md:w-fit">
            <Dropdown
              emptyLabel="All Chains"
              options={chains}
              selectedOption={chainFilter}
              setSelectedOption={setChainFilter}
              width={180}
            />
            <Dropdown
              emptyLabel="All Protocols"
              options={protocols}
              selectedOption={protocolFilter}
              setSelectedOption={setProtocolFilter}
              width={210}
            />
          </div>

          <button
            type="button"
            onClick={clearAllFilters}
            className="underline hidden lg:block font-bold text-lg lg:text-sm xl:text-lg leading-5 text-[#535E73] hover:text-blue-button active:scale-90"
          >
            Clear Filters
          </button>
        </div>

        <div className="flex flex-row-reverse lg:flex-row  lg:gap-6 items-center w-full lg:w-auto justify-between lg:justify-normal">
          <div className="flex flex-row gap-2 items-center">
            <button
              className="hidden lg:block transition-all duration-200 hover:scale-105"
              type="button"
              onClick={() => handleChangeVaultsDisplay("list")}
            >
              <ListMenuIcon
                color={displayType !== "list" ? "#535E73" : "#1B46E0"}
                className="hover:fill-[#1B46E0] transition-colors duration-200"
              />
            </button>
            <button
              className="hidden lg:block transition-all duration-200 hover:scale-105"
              type="button"
              onClick={() => handleChangeVaultsDisplay("cards")}
            >
              <CardsMenuIcon
                color={displayType !== "cards" ? "#535E73" : "#1B46E0"}
                className="hover:fill-[#1B46E0] transition-colors duration-200"
              />
            </button>
            <div
              className={classNames({
                "lg:block hidden": isHiddenFilterButton,
              })}
            >
              <Dropdown
                options={SORT_BY_LIST}
                selectedOption={sortBy}
                setSelectedOption={handleFilterClick}
                IconButton={FiltersIcon}
                listType="simple"
              />
            </div>
          </div>
          <div
            onClick={() => inputRef?.current?.focus()}
            className="focus-within:border-blue-button hover:border-blue-button transition-all duration-300 bg-[#14171F] w-[50%] min-w-[190px] focus-within:w-[100%] lg:focus-within:w-[340px] lg:w-[340px] pr-[10px] pl-[56px] md:pr-4 py-2 md:py-3  rounded-lg border border-[#454363] relative"
          >
            <>
              <input
                ref={inputRef}
                type="text"
                placeholder={"Search"}
                maxLength={100}
                className="text-white focus:outline-none bg-transparent w-full"
                value={localSearch}
                onFocus={() => setIsHiddenFilterButton(true)}
                onBlur={() => setIsHiddenFilterButton(false)}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </>
            <div className="absolute left-4 top-[10px] md:top-3">
              <SearchIcon />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
