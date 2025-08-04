"use client";

import React from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { ApexOptions } from "apexcharts";

interface TableChartProps {
  points: number[];
  percentageChange: number;
  timestamps?: (number | string)[];
  // onlyMovingAverage?: boolean; // removed for now
}

const TableChart: React.FC<TableChartProps> = ({
  points,
  percentageChange,
  timestamps,
  // onlyMovingAverage,
}) => {
  const isPositive = percentageChange >= 0;

  // Remove internal 30-day filter. Use points and timestamps as provided.
  const filteredPoints = points;
  const filteredTimestamps = timestamps;

  // Prepare series data with timestamps if provided
  const mainSeriesData: [number, number][] =
    filteredTimestamps && filteredTimestamps.length === filteredPoints.length
      ? filteredPoints.map((y, i) => {
          const timestamp = filteredTimestamps[i];
          let timeValue: number;

          if (typeof timestamp === "string") {
            timeValue = new Date(timestamp).getTime();
          } else if (typeof timestamp === "number") {
            timeValue =
              timestamp.toString().length < 13 ? timestamp * 1000 : timestamp;
          } else {
            timeValue = 0;
          }

          return [timeValue, y];
        })
      : filteredPoints.map((y, i) => [i, y]);

  // Calculate 7-point simple moving average
  function movingAverage(
    data: [number, number][],
    windowSize: number,
  ): [number, number | null][] {
    if (data.length < windowSize) return [];
    const result: [number, number | null][] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < windowSize - 1) {
        result.push([data[i][0], null]);
      } else {
        const avg =
          data
            .slice(i - windowSize + 1, i + 1)
            .reduce((sum, d) => sum + d[1], 0) / windowSize;
        result.push([data[i][0], avg]);
      }
    }
    return result;
  }

  const smaSeriesData = movingAverage(mainSeriesData, 7);

  const series = [
    {
      name: "APY",
      data: mainSeriesData,
    },
    // Optionally, you can re-enable the moving average line by uncommenting below:
    // {
    //   name: "7d MA",
    //   data: smaSeriesData,
    // },
  ];

  const gradientColors = ["#0546DF", "#0505DF"];
  const lineColor = "#056BDF";

  const options: ApexOptions = {
    chart: {
      id: "vault-apy-chart",
      toolbar: { show: false },
      zoom: { enabled: false },
      sparkline: { enabled: true },
      background: "transparent",
      offsetX: 0,
      offsetY: 0,
      parentHeightOffset: 0,
    },
    stroke: {
      curve: "straight",
      width: [2],
      colors: [lineColor],
      dashArray: [0],
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
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    },
    plotOptions: {
      area: {
        fillTo: "end",
      },
    },
    tooltip: {
      enabled: true,
      style: {
        fontSize: "14px",
        fontFamily: "inherit",
      },
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const apy = series[seriesIndex][dataPointIndex];
        const x = w.globals.seriesX[seriesIndex][dataPointIndex];
        const date = new Date(x).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        return `
          <div style="background:#14171F;color:#fff;padding:8px 12px;border-radius:8px;border:1px solid #0546DF;min-width:120px;">
            <div style="font-size:12px;opacity:0.8;">${date}</div>
            <div style="font-size:16px;font-weight:bold;">APY: ${apy == null ? "N/A" : apy.toFixed(2) + "%"}</div>
          </div>
        `;
      },
      marker: {
        show: false,
      },
      fillSeriesColor: false,
    },
    xaxis: {
      type: filteredTimestamps ? "datetime" : "numeric",
      labels: {
        show: false,
      },
      tickAmount: 4,
      axisBorder: { show: false },
      axisTicks: { show: false },
      crosshairs: {
        show: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    yaxis: {
      show: false,
      min: undefined,
      max: undefined,
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
  };

  return (
    <div className="relative w-full h-[80px] bg-transparent rounded-lg">
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
