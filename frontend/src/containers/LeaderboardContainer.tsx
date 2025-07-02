"use client";

import React, { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SearchParams } from "@/types/types";
import SearchIcon from "@/components/svg/Search";
import { InfoBlock } from "@/components/VaultsWrapper/components/InfoBlock.tsx";
import Button from "@/components/common/Button";
import TopUsers from "@/components/LeaderboardWrapper/components/TopUsers";
import RegularUsers from "@/components/LeaderboardWrapper/components/RegularUsers";

const initialSearchParams = {
  userAddress: "",
  page: 1,
  perPage: 8,
};

type LeaderboardTabType = "all-time" | "daily" | "weekly" | "monthly";

const leaderboardTabs: { id: LeaderboardTabType; label: string }[] = [
  { id: "all-time", label: "All Time" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
};

const LoadingRow = () => (
  <motion.div
    className="grid grid-cols-[minmax(0,360px)_minmax(0,226px)_minmax(0,220px)] justify-between w-full px-8 py-4 mb-4 border border-[#3E73C4] rounded-lg bg-transparent"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{
      duration: 0.5,
      repeat: Infinity,
      repeatType: "reverse",
      type: "spring",
      stiffness: 200,
    }}
  >
    <div className="flex items-center justify-start gap-2">
      <motion.div
        className="h-6 w-6 bg-gradient-to-r from-gray-700 to-gray-600 rounded"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, type: "spring" }}
      />
      <motion.div
        className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-700 to-gray-600 ml-2"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: 0.1,
          type: "spring",
        }}
      />
      <motion.div
        className="h-6 w-24 bg-gradient-to-r from-gray-700 to-gray-600 rounded ml-2"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: 0.2,
          type: "spring",
        }}
      />
    </div>
    <div className="flex items-center justify-center">
      <motion.div
        className="h-6 w-20 bg-gradient-to-r from-gray-700 to-gray-600 rounded"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: 0.3,
          type: "spring",
        }}
      />
    </div>
    <div className="flex items-center justify-between">
      <motion.div
        className="h-6 w-32 bg-gradient-to-r from-gray-700 to-gray-600 rounded"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: 0.4,
          type: "spring",
        }}
      />
      <motion.div
        className="h-6 w-6 bg-gradient-to-r from-gray-700 to-gray-600 rounded"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: 0.5,
          type: "spring",
        }}
      />
    </div>
  </motion.div>
);

