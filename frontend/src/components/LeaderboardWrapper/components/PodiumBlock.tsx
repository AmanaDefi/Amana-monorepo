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
      type: "spring" as const,
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
      type: "spring" as const,
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

  const getPodiumStyles = (position: number) => {
    switch (position) {
      case 1:
        return {
          backgroundColor: "#799BFF",
          width: "91px",
          height: "186px",
        };
      case 2:
        return {
          backgroundColor: "#3E6BFF",
          width: "91px",
          height: "140px",
        };
      case 3:
        return {
          backgroundColor: "#3E6BFF",
          width: "91px",
          height: "117px",
        };
      default:
        return {
          backgroundColor: "#3E6BFF",
          width: "91px",
          height: "117px",
        };
    }
  };

  const getRankBadge = (position: number) => {
    switch (position) {
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
      className={`mb-6 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="relative z-10 -mt-60 w-screen max-w-none rounded-b-[250px] rounded-t-none overflow-hidden"
        style={{
          height: "500px",
          background: "linear-gradient(180deg, #101219 21%, #1b46e0 100%)",
          aspectRatio: "2 / 1",
        }}
        variants={podiumVariants}
        whileHover={{
          scale: 1.02,
          transition: { duration: 0.3 },
        }}
      >
        <div className="absolute inset-0 flex items-end justify-center overflow-hidden">
          <div className="flex items-end justify-center gap-4 px-4 relative">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "transparent",
                clipPath: "ellipse(80% 100% at 50% 100%)",
              }}
            />
            {arrangedUsers.map((user, index) => {
              const podiumStyles = getPodiumStyles(user.position);

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
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center relative overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500" />
                    </div>
                  </motion.div>

                  <motion.div
                    className="flex flex-col items-center justify-start relative"
                    style={{
                      ...podiumStyles,
                      borderRadius: "16px 16px 0 0",
                      transform: "translateY(20px)",
                    }}
                    initial={{ height: 0, y: 50 }}
                    animate={{ height: podiumStyles.height, y: 0 }}
                    transition={{
                      delay: index * 0.1 + 0.5,
                      duration: 0.6,
                      type: "spring" as const,
                      stiffness: 200,
                    }}
                  >
                    <div
                      className="flex justify-center"
                      style={{ marginTop: "8px" }}
                    >
                      {getRankBadge(user.position)}
                    </div>

                    <div
                      className="text-center"
                      style={{
                        marginTop: "4px",
                        fontWeight: 400,
                        fontSize: "10px",
                        color: "#fff",
                      }}
                    >
                      {formatCurrency(user.points)}
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
