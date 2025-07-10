// Utility for Noon Capital APY and historical data

const NOON_CAPITAL_API_URL = "https://back.noon.capital/api/v1/protocol-metrics";
const NOON_CAPITAL_VAULT_ID = "0x8426929d568b1cbc281f5787556f84c5b101399d";
                              
let cachedNoonCapitalData: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchNoonCapitalData(): Promise<any> {
  const now = Date.now();
  if (cachedNoonCapitalData && now - lastFetchTime < CACHE_DURATION) {
    return cachedNoonCapitalData;
  }
  const response = await fetch(NOON_CAPITAL_API_URL);
  const json = await response.json();

  cachedNoonCapitalData = json;
  lastFetchTime = now;
  return json;
}

export async function getNoonCapital30dAvgAPY(): Promise<number | null> {
  try {
    const data = await fetchNoonCapitalData();
  
    const apyTimeSeries = data.apyTimeSeries;
    if (!apyTimeSeries) return null;
    // Get last 30 days, sorted by date descending
    const dates = Object.keys(apyTimeSeries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const last30 = dates.slice(0, 30);
    const apys = last30.map(date => parseFloat(apyTimeSeries[date])).filter(x => !isNaN(x));
    if (apys.length === 0) return null;
    const avg = apys.reduce((a, b) => a + b, 0) / apys.length;
    return avg;
  } catch (e) {
    console.error("Failed to get Noon Capital 30d avg APY", e);
    return null;
  }
}

export async function getNoonCapitalHistoricalAPY(): Promise<{ apy: number, timestamp: string }[]> {
  try {
    const data = await fetchNoonCapitalData();
    const apyTimeSeries = data.apyTimeSeries;
    if (!apyTimeSeries) return [];
    // Return sorted by date ascending
    return Object.entries(apyTimeSeries)
      .map(([date, apy]) => ({ apy: parseFloat(apy as string), timestamp: date }))
      .filter(point => !isNaN(point.apy))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (e) {
    console.error("Failed to get Noon Capital historical APY", e);
    return [];
  }
}

export function isNoonCapitalVault(vaultId: string): boolean {
  return vaultId.toLowerCase() === NOON_CAPITAL_VAULT_ID.toLowerCase();
} 