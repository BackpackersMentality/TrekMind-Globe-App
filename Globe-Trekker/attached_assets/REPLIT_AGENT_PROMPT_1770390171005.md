# Replit Agent Prompt: Add Filters & Swipeable Trek Cards to Globe App

## Task Overview
Integrate a filter system and swipeable trek card navigation into the Globe app. When users click on clustered treks (like multiple treks in Nepal or the Alps), they should see swipeable cards with arrow navigation to browse through all treks in that cluster.

---

## Step 1: Update File Structure

First, ensure these files exist in the correct locations:

### Required Files:
1. `/src/components/Filters.tsx` - The filter modal component (upload the Filters.tsx file I provided)
2. `/src/components/SwipeableTrekCards.tsx` - Swipeable card component (upload the SwipeableTrekCards.tsx file I provided)
3. `/src/lib/clustering.ts` - Clustering utility functions (upload the updated clustering.ts file)
4. `/src/data/treks_unified.ts` - Unified trek database (upload this file to replace old treks.ts)

### Install Dependencies:
```bash
npm install framer-motion lucide-react
```

---

## Step 2: Update GlobeViewer.tsx

Replace the current GlobeViewer.tsx with the following implementation:

### Import Section (top of file):
```typescript
import { useEffect, useRef, useState, useMemo } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { 
  TREKS, 
  getTrekById, 
  getTreksByTier,
  getPopularTreks,
  searchTreks,
  TREK_STATS,
  type Trek
} from "@/data/treks_unified";
import { useTrekStore } from "@/store/useTrekStore";
import { useFilterStore } from "@/store/useFilterStore";
import { 
  clusterTreks, 
  getClusteredTreks,
  type TrekCluster 
} from "@/lib/clustering";
import { Filters } from '@/components/Filters';
import { SwipeableTrekCards } from '@/components/SwipeableTrekCards';
```

### Add State Variables (inside GlobeViewer component):
```typescript
// Filter state
const [filters, setFilters] = useState({
  tier: [] as number[],
  continent: [] as string[],
  accommodation: [] as string[],
  duration: [] as string[],
  difficulty: [] as string[]
});
const [showFilters, setShowFilters] = useState(false);

// Swipeable cards state
const [swipeableTreks, setSwipeableTreks] = useState<Trek[] | null>(null);
const [initialTrekIndex, setInitialTrekIndex] = useState(0);
```

### Add Filter Logic (after state declarations):
```typescript
// Filter treks based on filter state
const filteredTreks = useMemo(() => {
  return TREKS.filter(trek => {
    // Store filters (existing filters from useFilterStore)
    const matchContinent = continent === "ALL" || trek.continent === continent;
    const matchAccommodation = accommodation === "ALL" || trek.accommodation === accommodation;
    const matchTier = tier === "ALL" || trek.tier === tier;
    
    let matchLength = true;
    if (length !== "ALL") {
      if (length === "Short") matchLength = trek.lengthDays >= 1 && trek.lengthDays <= 4;
      else if (length === "Medium") matchLength = trek.lengthDays >= 5 && trek.lengthDays <= 9;
      else if (length === "Long") matchLength = trek.lengthDays >= 10;
    }

    // Additional filters from Filters modal
    if (filters.tier.length > 0 && !filters.tier.includes(trek.tier)) {
      return false;
    }
    
    if (filters.continent.length > 0 && !filters.continent.includes(trek.continent)) {
      return false;
    }
    
    if (filters.accommodation.length > 0 && !filters.accommodation.includes(trek.accommodation)) {
      return false;
    }
    
    if (filters.duration.length > 0) {
      const duration = 
        trek.lengthDays <= 5 ? 'short' :
        trek.lengthDays <= 14 ? 'medium' :
        'long';
      
      if (!filters.duration.includes(duration)) {
        return false;
      }
    }
    
    if (filters.difficulty.length > 0 && !filters.difficulty.includes(trek.difficulty)) {
      return false;
    }

    return matchContinent && matchAccommodation && matchLength && matchTier;
  });
}, [continent, accommodation, length, tier, filters]);
```

### Update htmlElement Click Handler:
Replace the `el.onpointerdown` section in your `htmlElement` callback with:

```typescript
el.onpointerdown = (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  if (isCluster) {
    // Cluster clicked - show swipeable cards for all treks in cluster
    setSwipeableTreks(d.treks);
    setInitialTrekIndex(0);
  } else {
    // Single trek clicked - check if it has nearby treks
    const clusteredTreks = getClusteredTreks(d.id, TREKS, 500);
    
    if (clusteredTreks && clusteredTreks.length > 1) {
      // Multiple treks nearby - enable swipe navigation
      const trekIndex = clusteredTreks.findIndex(t => t.id === d.id);
      setSwipeableTreks(clusteredTreks);
      setInitialTrekIndex(trekIndex);
    } else {
      // Single isolated trek - show just this one
      setSwipeableTreks([d]);
      setInitialTrekIndex(0);
    }
  }
};
```

### Update Return Statement:
Wrap your Globe component in a fragment and add the modals:

```typescript
return (
  <>
    <Globe
      ref={globeEl}
      width={dimensions.width}
      height={dimensions.height}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      
      htmlElementsData={clusteredData}
      htmlLat="lat"
      htmlLng="lng"
      htmlElement={(d: any) => {
        // ... your existing htmlElement code ...
      }}
      
      onGlobeClick={() => {
        setSelectedTrekId(null);
      }}
      
      atmosphereColor="#3a228a"
      atmosphereAltitude={0.15}
    />

    {/* Swipeable trek cards modal */}
    {swipeableTreks && (
      <SwipeableTrekCards
        treks={swipeableTreks}
        initialIndex={initialTrekIndex}
        onClose={() => setSwipeableTreks(null)}
      />
    )}

    {/* Filters modal */}
    {showFilters && (
      <Filters
        filters={filters}
        onFilterChange={setFilters}
        onClose={() => setShowFilters(false)}
      />
    )}
  </>
);
```

