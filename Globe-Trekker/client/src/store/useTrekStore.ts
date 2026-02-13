import { create } from 'zustand';

interface TrekStore {
  selectedTrekId: string | null;
  setSelectedTrekId: (id: string | null) => void;
}

export const useTrekStore = create<TrekStore>((set) => ({
  selectedTrekId: null,
  setSelectedTrekId: (id) => set({ selectedTrekId: id }),
}));
