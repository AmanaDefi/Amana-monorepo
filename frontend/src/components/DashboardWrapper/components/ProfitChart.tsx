"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence, Variants } from "framer-motion";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { ApexOptions } from "apexcharts";

interface ProfitChartProps {
  className?: string;
  showComingSoon?: boolean;
}

const ProfitChart: React.FC<ProfitChartProps> = ({
  className = "",
  showComingSoon = true,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState("5y");

  const mockData = {
    "1y": [300, 900, 450, 450, 700, 1300, 1300, 1000],
    "2y": [400, 800, 500, 1200, 700, 712, 1000, 600, 1300, 1100],
    "3y": [200, 600, 300, 1000, 1000, 800, 700, 1200, 1200, 1100, 850, 1300],
    "4y": [100, 700, 300, 900, 500, 508, 700, 1300, 600, 610, 800, 1200],
    "5y": [50, 600, 250, 1000, 1100, 1400, 800, 1200, 1200, 1600, 1300, 1300],
  };

  const mockProfitData = mockData[selectedPeriod as keyof typeof mockData];
  const lineColor = "#056BDF";

  const options: ApexOptions = {
    chart: {
      id: "profit-chart",
      toolbar: { show: false },
      zoom: { enabled: false },
      sparkline: { enabled: true },
      background: "transparent",
    },
    stroke: {
      curve: "straight",
      width: 2,
      colors: [lineColor],
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "vertical",
        shadeIntensity: 0.8,
        gradientToColors: ["#0505DF"],
        opacityFrom: 0.8,
        opacityTo: 0.1,
        stops: [0, 100],
      },
    },
    grid: {
      show: false,
    },
    tooltip: {
      enabled: false,
    },
    xaxis: {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      show: false,
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
  };

  const series = [
    {
      name: "Profit",
      data: mockProfitData,
    },
  ];

  const containerVariants: Variants = {
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

  const chartVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.3 },
    },
  };

  const buttonVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
    hover: {
      scale: 1.05,
      transition: { duration: 0.2 },
    },
    tap: { scale: 0.95 },
  };

  const comingSoonVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
    pulse: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <motion.div
      className={`relative justify-center items-center ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="relative w-full bg-transparent overflow-hidden border-b-[1px] border-[#056BDF]"
        variants={chartVariants}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedPeriod}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className={showComingSoon ? "opacity-30 blur-sm" : ""}>
              <Chart
                options={options}
                series={series}
                type="area"
                width="100%"
              />
            </div>

            {showComingSoon && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 backdrop-blur-sm"
                variants={comingSoonVariants}
                initial="hidden"
                animate={["visible", "pulse"]}
              >
                <motion.div
                  className="bg-gradient-to-r from-[#034A9F] to-[#030399] px-8 py-4 rounded-xl shadow-2xl border border-blue-500 border-opacity-40"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 20px 40px rgba(3, 74, 159, 0.5)",
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.h3
                    className="text-white text-lg font-semibold text-center tracking-wide"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    Coming Soon
                  </motion.h3>
                  <motion.p
                    className="text-blue-100 text-sm text-center mt-2 opacity-90"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    Real-time data integration in progress
                  </motion.p>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Fixed animated lines with Tailwind */}
        <div className="absolute inset-0 pointer-events-none flex justify-between items-end">
          {[50, 70, 80, 90, 100].map((heightPercent, i) => (
            <div
              key={i}
              className="w-[1px] bg-gradient-to-t from-white via-white/15 to-transparent opacity-0 animate-fade-in-up"
              style={{
                height: `${heightPercent}%`,
                animationDelay: `${i * 100}ms`,
                animationFillMode: "forwards",
              }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        className="mt-2 flex justify-center gap-6 flex-row"
        variants={containerVariants}
      >
        {Object.keys(mockData).map((period, index) => (
          <motion.button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`rounded-[8px] px-6 flex items-center h-[29px] text-[16px] font-normal transition-colors ${
              selectedPeriod === period
                ? "bg-blue-600 text-white"
                : "bg-[#171d26] text-white hover:bg-[#222936]"
            } ${showComingSoon ? "opacity-50 cursor-not-allowed" : ""}`}
            variants={buttonVariants}
            whileHover={showComingSoon ? {} : "hover"}
            whileTap={showComingSoon ? {} : "tap"}
            custom={index}
            disabled={showComingSoon}
          >
            {period}
          </motion.button>
        ))}
      </motion.div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: scaleY(0);
            transform-origin: bottom;
          }
          to {
            opacity: 1;
            transform: scaleY(1);
            transform-origin: bottom;
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
        }
      `}</style>
    </motion.div>
  );
};

export default ProfitChart;
