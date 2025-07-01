"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LeaderboardUserData, SearchParams } from "@/types/types";
import { formatCurrency, shortAddressForm } from "@/utils/utils";
import CopyTextButton from "@/components/common/CopyTextButton";
import { TrophyIcon } from "@heroicons/react/24/outline";

import { useLeaderboardData } from "@/hooks/useLeaderboardData";
import { useWallets } from "@privy-io/react-auth";
import { ZERO_ACCOUNT } from "@/constants";
import SearchIcon from "@/components/svg/Search";
import { InfoBlock } from "@/components/VaultsWrapper/components/InfoBlock.tsx";
import GoldIcon from "@/components/svg/GoldIcon";
import SilverIcon from "@/components/svg/SilverIcon";
import BronzeIcon from "@/components/svg/BronzeIcon";

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
  // const {
  //   data: leaderboardData,
  //   isLoading,
  //   error,
  // } = useLeaderboardData(searchParams);

  // Temporary hardcoded data for styling
  const leaderboardData = {
    data: [
      {
        position: 1,
        user_address: "0x5095a40f8c4257124679a9659d3c6b2a8e123456",
        points: 125000,
        username: "CryptoKing",
      },
      {
        position: 2,
        user_address: "0x7891b50e9d5368235789b0123c7d3e4f5g789012",
        points: 98500,
        username: "DefiMaster",
      },
      {
        position: 3,
        user_address: "0x3456c60f0e6479346890c2345d8e5f6g0h345678",
        points: 87200,
        username: "VaultHero",
      },
      {
        position: 4,
        user_address: "0x9012d70g1f7580457901d3456e9f6g7h1i901234",
        points: 76300,
        username: "TokenWhale",
      },
      {
        position: 5,
        user_address: "0x5678e80h2g8691568012e4567f0g7h8i2j567890",
        points: 65400,
        username: "YieldFarmer",
      },
    ],
    total_records: 150,
  };
  const isLoading = false;
  const error = null;

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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <GoldIcon className="w-6 h-6" />;
      case 2:
        return <SilverIcon className="w-6 h-6" />;
      case 3:
        return <BronzeIcon className="w-6 h-6" />;
      default:
        return <TrophyIcon className="w-6 h-6 text-gray-500" />;
    }
  };

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 px-4 items-center justify-between">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => handlePageChange(searchParams.page - 1)}
          disabled={searchParams.page === 1}
          className="px-3 py-1 border border-gray-700 rounded-lg disabled:opacity-50
                             disabled:cursor-not-allowed hover:bg-gray-800 text-sm lg:text-base"
        >
          Previous
        </button>
        <span className="text-gray-400 text-sm lg:text-base whitespace-nowrap">
          Page {searchParams.page} of {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(searchParams.page + 1)}
          disabled={searchParams.page === totalPages}
          className="px-3 py-1 border border-gray-700 rounded-lg disabled:opacity-50
                             disabled:cursor-not-allowed hover:bg-gray-800 text-sm lg:text-base"
        >
          Next
        </button>
      </div>
      <div className="text-gray-400 text-sm lg:text-base text-end whitespace-nowrap">
        Total users: {totalItems}
      </div>
    </div>
  );

  const LoadingRow = () => (
    <div className="grid grid-cols-[minmax(0,360px)_minmax(0,226px)_minmax(0,220px)] justify-between w-full py-4 px-4 animate-pulse">
      <div className="flex items-center justify-start h-6">
        <div className="h-4 w-4 bg-gray-700 rounded"></div>
      </div>
      <div className="flex items-center justify-center gap-2 h-6">
        <div className="h-4 w-32 bg-gray-700 rounded"></div>
      </div>
      <div className="flex items-center justify-end h-6">
        <div className="h-4 w-32 bg-gray-700 rounded"></div>
        <div className="h-4 w-4 bg-gray-700 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 w-full font-gotham">
      <div className="text-[40px] font-bold text-white">
        <h1>Leaderboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-between">
        <div className="rounded-lg shadow-custom bg-[#14171F] flex gap-2 h-10"></div>
        <div className="focus-within:border-blue-button hover:border-blue-button transition-all duration-300 bg-[#14171F] w-full min-w-[190px] focus-within:md:w-[340px] md:w-[340px] px-4 py-3 pl-[56px] rounded-lg border border-[#454363] relative justify-self-end">
          <div className="absolute left-4 top-3">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search user"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyPress}
            className="text-white hidden lg:block focus:outline-none bg-transparent w-full"
          />
          <button
            onClick={handleSearch}
            className="hidden py-2 px-5 border border-customGray500 hover:bg-gray-800 rounded-lg bg-black"
          >
            Search
          </button>
        </div>
      </div>

      <div
        className="grid before-gradient-border rounded-[24px] pt-12 px-6 pb-6 mt-3"
        style={{
          backdropFilter: "blur(20px)",
          background: "rgba(20, 23, 31, 0.15)",
          boxShadow: "0 4px 6px 0 rgba(0, 0, 0, 0.1)",
        }}
      >
        <div className="overflow-x-auto">
          {/* Header */}
          <div className="grid grid-cols-[minmax(0,360px)_minmax(0,226px)_minmax(0,220px)] justify-between w-full px-8 py-3 text-[#9A9CB3] text-lg font-normal mb-6">
            <div className="text-left">Rank</div>
            <div className="text-center flex items-center gap-2">
              Points
              <InfoBlock isRight>
                💡 Points are earned for total amount deposited across vaults
                (converted to USD equivalent at current asset price) multiplied
                by the length of time the deposits have been / were in the
                vault.
              </InfoBlock>
            </div>
            <div>User Address</div>
          </div>

          {/* Content */}
          <div className="">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <LoadingRow key={index} />
              ))
            ) : leaderboardData?.data?.length === 0 ? (
              <div className="w-full flex justify-center py-4">
                No Data Found
              </div>
            ) : (
              <>
                
                {leaderboardData?.data?.map(
                  (item: LeaderboardUserData, index: number) => {
                    const isCurrentUser =
                      item.user_address.toLowerCase() ===
                        currentUserAccount?.address.toLowerCase() ||
                      item.user_address.toLowerCase() ===
                        searchTerm.toLocaleLowerCase();

                    const isTop3 = item.position <= 3;

                    return (
                      <div
                        key={`user-${index}`}
                        role="button"
                        className={`
                          grid grid-cols-[minmax(0,360px)_minmax(0,226px)_minmax(0,220px)] justify-between w-full px-8 py-4 transition-colors relative
                          ${isCurrentUser ? "bg-blue-900/30 hover:bg-blue-900/40" : "hover:bg-gray-800"}
                          ${isTop3 ? "mb-2" : ""}
                        `}
                        style={
                          isTop3
                            ? {
                                background:
                                  "linear-gradient(180deg, #101219, #1b46e0 100%)",
                                borderRadius: "8px",
                                marginBottom: "8px",
                              }
                            : {}
                        }
                      >
                        {isCurrentUser && (
                          <div className="absolute left-0 top-0 w-1 h-full bg-blue-500 rounded-l-lg" />
                        )}

                        {/* Rank Column */}
                        <div className="flex items-center justify-start gap-2">
                          {isTop3 ? (
                            <>
                              {getRankIcon(item.position)}
                              <span className="font-bold text-lg text-white">
                                {item.position}
                              </span>
                              <div className="w-8 h-8 rounded-full border border-[#535E73] bg-gray-600 flex items-center justify-center ml-2"></div>
                              <span className="font-bold text-lg tracking-tight text-white ml-2">
                                {item.username}
                              </span>
                            </>
                          ) : (
                            <span
                              className={item.position <= 3 ? "font-bold" : ""}
                            >
                              {item.position}
                            </span>
                          )}
                        </div>

                        {/* Points Column */}
                        <div className="flex items-center">
                          <span
                            className={
                              isTop3 ? "font-normal text-base text-white" : ""
                            }
                          >
                            {formatCurrency(item.points)}
                          </span>
                        </div>

                        {/* User Address Column */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`line-clamp-1 ${isTop3 ? "font-normal text-base text-white" : ""}`}
                          >
                            {shortAddressForm(item.user_address)}
                          </span>
                          <CopyTextButton text={item.user_address} />
                        </div>
                      </div>
                    );
                  },
                )}
              </>
            )}
          </div>
        </div>
        {!isLoading && <PaginationControls />}
      </div>
    </div>
  );
}
