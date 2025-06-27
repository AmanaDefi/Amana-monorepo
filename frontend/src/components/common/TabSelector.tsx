"use client";

import React from "react";
import { motion } from "framer-motion";

interface TabSelectorProps {
  activeTab: any;
  setActiveTab: Function;
  availableTabs: any[];
  className?: string;
}

export default function TabSelector({
  activeTab,
  setActiveTab,
  availableTabs,
  className,
}: TabSelectorProps): JSX.Element {
  return (
    <div
      className={`max-w-[326px] md:max-w-[384px] mx-auto flex flex-row justify-center bg-[#0C1015] rounded-lg p-1 gap-1 md:gap-10 mb-6 md:mb-10 relative ${className}`}
    >
      {availableTabs.map((tab) => (
        <button
          key={tab}
          className={`relative z-10 w-1/2 py-3 px-4 max-h-10 rounded-lg text-base font-normal flex items-center justify-center transition-all duration-200 border ${
            activeTab === tab
              ? "text-white border-transparent"
              : "text-white border-transparent hover:border-[#3E73C4]"
          }`}
          onClick={() => setActiveTab(tab)}
        >
          {activeTab === tab && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute inset-0 bg-[#1B46E0] rounded-lg shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]"
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 35,
              }}
            />
          )}
          <span className="relative z-20">{tab}</span>
        </button>
      ))}
    </div>
  );
}
