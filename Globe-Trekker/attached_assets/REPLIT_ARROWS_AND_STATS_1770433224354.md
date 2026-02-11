# Replit Agent Prompt: Add Arrow Buttons & Trek Stats to Swipeable Cards

## Goal
Enhance the swipeable trek cards with visible left/right arrow buttons on either side of the card, and add three additional stats badges: Tier, Distance, and Max Altitude.

---

## Part 1: Add Arrow Buttons to Card Sides

Update the SwipeableTrekCards component to show arrows directly on the card container (not floating in the corners).

### In `/src/components/SwipeableTrekCards.tsx`:

Find this section (around line 70-90):
```typescript
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
```

**Replace with:**
```typescript
{/* Previous button - ON the card */}
{hasPrevious && (
  <button
    onClick={() => paginate(-1)}
    className="absolute left-2 top-1/2 -translate-y-1/2 z-50 p-4 bg-black/60 hover:bg-black/80 rounded-full backdrop-blur-sm transition-all shadow-lg border border-white/20"
    style={{ marginLeft: '-20px' }}
  >
    <ChevronLeft className="w-8 h-8 text-white" />
  </button>
)}

{/* Next button - ON the card */}
{hasNext && (
  <button
    onClick={() => paginate(1)}
    className="absolute right-2 top-1/2 -translate-y-1/2 z-50 p-4 bg-black/60 hover:bg-black/80 rounded-full backdrop-blur-sm transition-all shadow-lg border border-white/20"
    style={{ marginRight: '-20px' }}
  >
    <ChevronRight className="w-8 h-8 text-white" />
  </button>
)}
```

**What this does:**
- Positions arrows on the sides of the card (not in corners)
- Uses `top-1/2 -translate-y-1/2` to center them vertically
- Larger buttons (p-4 instead of p-3)
- Larger icons (w-8 h-8 instead of w-6 h-6)
- Darker background for better visibility
- Extends slightly outside card edge with negative margins

---

## Part 2: Add Three New Stats Badges

Update the badges section to include Tier, Distance, and Max Altitude.

### In `/src/components/SwipeableTrekCards.tsx`:

Find this section (around line 130-145):
```typescript
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
```

**Replace with:**
```typescript
{/* Badges */}
<div className="flex flex-wrap gap-2 mb-4">
  {/* Tier badge */}
  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs font-semibold flex items-center gap-1">
    <span className="text-yellow-400">★</span>
    Tier {currentTrek.tier || currentTrek.iconicTier}
  </span>
  
  {/* Difficulty badge */}
  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
    {currentTrek.difficulty}
  </span>
  
  {/* Accommodation badge */}
  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
    {currentTrek.accommodation}
  </span>
  
  {/* Duration badge */}
  <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
    {currentTrek.lengthDays} days
  </span>
  
  {/* Distance badge */}
  <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-xs">
    📏 {currentTrek.distance}
  </span>
  
  {/* Max Altitude badge */}
  <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs">
    ⛰️ {currentTrek.maxAltitudeFormatted || `${currentTrek.maxAltitude}m`}
  </span>
</div>
```

**What this does:**
- **Tier** - Yellow badge with star icon
- **Difficulty** - Blue (existing)
- **Accommodation** - Purple (existing)
- **Duration** - Green (existing)
- **Distance** - Orange with ruler emoji
- **Max Altitude** - Red with mountain emoji

---

## Part 3: Make Sure Drag Still Works

The arrow buttons should work alongside the drag/swipe gesture. The existing code already supports both, so no changes needed here. Just verify:

✅ Click arrows → navigates  
✅ Swipe/drag → also navigates  
✅ Both methods work together

---

## Testing Checklist

After making these changes, test:

### Arrow Buttons:
1. [ ] Left arrow appears on left side of card (when not on first trek)
2. [ ] Right arrow appears on right side of card (when not on last trek)
3. [ ] Arrows are centered vertically on the card
4. [ ] Arrows extend slightly beyond card edge
5. [ ] Clicking arrows navigates between treks
6. [ ] Arrows have visible background (not transparent)

### Swipe/Drag:
1. [ ] Can still swipe left/right on mobile
2. [ ] Can still drag card on desktop
3. [ ] Swipe and arrow buttons both work (not conflicting)

### Stats Badges:
1. [ ] Tier badge shows with star icon (yellow)
2. [ ] Distance badge shows with ruler emoji (orange)
3. [ ] Max altitude badge shows with mountain emoji (red)
4. [ ] All 6 badges visible and properly colored
5. [ ] Badges wrap to next line on smaller screens
6. [ ] All stats display correct values

### Overall:
1. [ ] Card looks good with arrows on sides
2. [ ] No layout issues on mobile
3. [ ] No layout issues on desktop
4. [ ] Stats are easy to read
5. [ ] Everything animates smoothly

---

## Expected Result

Your trek cards should now look like this:

```
[←]  ┌─────────────────────────┐  [→]
     │   [Trek Hero Image]      │
     │                          │
     │   Trek Name              │
     │   Country                │
     ├──────────────────────────┤
     │ ★ Tier 2  🔵 Hard        │
     │ 🏕️ Camping  🕐 10 days   │
     │ 📏 100 km  ⛰️ 5000m      │
     │                          │
     │ [Description text...]    │
     │                          │
     │ [View Full Details]      │
     └──────────────────────────┘
```

**Arrow positions:**
- Left arrow: Positioned on left edge, vertically centered
- Right arrow: Positioned on right edge, vertically centered
- Both arrows extend slightly outside the card for easy clicking

**Stats order:**
1. ★ Tier (yellow)
2. Difficulty (blue)
3. Accommodation (purple)
4. Days (green)
5. Distance (orange)
6. Max Altitude (red)

---

## Troubleshooting

**If arrows are not visible:**
- Check that `hasPrevious` and `hasNext` are working
- Verify z-index is z-50 (high enough)
- Check background opacity (should be bg-black/60)

**If arrows are in wrong position:**
- Verify `absolute` positioning is set
- Check `top-1/2 -translate-y-1/2` is applied
- Confirm negative margins are working

**If stats don't show:**
- Check that trek data has these fields: `tier`, `distance`, `maxAltitude`
- Verify the trek object is being passed correctly
- Use fallback: `currentTrek.tier || currentTrek.iconicTier`

**If badges overlap:**
- Check `flex-wrap` is applied to container
- Verify `gap-2` spacing is set
- Try reducing badge padding on mobile

---

## Notes

- Arrow buttons and drag/swipe both work together - they don't conflict
- Emojis (📏, ⛰️, ★) provide visual cues without needing icon imports
- Color coding helps distinguish different stat types quickly
- Negative margins on arrows make them easier to click without covering content
- All changes are in one file: SwipeableTrekCards.tsx

That's it! Your swipeable cards will now have prominent arrow buttons and complete trek statistics.
