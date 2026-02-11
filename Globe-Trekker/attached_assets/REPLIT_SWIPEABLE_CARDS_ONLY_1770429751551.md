# Replit Agent Prompt: Add Swipeable Trek Cards with Arrow Navigation

## Goal
When users click on trek markers (especially clustered treks), show swipeable cards with left/right arrows to browse through all nearby treks. Users should be able to swipe on mobile or use arrow buttons on desktop.

---

## Files to Add

### 1. Create `/src/components/SwipeableTrekCards.tsx`

```typescript
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Trek {
  id: string;
  name: string;
  country: string;
  difficulty: string;
  accommodation: string;
  lengthDays: number;
  shortDescription: string;
}

interface SwipeableTrekCardsProps {
  treks: Trek[];
  onClose: () => void;
  initialIndex?: number;
}

export const SwipeableTrekCards: React.FC<SwipeableTrekCardsProps> = ({ 
  treks, 
  onClose,
  initialIndex = 0 
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);

  const currentTrek = treks[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < treks.length - 1;

  const paginate = (newDirection: number) => {
    const newIndex = currentIndex + newDirection;
    if (newIndex >= 0 && newIndex < treks.length) {
      setDirection(newDirection);
      setCurrentIndex(newIndex);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrevious) paginate(-1);
      else if (e.key === 'ArrowRight' && hasNext) paginate(1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, treks.length]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 text-white hover:text-gray-300"
      >
        <X className="w-8 h-8" />
      </button>

      {/* Trek counter */}
      <div className="absolute top-4 left-4 z-50 text-white text-sm">
        <span className="bg-blue-600 px-3 py-1 rounded-full">
          {currentIndex + 1} / {treks.length}
        </span>
        {treks.length > 1 && (
          <p className="mt-2 text-xs text-gray-300">
            {treks.length} treks in this cluster
          </p>
        )}
      </div>

      {/* Previous button */}
      {hasPrevious && (
        <button
          onClick={() => paginate(-1)}
          className="absolute left-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          onClick={() => paginate(1)}
          className="absolute right-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Swipeable card container */}
      <div className="relative w-full max-w-2xl h-[80vh] overflow-hidden px-16">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = Math.abs(offset.x) * velocity.x;
              if (swipe < -10000 && hasNext) paginate(1);
              else if (swipe > 10000 && hasPrevious) paginate(-1);
            }}
            className="absolute w-full h-full"
          >
            {/* Trek Card */}
            <div className="bg-gray-900 rounded-2xl overflow-hidden h-full flex flex-col shadow-2xl">
              {/* Hero image */}
              <div className="relative h-1/2 bg-gray-800">
                <img
                  src={`https://cdn.jsdelivr.net/gh/BackpackersMentality/trekmind-images@main/treks/${currentTrek.id}.jpg`}
                  alt={currentTrek.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Trek+Image';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                
                {/* Trek name overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 className="text-3xl font-bold text-white mb-2">{currentTrek.name}</h2>
                  <p className="text-white/80 text-sm">{currentTrek.country}</p>
                </div>
              </div>

              {/* Trek details */}
              <div className="p-6 overflow-y-auto flex-1">
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
                    {currentTrek.difficulty}
                  </span>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                    {currentTrek.accommodation}
                  </span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
                    {currentTrek.lengthDays} days
                  </span>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-sm leading-relaxed mb-6">
                  {currentTrek.shortDescription}
                </p>

                {/* View details button */}
                <a
                  href={`/trek/${currentTrek.id}`}
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-lg transition-colors"
                >
                  View Full Details
                </a>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      {treks.length > 1 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
          {treks.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-blue-500 w-8' 
                  : 'bg-white/30 hover:bg-white/50 w-2'
              }`}
            />
          ))}
        </div>
      )}

      {/* Swipe hint */}
      {currentIndex === 0 && treks.length > 1 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-white/60 text-sm animate-pulse">
          ← Swipe to explore more treks →
        </div>
      )}
    </div>
  );
};
```

### 2. Update `/src/lib/clustering.ts`

Add this function if it doesn't exist:

```typescript
export function getClusteredTreks(
  trekId: string,
  allTreks: any[],
  maxDistance: number = 500
): any[] | null {
  const targetTrek = allTreks.find(t => t.id === trekId);
  if (!targetTrek) return null;

  const clustered = [targetTrek];
  
  // Haversine distance calculation
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  for (const trek of allTreks) {
    if (trek.id === trekId) continue;
    
    const distance = getDistance(
      targetTrek.lat,
      targetTrek.lng,
      trek.lat,
      trek.lng
    );
    
    if (distance <= maxDistance) {
      clustered.push(trek);
    }
  }

  return clustered.length > 1 ? clustered : null;
}
```

---

## Update GlobeViewer.tsx

### 1. Add imports at the top:
```typescript
import { SwipeableTrekCards } from '@/components/SwipeableTrekCards';
import { getClusteredTreks } from '@/lib/clustering';
```

### 2. Add state variables (inside component):
```typescript
const [swipeableTreks, setSwipeableTreks] = useState<any[] | null>(null);
const [initialTrekIndex, setInitialTrekIndex] = useState(0);
```

### 3. Find the `el.onpointerdown` section in your `htmlElement` callback

Replace it with:
```typescript
el.onpointerdown = (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  if (isCluster) {
    // Cluster clicked - show all treks in cluster
    setSwipeableTreks(d.treks);
    setInitialTrekIndex(0);
  } else {
    // Single trek - check for nearby treks
    const clusteredTreks = getClusteredTreks(d.id, TREKS, 500);
    
    if (clusteredTreks && clusteredTreks.length > 1) {
      // Found nearby treks - enable swipe
      const trekIndex = clusteredTreks.findIndex(t => t.id === d.id);
      setSwipeableTreks(clusteredTreks);
      setInitialTrekIndex(trekIndex);
    } else {
      // Single isolated trek
      setSwipeableTreks([d]);
      setInitialTrekIndex(0);
    }
  }
};
```

### 4. Update the return statement

Wrap your Globe in a fragment and add the SwipeableTrekCards:

```typescript
return (
  <>
    <Globe
      // ... all your existing Globe props ...
    />

    {/* Swipeable trek cards */}
    {swipeableTreks && (
      <SwipeableTrekCards
        treks={swipeableTreks}
        initialIndex={initialTrekIndex}
        onClose={() => setSwipeableTreks(null)}
      />
    )}
  </>
);
```

---

## Install Dependencies

Run this command:
```bash
npm install framer-motion lucide-react
```

---

## Testing

After implementation, test these scenarios:

### Single Trek Click:
1. Click on Kilimanjaro (isolated trek)
   - Should show single card
   - No arrows (only 1 trek)
   - Counter shows "1 / 1"

### Clustered Trek Click:
1. Click on Everest Base Camp (Nepal region)
   - Should show multiple cards
   - Counter shows "1 / 10" (or similar)
   - Left/right arrows visible
   - Can navigate with arrows
   - Can swipe on mobile
   - Dot indicators show position

### Navigation:
1. Click right arrow → moves to next trek
2. Click left arrow → moves to previous trek
3. At first trek → left arrow hidden
4. At last trek → right arrow hidden
5. Press ← key → previous trek
6. Press → key → next trek
7. Press ESC → closes cards

### Cluster Badge Click:
1. Click cluster badge on map
   - Should show all treks in that cluster
   - Cards start at first trek

---

## Expected Results

**When clicking treks in Nepal:**
- Shows ~10 cards to swipe through
- Counter: "1 / 10", "2 / 10", etc.
- Smooth transitions between cards
- Images load from GitHub CDN

**When clicking treks in Alps:**
- Shows ~6 cards to swipe through
- Each card has trek name, country, badges
- "View Full Details" button links to detail page

**When clicking isolated treks:**
- Shows single card
- No navigation arrows
- Still looks good!

---

## Troubleshooting

**If cards don't open:**
- Check `swipeableTreks` state is defined
- Verify SwipeableTrekCards is imported
- Check console for errors

**If arrows don't work:**
- Verify framer-motion is installed
- Check `paginate` function is called correctly

**If images don't load:**
- Check trek.id matches image filename
- Verify GitHub CDN URL is correct

**If swipe doesn't work on mobile:**
- Check `drag="x"` prop on motion.div
- Verify `onDragEnd` handler is set

---

## Key Features

✅ Left/right arrow buttons  
✅ Swipe gestures for mobile  
✅ Keyboard shortcuts (←/→/ESC)  
✅ Trek counter (1 / X)  
✅ Dot indicators  
✅ Auto-detects nearby treks (500km radius)  
✅ Smooth animations  
✅ Works with clusters  
✅ Works with single treks  

---

That's it! Once implemented, clicking any trek marker will open beautiful swipeable cards with full navigation support.
