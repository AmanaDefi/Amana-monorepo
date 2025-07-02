"use client";

import React from "react";
import { motion } from "framer-motion";
import { LeaderboardUserData } from "@/types/types";
import { formatCurrency, shortAddressForm } from "@/utils/utils";
import CopyTextButton from "@/components/common/CopyTextButton";
import { useWallets } from "@privy-io/react-auth";
import { ZERO_ACCOUNT } from "@/constants";
import Image from "next/image";

interface TopUsersProps {
  users: LeaderboardUserData[];
  searchTerm: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.05,
    },
  },
};

const userRowVariants = {
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
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

export default function TopUsers({ users, searchTerm }: TopUsersProps) {
  const { wallets } = useWallets();
  const currentUserAccount = wallets[0] || ZERO_ACCOUNT;

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <Image
            src="/goldBadges.png"
            alt="Gold Badge"
            width={24}
            height={24}
          />
        );
      case 2:
        return (
          <Image
            src="/silverBadges.png"
            alt="Silver Badge"
            width={24}
            height={24}
          />
        );
      case 3:
        return (
          <Image
            src="/bronzeBadges.png"
            alt="Bronze Badge"
            width={24}
            height={24}
          />
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="border-b border-[#181d29] pb-2 md:pb-6 mb-5 md:mb-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {users.map((item: LeaderboardUserData, index: number) => {
        const isCurrentUser =
          item.user_address.toLowerCase() ===
            currentUserAccount?.address.toLowerCase() ||
          item.user_address.toLowerCase() === searchTerm.toLocaleLowerCase();

        return (
          <motion.div
            key={`top3-user-${index}`}
            role="button"
            className={`
    grid grid-cols-[112px_83px_103px] md:grid-cols-[minmax(0,360px)_minmax(0,226px)_minmax(0,220px)] justify-between w-full px-0 md:px-8 py-2 md:py-4 transition-colors relative mb-4 cursor-pointer
    ${isCurrentUser ? "bg-blue-900/30 hover:bg-blue-900/40" : "hover:bg-gray-800"}
    md:bg-gradient-to-b md:from-[#0a1a5c] md:to-[#1b46e0] md:rounded-lg
  `}
            variants={userRowVariants}
            whileHover={{
              y: -2,
              scale: 0.98,
              boxShadow: "0 8px 25px rgba(27, 70, 224, 0.3)",
              backgroundColor: isCurrentUser
                ? "rgba(59, 130, 246, 0.4)"
                : "rgba(55, 65, 81, 0.8)",
            }}
            whileTap={{
              scale: 0.96,
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
          >
            {isCurrentUser && (
              <div className="absolute left-0 top-0 w-1 h-full bg-blue-500 rounded-l-lg" />
            )}

            <div className="flex items-center justify-start gap-1 md:gap-2 min-w-0">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: index * 0.02 + 0.3,
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
                className="flex-shrink-0 w-3 h-3 md:w-6 md:h-6"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                {getRankBadge(item.position)}
              </motion.div>
              <div className="w-4 h-4 md:w-10 md:h-10 rounded-full flex items-center justify-center relative overflow-hidden flex-shrink-0">
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500" />
              </div>
              <span className="font-bold text-xs md:text-lg tracking-tight text-white truncate min-w-0">
                {item.username}
              </span>
            </div>

            <div className="flex items-center justify-center md:justify-start">
              <span className="font-normal text-xs md:text-base text-white truncate">
                {formatCurrency(item.points)}
              </span>
            </div>

            <div className="flex items-center justify-between min-w-0 gap-1">
              <span className="line-clamp-1 font-normal text-xs md:text-base text-white truncate min-w-0">
                {shortAddressForm(item.user_address)}
              </span>
              <div className="flex-shrink-0 w-3 md:w-4">
                <CopyTextButton text={item.user_address} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
