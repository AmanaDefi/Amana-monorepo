"use client";

import React from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { ApexOptions } from "apexcharts";

interface TableChartProps {
  points: number[];
  percentageChange: number;
}

const TableChart: React.FC<TableChartProps> = ({
  points,
  percentageChange,
}) => {
  const isPositive = percentageChange >= 0;

  const gradientColors = ["#0546DF", "#0505DF"]; 
  const lineColor = "#056BDF"; 

  const options: ApexOptions = {
    chart: {
      id: "vault-apy-chart",
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
      name: "APY",
      data: points ?? [],
    },
  ];

  return (
    <div className="relative w-full h-[80px] bg-transparent rounded-lg overflow-hidden">
      <Chart
        options={options}
        series={series}
        type="area"
        height={80}
        width="100%"
      />
    </div>
  );
};

export default TableChart;
