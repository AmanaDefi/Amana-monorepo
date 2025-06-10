import { create } from "zustand";

interface LayoutState {
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  itemsPerPage: 6, // default value
  setItemsPerPage: (count) => {
    console.log("itemsPerPage SET TO:", count);
    set({ itemsPerPage: count });
  },
}));
