import { useEffect, useState, useRef, useMemo } from "react";
import Globe from "react-globe.gl";
import type { GlobeMethods } from "react-globe.gl";
import { TREKS } from "../data/treks";
import { useTrekStore } from "../store/useTrekStore";
import { useFilterStore } from "../store/useFilterStore";
import { SwipeableTrekCards } from './SwipeableTrekCards';
import { ZoomControls } from './ZoomControls';
import { clusterTreks } from "../lib/clustering";

export function GlobeViewer({ onZoom, hideCards }: { onZoom?: (direction: 'in' | 'out' | 'reset') => void; hideCards?: boolean }) {
  const isEmbed = useMemo(() => new URLSearchParams(window.location.search).get("embed") === "true", []);
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [altitude, setAltitude] = useState(2.5);
  const { selectedTrekId, setSelectedTrekId } = useTrekStore();
  const { continent, accommodation, length, tier } = useFilterStore();
  const [swipeableTreks, setSwipeableTreks] = useState<any[] | null>(null);
  const [initialTrekIndex, setInitialTrekIndex] = useState(0);

  // Handle Window Resize
  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter Logic
  const filteredTreks = useMemo(() => {
    return TREKS.filter(trek => {
      if (continent && continent !== "All" && trek.region !== continent) return false;
      if (tier && tier !== "All" && trek.tier !== parseInt(tier)) return false;
      return true;
    });
  }, [continent, tier]);

  // Cluster Logic
  const displayData = useMemo(() => {
    if (altitude < 1.0) return filteredTreks; // Show all treks when zoomed in
    return typeof clusterTreks === 'function' ? clusterTreks(filteredTreks, 100) : filteredTreks;
  }, [filteredTreks, altitude]);

  // Update altitude
  const updateAltitude = () => {
    if (!globeEl.current) return;
    const camera = globeEl.current.camera();
    const globeRadius = globeEl.current.getGlobeRadius();
    if (!camera || !globeRadius) return;
    const currentAltitude = camera.position.length() / globeRadius;
    setAltitude(currentAltitude);
  };

  useEffect(() => {
    const controls = globeEl.current?.controls();
    if (!controls) return;
    controls.addEventListener("change", updateAltitude);
    return () => controls.removeEventListener("change", updateAltitude);
  }, []);

  // Zoom Controls
  const handleZoomIn = () => {
    if (globeEl.current) {
      const currentAlt = globeEl.current.pointOfView().altitude;
      globeEl.current.pointOfView({ altitude: Math.max(0.1, currentAlt - 0.2) }, 500);
    }
  };

  const handleZoomOut = () => {
    if (globeEl.current) {
      const currentAlt = globeEl.current.pointOfView().altitude;
      globeEl.current.pointOfView({ altitude: Math.min(4, currentAlt + 0.2) }, 500);
    }
  };

  const handleReset = () => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
    }
  };

  // Globe configuration
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = false;
      globeEl.current.controls().enableDamping = true;
      
      if (isEmbed) {
        globeEl.current.controls().minPolarAngle = Math.PI / 4;
        globeEl.current.controls().maxPolarAngle = Math.PI * 3 / 4;
        globeEl.current.controls().minDistance = 150;
        globeEl.current.controls().maxDistance = 600;
      }

      globeEl.current.pointOfView({ altitude: 2.5 }, 0);
    }
  }, [isEmbed]);

  return (
    <div className="absolute inset-0 bg-[#0a0a1a] overflow-hidden">
      <Globe
        ref={globeEl as any}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        htmlElementsData={displayData}
        htmlLat="latitude"
        htmlLng="longitude"
        htmlElement={(d: any) => {
          const isCluster = d.isCluster;
          const trekId = isCluster ? null : String(d.id);
          const isSelected = trekId && String(trekId) === String(selectedTrekId);
          
          const el = document.createElement('div');
          el.className = `group relative cursor-pointer flex flex-col items-center justify-center pointer-events-auto ${isSelected ? 'pin-selected' : ''}`;
          
          // Cluster badge
          const clusterBadge = isCluster ? `
            <div class="absolute -top-1 -right-1 bg-white text-primary text-[8px] font-bold px-1 rounded-full border border-primary shadow-sm">
              +${d.treks.length - 1}
            </div>
          ` : '';

          el.innerHTML = `
            <div class="relative flex flex-col items-center transition-all duration-300 transform ${isSelected ? 'scale-125' : 'group-hover:scale-110'}">
              <!-- Pin Head -->
              <div class="w-6 h-6 rounded-full ${isCluster ? 'bg-white' : 'bg-primary'} border-2 ${isCluster ? 'border-primary' : 'border-white'} shadow-[0_0_10px_rgba(59,130,246,0.5)] flex items-center justify-center">
                 <div class="w-1.5 h-1.5 rounded-full ${isCluster ? 'bg-primary' : 'bg-white'} opacity-40"></div>
              </div>
              ${clusterBadge}
              <!-- Pin Stem -->
              <div class="w-1 h-2 ${isCluster ? 'bg-white' : 'bg-primary'} -mt-0.5 shadow-sm rounded-b-full"></div>
              <!-- Pin Shadow -->
              <div class="w-3 h-1 bg-black/20 rounded-full blur-[1px] mt-0.5"></div>
              
              <!-- Label -->
              <div class="trek-label opacity-0 group-hover:opacity-100 transition-opacity absolute top-8 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                ${isCluster ? `${d.treks[0].name} & More` : d.name}
              </div>
            </div>
          `;

          el.onpointerdown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (isCluster) {
              const clusterLeaves = d.treks || [];
              
              if (isEmbed) {
                console.log('📤 Sending cluster to parent:', clusterLeaves.length, 'treks');
                // Send full array to parent
                window.parent.postMessage(
                  {
                    type: "TREK_SELECTED_FROM_GLOBE",
                    payload: clusterLeaves.map((trek: any) => ({
                      id: trek.id,
                      slug: trek.slug || trek.id,
                      name: trek.name
                    }))
                  },
                  "*"
                );
                return;
              }
              
              // Standalone mode: show swipeable cards
              setSwipeableTreks(clusterLeaves);
              setInitialTrekIndex(0);
            } else {
              // Single trek clicked
              if (isEmbed) {
                console.log('📤 Sending single trek to parent:', d.id);
                // Wrap single trek in array for consistency
                window.parent.postMessage(
                  {
                    type: "TREK_SELECTED_FROM_GLOBE",
                    payload: [{
                      id: d.id,
                      slug: d.slug || d.id,
                      name: d.name
                    }]
                  },
                  "*"
                );
                return;
              }
              
              // Standalone mode: show single card
              setSwipeableTreks([d]);
              setInitialTrekIndex(0);
            }
          };

          return el;
        }}
        
        onGlobeClick={() => {
          setSelectedTrekId(null);
          
          if (isEmbed) {
            window.parent.postMessage({ type: "TREK_DESELECTED_FROM_GLOBE" }, "*");
          }
        }}
        
        atmosphereColor="#3a228a"
        atmosphereAltitude={0.15}
      />

      {/* Zoom Controls */}
      {!isEmbed && (
        <ZoomControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
        />
      )}

      {/* Swipeable trek cards */}
      {swipeableTreks && !hideCards && (
        <SwipeableTrekCards
          treks={swipeableTreks}
          initialIndex={initialTrekIndex}
          onClose={() => setSwipeableTreks(null)}
        />
      )}
    </div>
  );
}
