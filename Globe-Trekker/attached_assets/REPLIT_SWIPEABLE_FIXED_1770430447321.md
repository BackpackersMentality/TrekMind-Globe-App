# Replit Agent Prompt: Add Swipeable Trek Cards (Fixed for Existing Clustering)

## Goal
Add swipeable trek cards with arrow navigation when users click on trek markers. Users can swipe on mobile or use arrow buttons to browse through nearby treks.

---

## Part 1: Install Dependencies

First, run this command:
```bash
npm install framer-motion lucide-react
```

---

## Part 2: Create SwipeableTrekCards Component

Create a new file: `/src/components/SwipeableTrekCards.tsx`

Copy this entire code:

```typescript
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface SwipeableTrekCardsProps {
  treks: any[];
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrevious) paginate(-1);
      else if (e.key === 'ArrowRight' && hasNext) paginate(1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, treks.length, hasPrevious, hasNext]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 text-white hover:text-gray-300"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="absolute top-4 left-4 z-50 text-white text-sm">
        <span className="bg-blue-600 px-3 py-1 rounded-full">
          {currentIndex + 1} / {treks.length}
        </span>
        {treks.length > 1 && (
          <p className="mt-2 text-xs text-gray-300">
            {treks.length} treks nearby
          </p>
        )}
      </div>

      {hasPrevious && (
        <button
          onClick={() => paginate(-1)}
          className="absolute left-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {hasNext && (
        <button
          onClick={() => paginate(1)}
          className="absolute right-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

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
            <div className="bg-gray-900 rounded-2xl overflow-hidden h-full flex flex-col shadow-2xl">
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
                
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 className="text-3xl font-bold text-white mb-2">{currentTrek.name}</h2>
                  <p className="text-white/80 text-sm">{currentTrek.country}</p>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
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

                <p className="text-gray-300 text-sm leading-relaxed mb-6">
                  {currentTrek.shortDescription || currentTrek.keyFeatures}
                </p>

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
    </div>
  );
};
```

---

## Part 3: Update GlobeViewer.tsx

### Step 1: Add import at the top
Find your imports and add this line:
```typescript
import { SwipeableTrekCards } from '@/components/SwipeableTrekCards';
```

### Step 2: Add state variables
Inside the GlobeViewer component function, add these state variables near the top:
```typescript
const [swipeableTreks, setSwipeableTreks] = useState<any[] | null>(null);
const [initialTrekIndex, setInitialTrekIndex] = useState(0);
```

### Step 3: Update the marker click handler
Find the `el.onpointerdown` section in your `htmlElement` callback.

Replace it with this:
```typescript
el.onpointerdown = (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  if (isCluster) {
    // Cluster clicked - show all treks in cluster
    setSwipeableTreks(d.treks);
    setInitialTrekIndex(0);
  } else {
    // Single trek clicked - just show this one trek
    setSwipeableTreks([d]);
    setInitialTrekIndex(0);
  }
};
```

### Step 4: Update the return statement
Find the `return` statement that returns the `<Globe>` component.

Change it from:
```typescript
return (
  <Globe ... />
);
```

To:
```typescript
return (
  <>
    <Globe
      // ... all your existing props stay the same ...
    />

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

## Testing

After making these changes:

1. **Click on a cluster badge** (like the Nepal region)
   - Should show swipeable cards
   - Counter shows "1 / X"
   - Can click arrows to navigate
   
2. **Click on a single trek**
   - Should show one card
   - No arrows (only 1 trek)
   - Can close with X button

3. **Test navigation**
   - Click right arrow → next trek
   - Click left arrow → previous trek
   - Swipe left/right on mobile
   - Press ← → keys on keyboard
   - Press ESC to close

---

## What This Does

- ✅ Shows beautiful cards when clicking trek markers
- ✅ Left/right arrows for navigation
- ✅ Swipe gestures on mobile
- ✅ Trek counter (1 / X)
- ✅ Dot indicators at bottom
- ✅ Keyboard shortcuts (←, →, ESC)
- ✅ Close button
- ✅ Smooth animations
- ✅ Works with clusters AND single treks

---

## Important Notes

- This version works with your **existing clustering.ts** file
- No need to modify clustering.ts at all
- Uses the cluster data that already exists in your Globe component
- Simple and straightforward implementation

---

If you get any errors, check:
1. framer-motion and lucide-react are installed
2. SwipeableTrekCards.tsx is in `/src/components/` folder
3. Import path uses `@/components/` (or adjust to `../components/` if no path alias)
4. The `<Globe>` component is wrapped in `<>...</>` fragments
