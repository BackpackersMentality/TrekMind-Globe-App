import { useEffect, useState, useRef, useMemo } from "react";
import Globe from "react-globe.gl";
import type { GlobeMethods } from "react-globe.gl";
import { TREKS } from "../data/treks";
import { useTrekStore } from "../store/useTrekStore";
import { useFilterStore } from "../store/useFilterStore";
import { SwipeableTrekCards } from './SwipeableTrekCards';
import { ZoomControls } from './ZoomControls';
import { clusterTreks } from "../lib/clustering";

export function GlobeViewer({ onZoom, hideCards }: { onZoom?: (direction: 'in' | 'out' | 'reset') => void, hideCards?: boolean }) {
  const isEmbed = useMemo(() => new URLSearchParams(window.location.search).get("embed") === "true", []);
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [altitude, setAltitude] = useState(2.5);
  const { selectedTrekId, setSelectedTrekId } = useTrekStore();
  const { continent, accommodation, length, tier } = useFilterStore();
  const [swipeableTreks, setSwipeableTreks] = useState<any[] | null>(null);
  const [initialTrekIndex, setInitialTrekIndex] = useState(0);

  // Expose zoom controls via ref if needed, but for now we can handle via prop or just effect
  useEffect(() => {
    if (!onZoom || !globeEl.current) return;
    
    // We actually need a way to trigger this from outside. 
    // Using a prop for commands is one way, but it might be better to just handle it here if we had a trigger
  }, [onZoom]);

  // Handle imperative zoom commands from window events for simplicity in Fast mode
  useEffect(() => {
    const handleZoomCommand = (e: any) => {
      if (!globeEl.current) return;
      const currentPov = globeEl.current.pointOfView();
      const zoomStep = 0.2;
      
      if (e.detail === 'in') {
        globeEl.current.pointOfView({ altitude: Math.max(0.1, currentPov.altitude - zoomStep) }, 400);
      } else if (e.detail === 'out') {
        globeEl.current.pointOfView({ altitude: Math.min(4.0, currentPov.altitude + zoomStep) }, 400);
      } else if (e.detail === 'reset') {
        globeEl.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 800);
      }
    };

    window.addEventListener('globe-zoom', handleZoomCommand);
    return () => window.removeEventListener('globe-zoom', handleZoomCommand);
  }, []);

  // Zoom handler functions for the controls
  const handleZoomIn = () => {
    if (!globeEl.current) return;
    const currentPov = globeEl.current.pointOfView();
    const zoomStep = 0.2;
    globeEl.current.pointOfView({ altitude: Math.max(0.1, currentPov.altitude - zoomStep) }, 400);
  };

  const handleZoomOut = () => {
    if (!globeEl.current) return;
    const currentPov = globeEl.current.pointOfView();
    const zoomStep = 0.2;
    globeEl.current.pointOfView({ altitude: Math.min(4.0, currentPov.altitude + zoomStep) }, 400);
  };

  const handleReset = () => {
    if (!globeEl.current) return;
    globeEl.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 800);
  };

  // ============================================
  // LISTEN FOR FILTER UPDATES FROM PARENT APP
  // ============================================
  useEffect(() => {
    // Only listen if running in iframe (embed mode)
    if (!isEmbed) return;

    const handleMessage = (event: MessageEvent) => {
      // Security: In production, verify event.origin matches your main app domain
      // if (event.origin !== 'https://trekmind.com') return;
      
      if (!event.data?.type) return;

      if (event.data.type === "TREKMIND_FILTER_UPDATE") {
        const filters = event.data.payload;
        
        console.log('🌍 Globe received filters:', filters);
        
        // Update the filter store with values from parent
        const filterStore = useFilterStore.getState();
        
        if (filters.tier !== undefined) {
          filterStore.setTier(filters.tier);
        }
        if (filters.region !== undefined) {
          filterStore.setRegion(filters.region);
        }
        if (filters.accommodation !== undefined) {
          filterStore.setAccommodation(filters.accommodation);
        }
        if (filters.duration !== undefined) {
          filterStore.setDuration(filters.duration);
        }
        if (filters.difficulty !== undefined) {
          filterStore.setDifficulty(filters.difficulty);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [isEmbed]);
  
  const filteredTreks = useMemo(() => {
    return TREKS.filter(trek => {
      const matchContinent = continent === "ALL" || trek.continent === continent;
      const matchAccommodation = accommodation === "ALL" || trek.accommodation === accommodation;
      const matchTier = String(trek.tier) === String(tier) || tier === "ALL";
      
      let matchLength = true;
      if (length !== "ALL") {
        if (length === "Short") matchLength = trek.lengthDays >= 1 && trek.lengthDays <= 4;
        else if (length === "Medium") matchLength = trek.lengthDays >= 5 && trek.lengthDays <= 9;
        else if (length === "Long") matchLength = trek.lengthDays >= 10;
      }

      return matchContinent && matchAccommodation && matchLength && matchTier;
    });
  }, [continent, accommodation, length, tier]);

  const clusteredData = useMemo(() => {
    // Breakdown clusters if zoomed in close (altitude < 1.0)
    if (altitude < 1.0) return filteredTreks;
    return clusterTreks(filteredTreks, 100);
  }, [filteredTreks, altitude]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const updateAltitude = () => {
    if (!globeEl.current) return;

    const camera = globeEl.current.camera();
    const globeRadius = globeEl.current.getGlobeRadius();

    if (!camera || !globeRadius) return;

    const currentAltitude = camera.position.length() / globeRadius;
    setAltitude(currentAltitude);

    document.documentElement.style.setProperty(
      "--globe-altitude",
      currentAltitude.toFixed(2)
    );
  };

  // Globe configuration
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = false;
      globeEl.current.controls().enableDamping = true;
      
      if (isEmbed) {
        // Lock rotation bounds for embed mode
        globeEl.current.controls().minPolarAngle = Math.PI / 4;
        globeEl.current.controls().maxPolarAngle = Math.PI * 3 / 4;
        globeEl.current.controls().minDistance = 150;
        globeEl.current.controls().maxDistance = 600;
      }

      // Initial view
      globeEl.current.pointOfView({ altitude: 2.5 }, 0);
    }
  }, [isEmbed]);

  useEffect(() => {
    const controls = globeEl.current?.controls();
    if (!controls) return;

    controls.addEventListener("change", updateAltitude);
    return () => controls.removeEventListener("change", updateAltitude);
  }, []);

  // Focus on selected trek
  useEffect(() => {
    if (selectedTrekId && globeEl.current) {
      const trek = TREKS.find((t) => String(t.id) === String(selectedTrekId));
      if (trek) {
        globeEl.current.pointOfView({
          lat: trek.latitude,
          lng: trek.longitude,
          altitude: 1.6
        }, 1200);
      }
    }
  }, [selectedTrekId]);

  return (
    <div className="w-full h-full relative globe-container">
      {/* Fallback for environments without WebGL */}
      <div className="absolute inset-0 bg-slate-900 flex items-center justify-center -z-10">
        <p className="text-white/20 text-sm">3D Globe Environment</p>
      </div>
      <Globe
        ref={globeEl}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // Pin Markers using HTML Elements for custom styling
        htmlElementsData={clusteredData}
        htmlLat="latitude"
        htmlLng="longitude"
        htmlElement={(d: any) => {
          const isCluster = d.isCluster;
          const trekId = isCluster ? null : String(d.id);
          const isSelected = trekId && String(trekId) === String(selectedTrekId);
          
          const el = document.createElement('div');
          el.className = `group relative cursor-pointer flex flex-col items-center justify-center pointer-events-auto ${isSelected ? 'pin-selected' : ''}`;
          
          // Add a smaller inner hitbox to avoid accidental clicks
          const hitbox = document.createElement('div');
          hitbox.className = "absolute inset-0 w-4 h-4 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2";
          el.appendChild(hitbox);

          // Use a dynamic class for visibility thresholds based on iconicTier and altitude
          const updateVisibility = () => {
            if (isSelected || isCluster) {
              el.classList.add('label-visible');
              return;
            }

            const currentAltitude = parseFloat(document.documentElement.style.getPropertyValue('--globe-altitude') || '2.5');
            const tier = d.iconicTier;
            
            let visible = false;
            if (currentAltitude <= 1.2) {
              visible = true;
            } else if (currentAltitude <= 1.6 && tier <= 2) {
              visible = true;
            } else if (currentAltitude <= 2.5 && tier === 1) {
              visible = true;
            }

            if (visible) {
              el.classList.add('label-visible');
            } else {
              el.classList.remove('label-visible');
            }
          };

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
              <div class="trek-label">
                ${isCluster ? `${d.treks[0].name} & More` : d.name}
              </div>
            </div>
          `;

         el.onpointerdown = (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  if (isCluster) {
    // In embed mode, send first trek of cluster to parent
    if (isEmbed) {
      window.parent.postMessage(
        {
          type: "TREK_SELECTED_FROM_GLOBE",
          payload: { 
            id: d.treks[0].id,
            slug: d.treks[0].slug || d.treks[0].id,
            name: d.treks[0].name 
          }
        },
        "*"
      );
      return; // ✅ CRITICAL: Exit early, don't show cards in embed mode
    }
    
    // Only in standalone mode: show cluster cards
    setSwipeableTreks(d.treks);
    setInitialTrekIndex(0);
  } else {
    // Single trek clicked
    if (isEmbed) {
      // In embed mode: send message to parent and EXIT
      window.parent.postMessage(
        {
          type: "TREK_SELECTED_FROM_GLOBE",
          payload: { 
            id: d.id,
            slug: d.slug || d.id,
            name: d.name 
          }
        },
        "https://6e90758d.trekmind-globe-app.pages.dev/"
      );
      return; // ✅ CRITICAL: Exit early, don't show cards in embed mode
    }
    
    // Only in standalone mode: show single trek card
    setSwipeableTreks([d]);
    setInitialTrekIndex(0);
  }
};
          // Sync visibility on mount and anytime altitude changes
          updateVisibility();
          const controls = globeEl.current?.controls();
          controls?.addEventListener('change', updateVisibility);

          return el;
        }}
        
        onGlobeClick={() => {
          setSelectedTrekId(null);
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
