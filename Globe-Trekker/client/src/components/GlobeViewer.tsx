import React, { useEffect, useState, useRef, useMemo } from "react";
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
      <Globe
        ref={globeEl as any}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        htmlElementsData={displayData}
        htmlElement={(d: any) => {
          const el = document.createElement('div');
          const isCluster = d.properties?.cluster || d.points || d.treks;
          const pointCount = d.properties?.point_count || (d.points ? d.points.length : null) || (d.treks ? d.treks.length : null);
          
          // Marker Base Styling
          el.className = 'cursor-pointer hover:scale-110 transition-transform shadow-lg';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.color = 'white';
          el.style.fontWeight = 'bold';
          el.style.borderRadius = '50%';
          el.style.border = '2px solid rgba(255,255,255,0.8)';
          el.style.pointerEvents = 'auto'; // Ensures clicks register
          
          if (isCluster) {
            el.style.width = '32px';
            el.style.height = '32px';
            el.style.backgroundColor = 'rgba(245, 158, 11, 0.9)'; // Amber for clusters
            el.style.fontSize = '12px';
            el.innerText = pointCount ? pointCount.toString() : '+';
          } else {
            el.style.width = '18px';
            el.style.height = '18px';
            el.style.backgroundColor = 'rgba(59, 130, 246, 0.9)'; // Blue for single treks
            el.title = d.name || 'Trek';
          }

          // ✅ PREVENT GLOBE DRAG WHEN CLICKING PIN
          el.onpointerdown = (e) => e.stopPropagation(); 
          
          // ✅ THE CLICK HANDLER
          el.onclick = (e) => {
            e.stopPropagation(); // Stop click from bleeding through to the ocean
            
            if (isCluster) {
              const clusterLeaves = d.points || d.treks || d.properties?.points || [];
              
              if (isEmbed) {
                // Send an ARRAY of IDs to the Main App
                window.parent.postMessage({
                  type: "TREK_SELECTED_FROM_GLOBE",
                  payload: clusterLeaves.map((trek: any) => ({ 
                    id: trek.id || trek.properties?.id 
                  }))
                }, "*");
                return; 
              }
              
              setSwipeableTreks(clusterLeaves);
              setInitialTrekIndex(0);
              
            } else {
              if (isEmbed) {
                // Wrap single IDs in an ARRAY to standardize the contract
                window.parent.postMessage({
                  type: "TREK_SELECTED_FROM_GLOBE",
                  payload: [{ id: d.id || d.properties?.id }] 
                }, "*");
                return;
              }
              
              setSwipeableTreks([d]);
              setInitialTrekIndex(0);
            }
          };

          return el;
        }}
        
        // ✅ CLICKING THE OCEAN CLOSES THE CARD
        onGlobeClick={() => {
          setSelectedTrekId(null);
          if (isEmbed) {
            window.parent.postMessage({ type: "TREK_DESELECTED_FROM_GLOBE" }, "*");
          }
        }}
        
        atmosphereColor="#3a228a"
        atmosphereAltitude={0.15}
      />

      {!isEmbed && (
        <ZoomControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
        />
      )}

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
