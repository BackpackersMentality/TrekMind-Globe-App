// useTrekList.ts — localStorage trek tracking, no auth required
// Place at: client/src/hooks/useTrekList.ts

import { useState, useEffect, useCallback } from "react";

export type TrekStatus = "completed" | "wishlist" | "inProgress" | null;

interface TrekLists {
  completed:  Set<string>;
  wishlist:   Set<string>;
  inProgress: Set<string>;
}

const STORAGE_KEY = "trekmind_lists";

function loadFromStorage(): TrekLists {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completed: new Set(), wishlist: new Set(), inProgress: new Set() };
    const parsed = JSON.parse(raw);
    return {
      completed:  new Set<string>(parsed.completed  || []),
      wishlist:   new Set<string>(parsed.wishlist   || []),
      inProgress: new Set<string>(parsed.inProgress || []),
    };
  } catch {
    return { completed: new Set(), wishlist: new Set(), inProgress: new Set() };
  }
}

function saveToStorage(lists: TrekLists) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      completed:  Array.from(lists.completed),
      wishlist:   Array.from(lists.wishlist),
      inProgress: Array.from(lists.inProgress),
    }));
  } catch {
    // localStorage unavailable — fail silently
  }
}

export function useTrekList() {
  const [lists, setLists] = useState<TrekLists>(() => loadFromStorage());

  useEffect(() => { saveToStorage(lists); }, [lists]);

  const getStatus = useCallback((trekId: string): TrekStatus => {
    if (lists.completed.has(trekId))  return "completed";
    if (lists.inProgress.has(trekId)) return "inProgress";
    if (lists.wishlist.has(trekId))   return "wishlist";
    return null;
  }, [lists]);

  const toggle = useCallback((trekId: string, status: Exclude<TrekStatus, null>) => {
    setLists(prev => {
      const next: TrekLists = {
        completed:  new Set(prev.completed),
        wishlist:   new Set(prev.wishlist),
        inProgress: new Set(prev.inProgress),
      };
      const current = next.completed.has(trekId)  ? "completed"
                    : next.inProgress.has(trekId) ? "inProgress"
                    : next.wishlist.has(trekId)   ? "wishlist"
                    : null;
      next.completed.delete(trekId);
      next.wishlist.delete(trekId);
      next.inProgress.delete(trekId);
      if (current !== status) next[status].add(trekId);
      return next;
    });
  }, []);

  const counts = {
    completed:  lists.completed.size,
    wishlist:   lists.wishlist.size,
    inProgress: lists.inProgress.size,
  };

  return { getStatus, toggle, counts, lists };
}

// ── Standalone helpers (for GlobeViewer which is outside React) ───────────────

export function getAllStoredStatuses(): Record<string, TrekStatus> {
  const lists = loadFromStorage();
  const result: Record<string, TrekStatus> = {};
  lists.completed.forEach(id  => { result[id] = "completed";  });
  lists.inProgress.forEach(id => { result[id] = "inProgress"; });
  lists.wishlist.forEach(id   => { result[id] = "wishlist";   });
  return result;
}