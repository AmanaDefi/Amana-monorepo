"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LeaderboardUserData, SearchParams } from "@/types/types";
import { formatCurrency, shortAddressForm } from "@/utils/utils";
import CopyTextButton from "@/components/common/CopyTextButton";
import { TrophyIcon } from "@heroicons/react/24/outline";

import { useLeaderboardData } from "@/hooks/useLeaderboardData";
import { useWallets } from "@privy-io/react-auth";
import { ZERO_ACCOUNT } from "@/constants";

const initialSearchParams = {
  userAddress: "",
  page: 1,
  perPage: 5,
};

export default function Page() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchParams, setSearchParams] =
    useState<SearchParams>(initialSearchParams);
  const { wallets } = useWallets();

  const currentUserAccount = wallets[0] || ZERO_ACCOUNT;
  const {
    data: leaderboardData,
    isLoading,
    error,
  } = useLeaderboardData(searchParams);

  const totalItems = useMemo(() => {
    if (isLoading || error) return 0;
    return leaderboardData.total_records;
  }, [leaderboardData, isLoading, error]);

  const totalPages = Math.ceil(totalItems / searchParams.perPage);

  const handleSearch = useCallback(() => {
    setSearchParams((prev: SearchParams) => ({
      ...prev,
      page: 1,
      userAddress: searchTerm,
    }));
  }, [searchTerm]);
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );
  const handlePageChange = useCallback((newPage: number) => {
    setSearchParams((prev) => ({ ...prev, page: newPage }));
  }, []);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-400";
      case 2:
        return "text-gray-300";
      case 3:
        return "text-amber-600";
      default:
        return "text-gray-500";
    }
  };

  const PaginationControls = () => (
    <div className="flex items-center justify-between flex-wrap gap-4 mt-4 px-4">
      <div className="flex items-center justify-between gap-2 flex-1 md:flex-[unset]">
        <button
          onClick={() => handlePageChange(searchParams.page - 1)}
          disabled={searchParams.page === 1}
          className="px-3 py-1 border border-gray-700 rounded-lg disabled:opacity-50
                             disabled:cursor-not-allowed hover:bg-gray-800 text-sm lg:text-base"
        >
          Previous
        </button>
        <span className="text-gray-400  text-sm lg:text-base whitespace-nowrap">
          Page {searchParams.page} of {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(searchParams.page + 1)}
          disabled={searchParams.page === totalPages}
          className="px-3 py-1 border border-gray-700 rounded-lg disabled:opacity-50
                             disabled:cursor-not-allowed hover:bg-gray-800  text-sm lg:text-base"
        >
          Next
        </button>
      </div>
      <div className="text-gray-400 text-sm lg:text-base text-end flex-1 whitespace-nowrap">
        Total users: {totalItems}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full font-gotham">
      <div className="text-sm font-bold text-white">
          <h1 className="">
            Leaderboard
          </h1>
          
      </div>
      <div className="flex flex-col p-4 lg:p-6 border border-gray-800 bg-gray-900 rounded gap-4 lg:gap-6">
        <div className="flex gap-2 lg:gap-3">
          <input
            type="text"
            placeholder="Search user"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyPress}
            className="bg-black w-full outline-0 decoration-0 rounded-lg text-white border border-customGray500 placeholder:text-white px-3 py-1"
          />
          <button
            onClick={handleSearch}
            className="py-2 px-5 border border-customGray500 hover:bg-gray-800 rounded-lg bg-black"
          >
            Search
          </button>
        </div>
        <div className="flex flex-col">
          <h2 className="text-white text-xl font-fustat font-semibold">
            User Points
          </h2>
          <p className="text-white text-sm lg:text-base italic">
            Points are earned for total amount deposited across vaults
            (converted to USD equivalent at current asset price) multiplied by
            the length of time the deposits have been / were in the vault.
          </p>
        </div>
        <div className="overflow-x-auto mt-6">
          <table className="min-w-full text-zinc-100">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-300 tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-300 tracking-wider">
                  User Address
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-300 tracking-wider">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-900">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <LoadingRow key={index} />
                ))
              ) : leaderboardData?.data?.length == 0 ? (
                <td colSpan={3}>
                  <div className="w-full flex justify-center py-4">
                    No Data Found
                  </div>
                </td>
              ) : (
                leaderboardData?.data?.map(
                  (item: LeaderboardUserData, index: number) => {
                    const isCurrentUser =
                      item.user_address.toLowerCase() ===
                        currentUserAccount?.address.toLowerCase() ||
                      item.user_address.toLowerCase() ===
                        searchTerm.toLocaleLowerCase();
                    return (
                      <tr
                        key={index}
                        role="button"
                        className={`
                                            transition-colors
                                            ${isCurrentUser ? "bg-blue-900/30 hover:bg-blue-900/40" : "hover:bg-gray-800"}
                                            ${isCurrentUser ? "relative" : ""}
                                        `}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          {isCurrentUser && (
                            <div className="absolute left-0 top-0 w-1 h-full bg-blue-500" />
                          )}
                          <div className="w-8">
                            <div className="flex items-center justify-end gap-2 w-full">
                              {item.position <= 3 || isCurrentUser ? (
                                <TrophyIcon
                                  className={`${getRankColor(item.position)} w-4 h-4`}
                                />
                              ) : null}
                              <span
                                className={
                                  item.position <= 3 ? "font-bold" : ""
                                }
                              >
                                {item.position}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="line-clamp-1">
                              {shortAddressForm(item.user_address)}
                            </span>
                            <CopyTextButton text={item.user_address} />
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span>{formatCurrency(item.points)}</span>
                        </td>
                      </tr>
                    );
                  },
                )
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && <PaginationControls />}
      </div>
    </div>
  );
}

const LoadingRow = () => (
  <tr className="animate-pulse">
    <td className="px-4 py-4 whitespace-nowrap">
      <div className="h-6">
        <div className="h-4 w-4 bg-gray-700 rounded"></div>
      </div>
    </td>
    <td className="px-4 py-4 whitespace-nowrap">
      <div className="flex items-center gap-2 h-6">
        <div className="h-4 w-32 bg-gray-700 rounded"></div>
        <div className="h-4 w-4 bg-gray-700 rounded"></div>
      </div>
    </td>
    <td className="px-4 py-4 whitespace-nowrap">
      <div className="h-6">
        <div className="h-4 w-32 bg-gray-700 rounded"></div>
      </div>
    </td>
  </tr>
);
