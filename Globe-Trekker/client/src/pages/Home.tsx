import { useState, useMemo, useEffect, useRef } from "react";
import { GlobeViewer } from "@/components/GlobeViewer";
import { TrekDetailPanel } from "@/components/TrekDetailPanel";
import { TREKS } from "@/data/treks";
import { AnimatePresence, motion } from "framer-motion";
import { Compass, X, Clock, Home as HomeIcon, ChevronLeft, ChevronRight, Plus, Minus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrekStore } from "@/store/useTrekStore";
import { clusterTreks } from "@/lib/clustering";
import logoPng from "@assets/Untitled_design_(2)_1768023183832.png";

export default function Home() {
  const isEmbed = useMemo(() => new URLSearchParams(window.location.search).get("embed") === "true", []);
  const { selectedTrekId, setSelectedTrekId, clearSelectedTrek } = useTrekStore();
  const [isMobile, setIsMobile] = useState(false);

  const zoomInterval = useRef<NodeJS.Timeout | null>(null);

  const startZoom = (direction: 'in' | 'out') => {
    // Initial zoom
    window.dispatchEvent(new CustomEvent('globe-zoom', { detail: direction }));
    
    // Set interval for continuous zoom
    if (zoomInterval.current) clearInterval(zoomInterval.current);
    zoomInterval.current = setInterval(() => {
      window.dispatchEvent(new CustomEvent('globe-zoom', { detail: direction }));
    }, 100);
  };

  const stopZoom = () => {
    if (zoomInterval.current) {
      clearInterval(zoomInterval.current);
      zoomInterval.current = null;
    }
  };

  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    window.dispatchEvent(new CustomEvent('globe-zoom', { detail: direction }));
  };

  const activeFilterCount = 0;

  const filteredTreks = TREKS;

  const clusters = useMemo(() => clusterTreks(filteredTreks, 100), [filteredTreks]);

  const selectedCluster = useMemo(() => {
    if (!selectedTrekId) return null;
    return (clusters as any[]).find(c => {
      if (c.isCluster) {
        return c.treks.some((t: any) => String(t.id) === String(selectedTrekId));
      }
      return String(c.id) === String(selectedTrekId);
    }) || null;
  }, [selectedTrekId, clusters]);

  const clusterTreksList = useMemo(() => {
    if (!selectedCluster) return [];
    if (selectedCluster.isCluster) {
      return selectedCluster.treks;
    }
    const trek = TREKS.find(t => String(t.id) === String(selectedTrekId));
    return trek ? [trek] : [];
  }, [selectedCluster, selectedTrekId]);

  const currentTrekIndex = useMemo(() => {
    return clusterTreksList.findIndex((t: any) => String(t.id) === String(selectedTrekId));
  }, [clusterTreksList, selectedTrekId]);

  const nextTrek = () => {
    if (currentTrekIndex < clusterTreksList.length - 1) {
      setSelectedTrekId(String(clusterTreksList[currentTrekIndex + 1].id));
    }
  };

  const prevTrek = () => {
    if (currentTrekIndex > 0) {
      setSelectedTrekId(String(clusterTreksList[currentTrekIndex - 1].id));
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const selectedTrek = useMemo(() => {
    return TREKS.find(t => String(t.id) === String(selectedTrekId)) || null;
  }, [selectedTrekId]);

  if (!isEmbed) {
    console.log("ACTIVE TREK:", selectedTrek?.name);
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      
      {/* 3D Globe Layer */}
      <div className="absolute inset-0 z-0">
        <GlobeViewer />
      </div>

      {/* Brand Overlay (Top Left) */}
      {!isEmbed && (
        <div className="absolute top-6 left-6 z-20 pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="p-1 bg-primary/20 backdrop-blur-md rounded-lg border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <img src={logoPng} alt="TrekMind Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-white tracking-wide">
                Trek<span className="text-primary">Mind</span>
              </h1>
              <p className="text-xs text-primary/80 uppercase tracking-widest font-medium">Global Explorer</p>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Controls (Bottom Right) */}
      <div className="absolute bottom-6 right-6 md:right-10 md:bottom-10 z-20 flex flex-col gap-2">
        <Button
          size="icon"
          variant="outline"
          className="w-10 h-10 rounded-xl bg-black/40 backdrop-blur-md border-white/10 text-white/80 hover:text-white shadow-xl hover-elevate"
          onMouseDown={() => startZoom('in')}
          onMouseUp={stopZoom}
          onMouseLeave={stopZoom}
          onTouchStart={(e) => { e.preventDefault(); startZoom('in'); }}
          onTouchEnd={stopZoom}
          data-testid="button-zoom-in"
        >
          <Plus className="w-5 h-5" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="w-10 h-10 rounded-xl bg-black/40 backdrop-blur-md border-white/10 text-white/80 hover:text-white shadow-xl hover-elevate"
          onMouseDown={() => startZoom('out')}
          onMouseUp={stopZoom}
          onMouseLeave={stopZoom}
          onTouchStart={(e) => { e.preventDefault(); startZoom('out'); }}
          onTouchEnd={stopZoom}
          data-testid="button-zoom-out"
        >
          <Minus className="w-5 h-5" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="w-10 h-10 rounded-xl bg-black/40 backdrop-blur-md border-white/10 text-white/80 hover:text-white shadow-xl hover-elevate"
          onClick={() => handleZoom('reset')}
          data-testid="button-zoom-reset"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Detail Panel Overlay (Bottom Sheet on Mobile, Top Right on Desktop) */}
      <AnimatePresence>
        {selectedTrekId && selectedTrek && (
          <div className="fixed inset-0 z-40 pointer-events-none">
            <TrekDetailPanel 
              key={selectedTrekId}
              trek={selectedTrek} 
              onClose={clearSelectedTrek} 
            />
            
            {/* Cluster Navigation Carousel controls */}
            {clusterTreksList.length > 1 && (
              <div className="absolute bottom-32 md:bottom-auto md:top-1/2 md:right-[400px] left-1/2 -translate-x-1/2 md:translate-x-0 md:-translate-y-1/2 flex items-center gap-4 pointer-events-auto z-50">
                <Button
                  size="icon"
                  variant="outline"
                  className={`rounded-full bg-black/40 backdrop-blur-md border-white/10 text-white ${currentTrekIndex === 0 ? 'opacity-30' : 'hover-elevate'}`}
                  disabled={currentTrekIndex === 0}
                  onClick={prevTrek}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                
                <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-bold text-white/60 uppercase tracking-widest">
                  {currentTrekIndex + 1} / {clusterTreksList.length}
                </div>

                <Button
                  size="icon"
                  variant="outline"
                  className={`rounded-full bg-black/40 backdrop-blur-md border-white/10 text-white ${currentTrekIndex === clusterTreksList.length - 1 ? 'opacity-30' : 'hover-elevate'}`}
                  disabled={currentTrekIndex === clusterTreksList.length - 1}
                  onClick={nextTrek}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      {!selectedTrek && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center pointer-events-none opacity-40 hidden md:block">
          <p className="text-[10px] font-bold text-white font-mono tracking-[0.3em] uppercase">
            Rotate • Zoom • Explore
          </p>
        </div>
      )}
    </div>
  );
}
