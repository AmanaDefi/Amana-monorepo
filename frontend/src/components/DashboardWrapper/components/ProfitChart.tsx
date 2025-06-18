"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { ApexOptions } from "apexcharts";

interface ProfitChartProps {
  className?: string;
}

const ProfitChart: React.FC<ProfitChartProps> = ({ className = "" }) => {
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

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1,
      },
    },
  };

  const chartVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.3 },
    },
  };

  const buttonVariants = {
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

  const lineVariants = {
    hidden: { scaleY: 0, opacity: 0 },
    visible: (i: number) => ({
      scaleY: 1,
      opacity: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        ease: "easeOut",
      },
    }),
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
          >
            <Chart options={options} series={series} type="area" width="100%" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 pointer-events-none flex justify-between items-end">
          {[50, 70, 80, 90, 100].map((heightPercent, i) => (
            <motion.div
              key={i}
              className="relative w-[1px]"
              style={{ height: `${heightPercent}%` }}
              variants={lineVariants}
              custom={i}
            >
              <div
                className="absolute bottom-0 left-0 w-full h-full"
                style={{
                  background:
                    "linear-gradient(to top, rgba(255,255,255), rgba(255,255,255,0.15) 70%, rgba(255,255,255,0))",
                }}
              />
            </motion.div>
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
            }`}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            custom={index}
          >
            {period}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default ProfitChart;
