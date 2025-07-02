"use client";

import React from "react";
import { motion } from "framer-motion";
import { LeaderboardUserData } from "@/types/types";
import { formatCurrency, shortAddressForm } from "@/utils/utils";
import CopyTextButton from "@/components/common/CopyTextButton";
import { useWallets } from "@privy-io/react-auth";
import { ZERO_ACCOUNT } from "@/constants";

interface RegularUsersProps {
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

export default function RegularUsers({ users, searchTerm }: RegularUsersProps) {
  const { wallets } = useWallets();
  const currentUserAccount = wallets[0] || ZERO_ACCOUNT;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {users.map((item: LeaderboardUserData, index: number) => {
        const isCurrentUser =
          item.user_address.toLowerCase() ===
            currentUserAccount?.address.toLowerCase() ||
          item.user_address.toLowerCase() === searchTerm.toLocaleLowerCase();

        return (
          <motion.div
            key={`other-user-${index}`}
            role="button"
            className={`
            grid grid-cols-[112px_83px_103px] md:grid-cols-[minmax(0,360px)_minmax(0,226px)_minmax(0,220px)] justify-between w-full transition-colors relative mb-4 cursor-pointer
            border border-transparent md:border-[#3E73C4] rounded-lg bg-transparent p-2 md:px-8 md:py-4
            ${isCurrentUser ? "hover:bg-blue-900/20" : "hover:bg-gray-800/30"}
          `}
            variants={userRowVariants}
            whileHover={{
              x: 0,
              y: -1,
              scale: 0.98,
              borderColor: "#1B46E0",
              backgroundColor: isCurrentUser
                ? "rgba(59, 130, 246, 0.15)"
                : "rgba(55, 65, 81, 0.2)",
              boxShadow: "0 4px 12px rgba(27, 70, 224, 0.1)",
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

            <div className="flex items-center justify-start gap-1 md:gap-2 text-xs md:text-lg font-bold min-w-0">
              <span className="min-w-4 md:min-w-6 flex-shrink-0 text-xs md:text-lg">
                {item.position}
              </span>
              <div className="w-4 h-4 md:w-10 md:h-10 rounded-full bg-gray-600 flex items-center justify-center relative overflow-hidden flex-shrink-0">
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500" />
              </div>
              <span className="font-bold text-xs md:text-lg tracking-tight text-white truncate min-w-0">
                {item.username}
              </span>
            </div>

            <div className="flex items-center justify-center md:justify-start">
              <span className="text-xs md:text-base truncate">
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
