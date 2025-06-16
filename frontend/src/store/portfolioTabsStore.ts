import { create } from "zustand";
import type { TabValueType } from "@/types/dasboard";

interface TabsStore {
  activeTab: TabValueType;
  setActiveTab: (tab: TabValueType) => void;
}

export const useTabsStore = create<TabsStore>((set) => ({
  activeTab: "portfolio",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
