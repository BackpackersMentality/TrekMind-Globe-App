import { create } from "zustand";

export type Continent = "Africa" | "Asia" | "Europe" | "North America" | "South America" | "Oceania";
export type Accommodation = "Camping" | "Teahouses" | "Huts" | "Hotels" | "Various";
export type LengthBucket = "Short" | "Medium" | "Long";
export type TrekTier = "Tier 1" | "Tier 2" | "Tier 3";

interface FilterState {
  continent: "ALL" | Continent;
  region: string | null;
  accommodation: "ALL" | Accommodation;
  length: "ALL" | LengthBucket;
  tier: "ALL" | TrekTier;
  duration: string | null;
  difficulty: string | null;
  isExpanded: boolean;
  setContinent: (continent: "ALL" | Continent) => void;
  setRegion: (region: string | null) => void;
  setAccommodation: (accommodation: "ALL" | Accommodation) => void;
  setLength: (length: "ALL" | LengthBucket) => void;
  setTier: (tier: "ALL" | TrekTier) => void;
  setDuration: (duration: string | null) => void;
  setDifficulty: (difficulty: string | null) => void;
  setIsExpanded: (isExpanded: boolean) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  continent: "ALL",
  accommodation: "ALL",
  length: "ALL",
  tier: "ALL",
  isExpanded: false,
  setContinent: (continent) => set({ continent }),
  setAccommodation: (accommodation) => set({ accommodation }),
  setLength: (length) => set({ length }),
  setTier: (tier) => set({ tier }),
  setIsExpanded: (isExpanded) => set({ isExpanded }),
  resetFilters: () => set({ continent: "ALL", accommodation: "ALL", length: "ALL", tier: "ALL" }),

  
  resetFilters: () => set({
    continent: "ALL",
    accommodation: "ALL",
    length: "ALL",
    tier: "ALL",
    region: null,
    duration: null,
    difficulty: null,
  }),
}));
}));
