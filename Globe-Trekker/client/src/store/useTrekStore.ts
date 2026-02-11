import { create } from "zustand";

type TrekStore = {
  selectedTrekId: string | null;
  setSelectedTrekId: (id: string | null) => void;
  clearSelectedTrek: () => void;
};

export const useTrekStore = create<TrekStore>((set) => ({
  selectedTrekId: null,
  setSelectedTrekId: (id) => set({ selectedTrekId: id }),
  clearSelectedTrek: () => set({ selectedTrekId: null }),
}));