export default function LeaderboardContainer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeLeaderboardTab, setActiveLeaderboardTab] =
    useState<LeaderboardTabType>("all-time");
  const [searchParams, setSearchParams] =
    useState<SearchParams>(initialSearchParams);
  
  // const currentUserAccount = wallets[0] || ZERO_ACCOUNT;
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
      {
        position: 6,
        user_address: "0x3456c60f0e6479346890c2345d8e5f6g0h345678",
        points: 87200,
        username: "VaultHero",
      },
      {
        position: 7,
        user_address: "0x9012d70g1f7580457901d3456e9f6g7h1i901234",
        points: 76300,
        username: "TokenWhale",
      },
      {
        position: 8,
        user_address: "0x5678e80h2g8691568012e4567f0g7h8i2j567890",
        points: 65400,
        username: "YieldFarmer",
      },
    ],
    total_records: 8,
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

  const handleLeaderboardTabChange = useCallback(
    (tabId: LeaderboardTabType) => {
      setActiveLeaderboardTab(tabId);
    },
    [],
  );

  const PaginationControls = () => (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 px-4 items-center justify-between"
      variants={itemVariants}
    >
      <div className="flex items-center justify-between gap-2">
        <motion.button
          onClick={() => handlePageChange(searchParams.page - 1)}
          disabled={searchParams.page === 1}
          className="px-3 py-1 border border-gray-700 rounded-lg disabled:opacity-50
                             disabled:cursor-not-allowed hover:bg-gray-800 text-sm lg:text-base transition-colors duration-200"
          whileHover={{ y: -1, scale: 1.02 }}
          whileTap={{ y: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          Previous
        </motion.button>
        <span className="text-gray-400 text-sm lg:text-base whitespace-nowrap">
          Page {searchParams.page} of {totalPages}
        </span>
        <motion.button
          onClick={() => handlePageChange(searchParams.page + 1)}
          disabled={searchParams.page === totalPages}
          className="px-3 py-1 border border-gray-700 rounded-lg disabled:opacity-50
                             disabled:cursor-not-allowed hover:bg-gray-800 text-sm lg:text-base transition-colors duration-200"
          whileHover={{ y: -1, scale: 1.02 }}
          whileTap={{ y: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          Next
        </motion.button>
      </div>
      <div className="text-gray-400 text-sm lg:text-base text-end whitespace-nowrap">
        Total users: {totalItems}
      </div>
    </motion.div>
  );

  const top3Users =
    leaderboardData?.data?.filter((item) => item.position <= 3) || [];
  const otherUsers =
    leaderboardData?.data?.filter((item) => item.position > 3) || [];

  return (
    <>
      <motion.div
        className="flex items-center justify-between"
        variants={itemVariants}
      >
        {/* Tabs Section */}
        <div className="rounded-lg shadow-custom bg-[#14171F] flex gap-2 h-10">
          {leaderboardTabs.map((tab, index) => (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Button
                variant="signIn"
                onClick={() => handleLeaderboardTabChange(tab.id)}
                className={`
                  !font-bold !text-[18px] !tracking-[-0.06em] !transition-all !duration-200
                  !px-3 !py-[6px] !rounded-lg !whitespace-nowrap !h-auto !w-auto 
                  ${
                    activeLeaderboardTab === tab.id
                      ? "!text-white !border !border-[#1B46E0] ![background:linear-gradient(139deg,#14171f_0%,#14171f_55%,rgba(27,70,224,0.25)_70%,rgba(27,70,224,0.5)_90%,#1b46e0_120%)!important] hover:![background:linear-gradient(139deg,#14171f_0%,#14171f_55%,rgba(27,70,224,0.25)_70%,rgba(27,70,224,0.5)_90%,#1b46e0_120%)!important]"
                      : "!text-[#535E73] hover:!text-white !border-transparent !bg-transparent !font-bold hover:!border hover:!border-[#1B46E0] hover:![background:linear-gradient(139deg,#14171f_0%,#14171f_55%,rgba(27,70,224,0.25)_70%,rgba(27,70,224,0.5)_90%,#1b46e0_120%)!important]"
                  }
                `}
                style={{
                  fontWeight: 700,
                  fontSize: "18px",
                  letterSpacing: "-0.06em",
                }}
              >
                {tab.label}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Search Section */}
        <motion.div
          className="focus-within:border-blue-button hover:border-blue-button transition-all duration-300 bg-[#14171F] 
             w-full min-w-[48px] sm:min-w-[190px] 
             focus-within:w-full sm:focus-within:md:w-[340px] sm:md:w-[340px]
             px-3 sm:px-4 py-3 pl-[44px] sm:pl-[56px] 
             rounded-lg border border-[#454363] relative justify-self-end"
          whileHover={{
            y: -1,
            scale: 1.02,
            boxShadow: "0 4px 12px rgba(27, 70, 224, 0.15)",
          }}
          whileFocus={{
            scale: 1.02,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="absolute left-3 sm:left-4 top-3">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyPress}
            className="text-white block sm:block focus:outline-none bg-transparent w-full
               text-sm sm:text-base placeholder:text-sm sm:placeholder:text-base
               placeholder:text-gray-400"
          />
        </motion.div>
      </motion.div>

      <motion.div
        className="grid before-gradient-border rounded-[24px] pt-12 px-6 pb-6 mt-3"
        style={{
          backdropFilter: "blur(20px)",
          background: "rgba(20, 23, 31, 0.15)",
          boxShadow: "0 4px 6px 0 rgba(0, 0, 0, 0.1)",
        }}
        variants={itemVariants}
      >
        <div className="">
          {/* Header */}
          <motion.div
            className="grid grid-cols-[minmax(0,360px)_minmax(0,226px)_minmax(0,220px)] justify-between w-full px-8 py-3 text-[#9A9CB3] text-lg font-normal mb-6"
            variants={itemVariants}
          >
            <div className="text-left">Rank</div>
            <div className="flex items-center gap-2">
              Points
              <InfoBlock isLeft>
                💡 Points are earned for total amount deposited across vaults
                (converted to USD equivalent at current asset price) multiplied
                by the length of time the deposits have been / were in the
                vault.
              </InfoBlock>
            </div>
            <div>User Address</div>
          </motion.div>

          {/* Content */}
          <div className="">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div key="loading">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <LoadingRow key={index} />
                  ))}
                </motion.div>
              ) : leaderboardData?.data?.length === 0 ? (
                <motion.div
                  className="w-full flex justify-center py-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  No Data Found
                </motion.div>
              ) : (
                <motion.div key="data">
                  {top3Users.length > 0 && (
                    <TopUsers users={top3Users} searchTerm={searchTerm} />
                  )}

                  <RegularUsers users={otherUsers} searchTerm={searchTerm} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {!isLoading && <PaginationControls />}
      </motion.div>
    </>
  );
}
