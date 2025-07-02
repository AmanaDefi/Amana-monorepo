"use client";

import React from "react";
import { motion } from "framer-motion";
import { Address } from "viem";
import LeaderboardContainer from "@/containers/LeaderboardContainer";
import PodiumBlock from "@/components/LeaderboardWrapper/components/PodiumBlock";

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
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
    },
  },
} as const;

export default function Page() {
  const topUsers = [
    {
      position: 1,
      user_address: "0x5095a40f8c4257124679a9659d3c6b2a8e123456" as Address,
      points: 125000,
      username: "CryptoKing",
    },
    {
      position: 2,
      user_address: "0x7891b50e9d5368235789b0123c7d3e4f5g789012" as Address,
      points: 98500,
      username: "DefiMaster",
    },
    {
      position: 3,
      user_address: "0x3456c60f0e6479346890c2345d8e5f6g0h345678" as Address,
      points: 87200,
      username: "VaultHero",
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-1 gap-6 w-full font-gotham"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="hidden md:block text-[40px] font-bold text-white"
        variants={itemVariants}
      >
        <h1>Leaderboard</h1>
      </motion.div>

      <div className="-mx-4 md:hidden">
        <PodiumBlock users={topUsers} />
      </div>

      <LeaderboardContainer />
    </motion.div>
  );
}
