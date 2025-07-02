"use client";

import React from "react";
import { motion } from "framer-motion";
import { LeaderboardUserData } from "@/types/types";
import { formatCurrency } from "@/utils/utils";
import Image from "next/image";

interface PodiumBlockProps {
  users: LeaderboardUserData[];
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const userVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.8 },
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

const podiumVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      delay: 0.2,
    },
  },
};

export default function PodiumBlock({
  users,
  className = "",
}: PodiumBlockProps) {
  const topUsers = users
    .filter((user) => user.position <= 3)
    .sort((a, b) => a.position - b.position);

  const arrangedUsers = [
    topUsers.find((user) => user.position === 2),
    topUsers.find((user) => user.position === 1),
    topUsers.find((user) => user.position === 3),
  ].filter(Boolean) as LeaderboardUserData[];

  if (arrangedUsers.length === 0) return null;

  const getRankBadge = (position: number) => {
    switch (position) {
      case 1:
        return (
          <Image
            src="/goldBadges.png"
            alt="Gold Badge"
            width={32}
            height={32}
          />
        );
      case 2:
        return (
          <Image
            src="/silverBadges.png"
            alt="Silver Badge"
            width={28}
            height={28}
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

  const getPodiumHeight = (position: number) => {
    switch (position) {
      case 1:
        return "h-24";
      case 2:
        return "h-20";
      case 3:
        return "h-16";
      default:
        return "h-16";
    }
  };

  const getPodiumColor = (position: number) => {
    switch (position) {
      case 1:
        return "from-yellow-400/20 to-yellow-600/40";
      case 2:
        return "from-gray-300/20 to-gray-500/40";
      case 3:
        return "from-orange-400/20 to-orange-600/40";
      default:
        return "from-gray-400/20 to-gray-600/40";
    }
  };

  return (
    <motion.div
      className={`mb-6 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="relative z-10 -mt-60 w-screen max-w-none rounded-b-[2000px] rounded-t-none"
        style={{
          height: "509px",
          background: "linear-gradient(180deg, #101219 21%, #1b46e0 100%)",
          aspectRatio: "1 / 1",
        }}
        variants={podiumVariants}
        whileHover={{
          scale: 1.02,
          transition: { duration: 0.3 },
        }}
      >
        <div className="absolute inset-0 flex items-end justify-center pb-12">
          <div className="flex items-end justify-center gap-4 px-4">
            {arrangedUsers.map((user, index) => {
              const isCenter = user.position === 1;
              const isLeft = user.position === 2;
              const isRight = user.position === 3;

              return (
                <motion.div
                  key={user.user_address}
                  className="flex flex-col items-center"
                  variants={userVariants}
                  whileHover={{
                    y: -5,
                    scale: 1.05,
                    transition: { duration: 0.2 },
                  }}
                >
                  <motion.div
                    className="relative mb-3"
                    whileHover={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.3 }}
                  >
                    <div
                      className={`rounded-full border-4 ${
                        isCenter
                          ? "border-yellow-400 w-16 h-16"
                          : isLeft
                            ? "border-gray-300 w-14 h-14"
                            : "border-orange-400 w-12 h-12"
                      } bg-gray-600 flex items-center justify-center relative overflow-hidden`}
                    >
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500" />
                    </div>
                    <div className="absolute -top-2 -right-2">
                      {getRankBadge(user.position)}
                    </div>
                  </motion.div>

                  <div className="text-center mb-2">
                    <div
                      className={`font-bold text-white mb-1 ${
                        isCenter ? "text-lg" : "text-base"
                      }`}
                    >
                      {user.username}
                    </div>
                    <div
                      className={`text-gray-300 ${
                        isCenter ? "text-base" : "text-sm"
                      }`}
                    >
                      {formatCurrency(user.points)}
                    </div>
                  </div>

                  <motion.div
                    className={`w-16 ${getPodiumHeight(user.position)} bg-gradient-to-t ${getPodiumColor(user.position)} rounded-t-lg border-t-2 ${
                      isCenter
                        ? "border-yellow-400"
                        : isLeft
                          ? "border-gray-300"
                          : "border-orange-400"
                    }`}
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    transition={{
                      delay: index * 0.1 + 0.5,
                      duration: 0.6,
                      type: "spring",
                      stiffness: 200,
                    }}
                  >
                    <div className="flex items-center justify-center h-full">
                      <span
                        className={`font-bold text-white ${
                          isCenter ? "text-2xl" : "text-xl"
                        }`}
                      >
                        {user.position}
                      </span>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          className="absolute top-8 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
