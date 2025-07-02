"use client";

import React from "react";
import { motion } from "framer-motion";
import LeaderboardContainer from "@/containers/LeaderboardContainer";

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
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
};

export default function Page() {
  return (
    <motion.div
      className="grid grid-cols-1 gap-6 w-full font-gotham"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="text-[40px] font-bold text-white"
        variants={itemVariants}
      >
        <h1>Leaderboard</h1>
      </motion.div>

      <LeaderboardContainer />
    </motion.div>
  );
}