---

## Step 3: Add Filter Button to UI

Add a filter button to trigger the filter modal. This should go in your main UI component (wherever you have the globe controls).

### Option A: Add to existing controls
If you have a control panel or header, add this button:

```typescript
<button
  onClick={() => setShowFilters(true)}
  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
>
  <FilterIcon className="w-4 h-4" />
  Filters
  {(filters.tier.length + filters.continent.length + filters.accommodation.length + filters.duration.length + filters.difficulty.length) > 0 && (
    <span className="bg-white text-blue-600 text-xs px-2 py-0.5 rounded-full ml-1">
      {filters.tier.length + filters.continent.length + filters.accommodation.length + filters.duration.length + filters.difficulty.length}
    </span>
  )}
</button>
```

### Option B: Floating Action Button
If you don't have a control panel, add a floating button:

```typescript
{/* Floating filter button */}
<div className="fixed bottom-20 right-4 z-40">
  <button
    onClick={() => setShowFilters(true)}
    className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center"
  >
    <FilterIcon className="w-6 h-6" />
    {(filters.tier.length + filters.continent.length + filters.accommodation.length + filters.duration.length + filters.difficulty.length) > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
        {filters.tier.length + filters.continent.length + filters.accommodation.length + filters.duration.length + filters.difficulty.length}
      </span>
    )}
  </button>
</div>
```

---

## Step 4: Add CSS for Animations

Add this to your global CSS file (index.css or App.css):

```css
/* Smooth animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

/* Safe area for mobile notches */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}

/* Trek marker styles */
.marker-dot {
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border: 2px solid white;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
}

.marker-dot:hover {
  transform: scale(1.3);
}

/* Trek label visibility */
.trek-label {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  margin-top: 8px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
}

.label-visible .trek-label {
  opacity: 1;
}
```

---

## Step 5: Testing Instructions

After implementing the changes, test the following:

### Filter Testing:
1. Click the filter button → filter modal should open
2. Select "Tier 1" → only tier 1 treks should show on globe
3. Select "Asia" continent → only Asian treks visible
4. Select multiple filters → filters should combine (AND logic)
5. Click "Clear all filters" → all treks reappear
6. Close filters → changes should persist

### Swipeable Cards Testing:
1. Click on Nepal region (should have 10+ clustered treks)
   - Swipeable cards should open
   - Counter should show "1 / 10" (or similar)
   - Arrows should be visible
2. Click right arrow → should swipe to next trek
3. Click left arrow → should swipe to previous trek
4. Swipe left/right on mobile → cards should swipe
5. Click outside cards → should close
6. Press ESC key → should close
7. Dot indicators at bottom should show position

### Edge Cases:
1. Click isolated trek (like Kilimanjaro) → should show single card
2. Click cluster badge → should show all treks in cluster
3. Globe markers should update when filters change
4. Trek count should update in UI when filtered

---

## Expected Behavior

### When User Clicks Clustered Trek Marker:
1. Swipeable cards modal opens
2. Shows counter: "X / Y treks in this cluster"
3. Left/right arrows visible (except at edges)
4. Can swipe on mobile, click arrows on desktop
5. Dot indicators show position
6. Each card shows:
   - Trek hero image
   - Trek name and country
   - Difficulty, accommodation, length badges
   - Description
   - "View Full Details" button

### When User Opens Filters:
1. Full-screen modal with black background
2. 5 filter sections (all expanded by default):
   - Tier (Tier 1, 2, 3)
   - Continent (8 options)
   - Accommodation (5 options)
   - Duration (Short, Medium, Long)
   - Difficulty (Easy, Moderate, Hard, Extreme)
3. Active filter count badges
4. "Clear all filters" button
5. "Apply Filters" button at bottom
6. Globe updates when filters applied

---

## Troubleshooting

### If filters don't open:
- Check that `showFilters` state is defined
- Verify Filters component is imported correctly
- Check filter button onClick handler

### If swipeable cards don't open:
- Check that `swipeableTreks` state is defined
- Verify SwipeableTrekCards component is imported
- Check clustering.ts exports getClusteredTreks function

### If trek markers disappear:
- Check filteredTreks is being used in htmlElementsData
- Verify filter logic doesn't exclude all treks
- Check TREKS import from treks_unified.ts

### If TypeScript errors:
- Make sure Trek type is imported from treks_unified
- Verify all required files are in correct locations
- Check that treks_unified.ts has complete Trek type definition

---

## Final Checklist

Before marking complete:
- [ ] Filter button visible in UI
- [ ] Clicking filter button opens modal
- [ ] All 5 filter sections visible
- [ ] Selecting filters updates globe markers
- [ ] Clicking clustered treks opens swipeable cards
- [ ] Arrow navigation works
- [ ] Swipe gestures work on mobile
- [ ] Cards show correct trek data
- [ ] Counter shows correct position
- [ ] ESC key closes modals
- [ ] No console errors
- [ ] TypeScript compiles without errors
- [ ] All 67 treks load correctly

---

## Notes

- The unified database (treks_unified.ts) is the single source of truth
- All Trek objects have the same structure now
- Clustering automatically detects treks within 500km
- Filters use AND logic (all selected filters must match)
- Swipeable cards work for both clustered and single treks

Good luck! Let me know if you encounter any issues during implementation.
