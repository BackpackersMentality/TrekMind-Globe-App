import { type TrekGlobeNode } from "@shared/schema";

export interface IStorage {
  // Minimal storage interface
}

export class MemStorage implements IStorage {
  constructor() {}
}

export const storage = new MemStorage();
