import { create } from "zustand";
import { LeaderboardUserData, SearchParams } from "@/types/types";
import { Address } from "viem";

type LeaderboardTabType = "all-time" | "daily" | "weekly" | "monthly";

interface LeaderboardData {
  data: LeaderboardUserData[];
  total_records: number;
}

interface LeaderboardStore {
  // Mock data (temporary until API is ready)
  mockLeaderboardData: LeaderboardData;

  searchTerm: string;
  activeTab: LeaderboardTabType;
  searchParams: SearchParams;

  get top3Users(): LeaderboardUserData[];
  get otherUsers(): LeaderboardUserData[];
  get totalPages(): number;

  setSearchTerm: (term: string) => void;
  setActiveTab: (tab: LeaderboardTabType) => void;
  setSearchParams: (params: SearchParams) => void;
  updateSearchParams: (params: Partial<SearchParams>) => void;

  handleSearch: () => void;
  handlePageChange: (page: number) => void;
  handleTabChange: (tab: LeaderboardTabType) => void;
}

const initialSearchParams: SearchParams = {
  userAddress: "",
  page: 1,
  perPage: 8,
};

const mockLeaderboardData: LeaderboardData = {
  data: [
    {
      position: 1,
      user_address: "0x5095a40f8c4257124679a9659d3c6b2a8e123456" as Address,
      points: 125000,
      username: "CryptoKing",
    },
    {
      position: 2,
      user_address: "0x7891b50e9d5368235789b0123c7d3e4f5g789012" as Address,
      points: 98500,
      username: "DefiMaster",
    },
    {
      position: 3,
      user_address: "0x3456c60f0e6479346890c2345d8e5f6g0h345678" as Address,
      points: 87200,
      username: "VaultHero",
    },
    {
      position: 4,
      user_address: "0x9012d70g1f7580457901d3456e9f6g7h1i901234" as Address,
      points: 76300,
      username: "TokenWhale",
    },
    {
      position: 5,
      user_address: "0x5678e80h2g8691568012e4567f0g7h8i2j567890" as Address,
      points: 65400,
      username: "YieldFarmer",
    },
    {
      position: 6,
      user_address: "0x3456c60f0e6479346890c2345d8e5f6g0h345679" as Address,
      points: 54300,
      username: "StakeHolder",
    },
    {
      position: 7,
      user_address: "0x9012d70g1f7580457901d3456e9f6g7h1i901235" as Address,
      points: 43200,
      username: "LiquidityPro",
    },
    {
      position: 8,
      user_address: "0x5678e80h2g8691568012e4567f0g7h8i2j567891" as Address,
      points: 32100,
      username: "DeFiExplorer",
    },
  ],
  total_records: 8,
};

export const useLeaderboardStore = create<LeaderboardStore>((set, get) => ({
  // 🎯 Mock data
  mockLeaderboardData: mockLeaderboardData,

  searchTerm: "",
  activeTab: "all-time",
  searchParams: initialSearchParams,

  get top3Users() {
    const data = get().mockLeaderboardData.data;
    return data.filter((user) => user.position <= 3);
  },

  get otherUsers() {
    const data = get().mockLeaderboardData.data;
    return data.filter((user) => user.position > 3);
  },

  get totalPages() {
    const { mockLeaderboardData, searchParams } = get();
    return Math.ceil(mockLeaderboardData.total_records / searchParams.perPage);
  },

  setSearchTerm: (term) => set({ searchTerm: term }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchParams: (params) => set({ searchParams: params }),

  updateSearchParams: (params) =>
    set((state) => ({
      searchParams: { ...state.searchParams, ...params },
    })),

  handleSearch: () => {
    const { searchTerm } = get();
    set((state) => ({
      searchParams: {
        ...state.searchParams,
        page: 1,
        userAddress: searchTerm,
      },
    }));
  },

  handlePageChange: (page) => {
    set((state) => ({
      searchParams: { ...state.searchParams, page },
    }));
  },

  handleTabChange: (tab) => {
    set({ activeTab: tab });
    // TODO: Add logic for different tabs
  },
}));
