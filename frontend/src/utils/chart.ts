// Utility to extract and filter chart data for APY chart
export function getFilteredChartData(
  historicalData: any[],
  chartRange: '30d' | '90d'
): { filteredTimestamps: (number | string)[], filteredChartPoints: number[] } {
  // Type guard to check if historicalData is array of objects with timestamp
  function isHistoricalObjArray(arr: any[]): arr is { apy: number; timestamp: string | number }[] {
    return arr.length > 0 && typeof arr[0] === 'object' && 'timestamp' in arr[0];
  }

  let timestamps: (number | string)[] = [];
  let chartPoints: number[] = [];
  if (historicalData && Array.isArray(historicalData) && isHistoricalObjArray(historicalData)) {
    const objData = historicalData as { apy: number; timestamp: string | number }[];
    timestamps = objData.map((d) => d.timestamp);
    chartPoints = objData.map((d) => d.apy);
  } else if (historicalData && Array.isArray(historicalData)) {
    chartPoints = historicalData as number[];
    // Generate fake daily timestamps for mock data (oldest to newest)
    const now = Date.now();
    const N = chartPoints.length;
    timestamps = Array.from({ length: N }, (_, i) =>
      new Date(now - (N - 1 - i) * 24 * 60 * 60 * 1000).toISOString()
    );
  }

  // Filter to last 30 or 90 days
  let filteredTimestamps: (number | string)[] = [];
  let filteredChartPoints: number[] = [];
  const now = Date.now();
  const days = chartRange === '30d' ? 30 : 90;
  const msRange = days * 24 * 60 * 60 * 1000;
  if (timestamps && chartPoints.length === timestamps.length) {
    const zipped = timestamps.map((t, i) => ({
      t,
      y: chartPoints[i],
    }));
    const filtered = zipped.filter(({ t }) => {
      let ts: number;
      if (typeof t === 'string') {
        ts = new Date(t).getTime();
      } else {
        ts = t.toString().length < 13 ? t * 1000 : t;
      }
      return !isNaN(ts) && now - ts <= msRange;
    });
    filteredTimestamps = filtered.map(d => d.t);
    filteredChartPoints = filtered.map(d => d.y);
  } else {
    filteredChartPoints = chartPoints;
    filteredTimestamps = timestamps;
  }

  return { filteredTimestamps, filteredChartPoints };
} 