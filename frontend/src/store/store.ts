import { create } from "zustand";

interface LayoutState {
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  itemsPerPage: 6,
  setItemsPerPage: (count) => {
    const finalCount = Math.min(Math.max(count, 6), 14);
    console.log("itemsPerPage SET TO:", finalCount);
    set({ itemsPerPage: finalCount });
  },
}));
