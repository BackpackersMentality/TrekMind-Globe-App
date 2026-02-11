import { z } from "zod";

export const trekDifficultyEnum = z.enum(["Easy", "Moderate", "Hard", "Extreme"]);

export const trekContinentEnum = z.enum(["Africa", "Asia", "Europe", "North America", "South America", "Oceania"]);

export const trekGlobeNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  region: z.string(),
  continent: trekContinentEnum,
  latitude: z.number(),
  longitude: z.number(),
  difficulty: trekDifficultyEnum,
  days: z.number(),
  maxAltitude: z.number(),
  distanceKm: z.number(),
  popularityScore: z.number(),
});

export type TrekGlobeNode = z.infer<typeof trekGlobeNodeSchema>;
