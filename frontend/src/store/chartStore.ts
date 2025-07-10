import { create } from "zustand";
import { MOCK_HISTORICAL_APY } from "@/constants/mockHistoricalAPY";

interface ChartState {
  historicalAPY: Record<string, number[]>;
  selectedVaultId: string | null;

  setSelectedVaultId: (vaultId: string) => void;
  getHistoricalAPY: (vaultId: string) => number[];
  getPercentageChange: (vaultId: string) => number;
  hasHistoricalData: (vaultId: string) => boolean;
  setHistoricalAPY: (vaultId: string, apyArray: number[]) => void;
}

export const useChartStore = create<ChartState>((set, get) => ({
  historicalAPY: MOCK_HISTORICAL_APY,
  selectedVaultId: null,

  setSelectedVaultId: (vaultId: string) => set({ selectedVaultId: vaultId }),

  getHistoricalAPY: (vaultId: string) => {
    const { historicalAPY } = get();
    return historicalAPY[vaultId] || [];
  },

  getPercentageChange: (vaultId: string) => {
    const { historicalAPY } = get();
    const points = historicalAPY[vaultId];
    if (!points || points.length < 2) return 0;
    const first = points[0];
    const last = points[points.length - 1];
    return ((last - first) / first) * 100;
  },

  hasHistoricalData: (vaultId: string) => {
    const { historicalAPY } = get();
    const points = historicalAPY[vaultId];
    return points && points.length > 0;
  },

  setHistoricalAPY: (vaultId: string, apyArray: number[]) => {
    set((state) => ({
      historicalAPY: {
        ...state.historicalAPY,
        [vaultId]: apyArray,
      },
    }));
  },
}));
