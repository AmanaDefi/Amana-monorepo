"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

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
      className={`w-full max-w-[384px] mx-auto flex flex-row justify-center bg-[#0C1015] rounded-lg p-1 gap-1 mb-0 md:gap-10 md:mb-6 relative ${className}`}
    >
      {availableTabs.map((tab) => (
        <button
          key={tab}
          className={`relative z-9 w-1/3 py-3 px-4 max-h-10 rounded-lg text-base font-normal flex items-center justify-center transition-all duration-200 border ${
            activeTab === tab
              ? "text-white border-transparent"
              : "text-white border-transparent hover:border-[#3E73C4]"
          }`}
          onClick={() => setActiveTab(tab)}
        >
          <AnimatePresence mode="wait">
            {activeTab === tab && (
              <motion.div
                key={tab}
                className="absolute inset-0 bg-[#1B46E0] rounded-lg shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  duration: 0.4,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              />
            )}
          </AnimatePresence>
          <span className="relative z-9">{tab}</span>
        </button>
      ))}
    </div>
  );
}
