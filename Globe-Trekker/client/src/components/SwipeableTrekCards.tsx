import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Star, Calendar } from 'lucide-react';

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

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 text-white text-sm flex flex-col items-center">
        <span className="bg-blue-600 px-3 py-1 rounded-full whitespace-nowrap">
          {currentIndex + 1} / {treks.length}
        </span>
        {treks.length > 1 && (
          <p className="mt-2 text-[10px] text-gray-300 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
            {treks.length} treks nearby
          </p>
        )}
      </div>

      {/* Navigation buttons - Hidden on small mobile if they obscure content, moved to edges */}
      {hasPrevious && (
        <button
          onClick={() => paginate(-1)}
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-50 p-2 md:p-4 bg-black/60 hover:bg-black/80 rounded-full backdrop-blur-sm transition-all shadow-lg border border-white/20"
        >
          <ChevronLeft className="w-5 h-5 md:w-8 md:h-8 text-white" />
        </button>
      )}

      {hasNext && (
        <button
          onClick={() => paginate(1)}
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-50 p-2 md:p-4 bg-black/60 hover:bg-black/80 rounded-full backdrop-blur-sm transition-all shadow-lg border border-white/20"
        >
          <ChevronRight className="w-5 h-5 md:w-8 md:h-8 text-white" />
        </button>
      )}

      <div className="relative w-full max-w-lg md:max-w-2xl h-[75vh] md:h-[80vh] overflow-hidden px-10 md:px-16 flex items-center justify-center">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={{
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
            }}
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
            <div className="bg-gray-900 rounded-2xl overflow-hidden h-full flex flex-col shadow-2xl border border-white/10">
              <div className="relative h-2/5 md:h-1/2 bg-gray-800">
                <img
                  src={`https://cdn.jsdelivr.net/gh/BackpackersMentality/trekmind-images@main/treks/${currentTrek.id}.jpg`}
                  alt={currentTrek.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Trek+Image';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                  <h2 className="text-xl md:text-3xl font-bold text-white mb-1 md:mb-2 leading-tight">{currentTrek.name}</h2>
                  <p className="text-white/80 text-xs md:text-sm">{currentTrek.country}</p>
                </div>
              </div>

              <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar">
                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4">
                  {/* Tier badge */}
                  <span className="px-2 md:px-3 py-0.5 md:py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-[10px] md:text-xs font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    Tier {currentTrek.tier || currentTrek.iconicTier}
                  </span>
                  
                  {/* Difficulty badge */}
                  <span className="px-2 md:px-3 py-0.5 md:py-1 bg-blue-500/20 text-blue-300 rounded-full text-[10px] md:text-xs">
                    {currentTrek.difficulty}
                  </span>
                  
                  {/* Accommodation badge */}
                  <span className="px-2 md:px-3 py-0.5 md:py-1 bg-purple-500/20 text-purple-300 rounded-full text-[10px] md:text-xs">
                    {currentTrek.accommodation}
                  </span>
                  
                  {/* Duration badge */}
                  <span className="px-2 md:px-3 py-0.5 md:py-1 bg-green-500/20 text-green-300 rounded-full text-[10px] md:text-xs">
                    {currentTrek.lengthDays} days
                  </span>
                  
                  {/* Distance badge */}
                  <span className="px-2 md:px-3 py-0.5 md:py-1 bg-orange-500/20 text-orange-300 rounded-full text-[10px] md:text-xs">
                    📏 {currentTrek.distance}
                  </span>
                  
                  {/* Max Altitude badge */}
                  <span className="px-2 md:px-3 py-0.5 md:py-1 bg-red-500/20 text-red-300 rounded-full text-[10px] md:text-xs flex items-center gap-1">
                    ⛰️ {currentTrek.maxAltitudeFormatted || `${currentTrek.maxAltitude}m`}
                  </span>

                  {/* Popularity badge */}
                  <span className="px-2 md:px-3 py-0.5 md:py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-[10px] md:text-xs flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                    {currentTrek.popularityScore}/10
                  </span>

                  {/* Best Season badge */}
                  <span className="px-2 md:px-3 py-0.5 md:py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] md:text-xs flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {currentTrek.bestSeason}
                  </span>
                </div>

                <p className="text-gray-300 text-xs md:text-sm leading-relaxed mb-6">
                  {currentTrek.shortDescription || currentTrek.keyFeatures}
                </p>

                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('select-trek', { detail: currentTrek.id }));
                    onClose();
                  }}
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2.5 md:py-3 rounded-lg transition-colors text-sm md:text-base font-bold shadow-lg"
                >
                  View Full Details
                </button>
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
