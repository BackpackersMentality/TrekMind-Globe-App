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
  const { selectedTrekId, setSelectedTrekId } = useTrekStore();
  const { continent, tier } = useFilterStore();
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
    return typeof clusterTreks === 'function' ? clusterTreks(filteredTreks) : filteredTreks;
  }, [filteredTreks]);

  // Zoom Controls
  const handleZoomIn = () => {
    if (globeEl.current) {
      const currentAlt = globeEl.current.pointOfView().altitude;
      globeEl.current.pointOfView({ altitude: Math.max(0.1, currentAlt - 0.5) }, 500);
    }
  };

  const handleZoomOut = () => {
    if (globeEl.current) {
      const currentAlt = globeEl.current.pointOfView().altitude;
      globeEl.current.pointOfView({ altitude: Math.min(4, currentAlt + 0.5) }, 500);
    }
  };

  const handleReset = () => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
    }
  };

  return (
    <div className="absolute inset-0 bg-[#0a0a1a] overflow-hidden">
      {/* Inject Keyframes for the glowing ping effect */}
      <style>{`
        @keyframes custom-ping {
          0% { transform: scale(1); opacity: 0.8; }
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>

      <Globe
        ref={globeEl as any}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // 1. DATA SOURCE
        htmlElementsData={displayData}
        
        // 2. CRITICAL FIX: EXPLICITLY FIND COORDINATES
        htmlLat={(d: any) => {
          if (d.latitude !== undefined) return d.latitude;
          if (d.geometry?.coordinates) return d.geometry.coordinates[1];
          if (d.properties?.latitude) return d.properties.latitude;
          return d.lat || 0;
        }}
        htmlLng={(d: any) => {
          if (d.longitude !== undefined) return d.longitude;
          if (d.geometry?.coordinates) return d.geometry.coordinates[0];
          if (d.properties?.longitude) return d.properties.longitude;
          return d.lng || 0;
        }}
        
        // 3. DRAW THE MARKERS
        htmlElement={(d: any) => {
          const el = document.createElement('div');
          
          const isCluster = d.properties?.cluster || d.points || d.treks;
          const pointCount = d.properties?.point_count || (d.points ? d.points.length : null) || (d.treks ? d.treks.length : null);
          
          // Safely extract the exact trek data whether it's raw or inside a GeoJSON property
          const rawTrek = d.properties?.trek || d.properties || d;
          const trekId = rawTrek.id || rawTrek.slug;
          const isSelected = selectedTrekId === trekId;
          
          el.style.pointerEvents = 'auto';
          el.style.cursor = 'pointer';
          el.style.transform = isSelected ? 'scale(1.4)' : 'scale(1)';
          el.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
          
          if (isCluster) {
            // CLUSTER
            el.innerHTML = `
              <div style="width: 32px; height: 32px; background-color: rgba(245, 158, 11, 0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                ${pointCount}
              </div>
            `;
          } else {
            // SINGLE TREK (With glowing aura)
            const difficulty = rawTrek.difficulty || "Moderate";
            let color = "#3b82f6";
            if (difficulty === "Easy") color = "#22c55e";
            else if (difficulty === "Hard") color = "#f97316";
            else if (difficulty === "Extreme") color = "#ef4444";

            el.innerHTML = `
              <div style="position: relative; width: 16px; height: 16px;">
                <div style="position: absolute; inset: -4px; border-radius: 50%; background-color: ${color}; opacity: ${isSelected ? '0.7' : '0.4'}; animation: custom-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: absolute; inset: 0; border-radius: 50%; background-color: ${color}; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
              </div>
            `;
            el.title = rawTrek.name || 'Trek';
          }

          // Stop drag logic from stealing clicks
          el.onpointerdown = (e) => e.stopPropagation(); 
          
          // 4. CLICK LOGIC (Always sending an Array format to Main App)
          el.onclick = (e) => {
            e.stopPropagation();
            setSelectedTrekId(trekId);
            
            if (isCluster) {
              const clusterLeaves = d.points || d.treks || d.properties?.points || [];
              if (isEmbed) {
                window.parent.postMessage({
                  type: "TREK_SELECTED_FROM_GLOBE",
                  payload: clusterLeaves.map((t: any) => {
                    const leafTrek = t.properties?.trek || t.properties || t;
                    return { id: leafTrek.id || leafTrek.slug };
                  })
                }, "*");
                return; 
              }
              setSwipeableTreks(clusterLeaves);
              setInitialTrekIndex(0);
            } else {
              if (isEmbed) {
                window.parent.postMessage({
                  type: "TREK_SELECTED_FROM_GLOBE",
                  payload: [{ id: trekId }] // ✅ Wrapping single ID in Array for Swiping Panel
                }, "*");
                return;
              }
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

      {/* Swipeable trek cards for standalone globe app */}
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