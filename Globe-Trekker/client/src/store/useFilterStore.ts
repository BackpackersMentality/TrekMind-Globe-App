import { create } from "zustand";

export type Continent = "Africa" | "Asia" | "Europe" | "North America" | "South America" | "Oceania";
export type Accommodation = "Camping" | "Teahouses" | "Huts" | "Hotels" | "Various";
export type LengthBucket = "Short" | "Medium" | "Long";
export type TrekTier = "Tier 1" | "Tier 2" | "Tier 3";

interface FilterState {
  continent: "ALL" | Continent;
  accommodation: "ALL" | Accommodation;
  length: "ALL" | LengthBucket;
  tier: "ALL" | TrekTier;
  isExpanded: boolean;
  setContinent: (continent: "ALL" | Continent) => void;
  setAccommodation: (accommodation: "ALL" | Accommodation) => void;
  setLength: (length: "ALL" | LengthBucket) => void;
  setTier: (tier: "ALL" | TrekTier) => void;
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
}));
