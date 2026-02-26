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

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredTreks = useMemo(() => {
    const result = TREKS.filter(trek => {
      if (continent && continent !== "All" && trek.region !== continent) return false;
      if (tier && tier !== "All" && trek.tier !== parseInt(tier)) return false;
      return true;
    });
    console.log("Filtered Treks Count:", result.length);
    return result;
  }, [continent, tier]);

  const displayData = useMemo(() => {
    const clustered = typeof clusterTreks === 'function' ? clusterTreks(filteredTreks) : filteredTreks;
    console.log("Display Data (Markers/Clusters):", clustered);
    return clustered;
  }, [filteredTreks]);

  return (
    <div className="absolute inset-0 bg-[#0a0a1a] overflow-hidden">
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
        
        htmlElementsData={displayData}
        
        // ✅ CRITICAL FIX: The Globe needs to know where the numbers are
        htmlLat={(d: any) => d.latitude || d.lat || (d.geometry?.coordinates?.[1])}
        htmlLng={(d: any) => d.longitude || d.lng || (d.geometry?.coordinates?.[0])}
        
        htmlElement={(d: any) => {
          const el = document.createElement('div');
          
          const isCluster = d.properties?.cluster || d.points || d.treks;
          const pointCount = d.properties?.point_count || (d.points?.length) || (d.treks?.length);
          
          // Data Resolution
          const trekData = d.properties || d;
          const trekId = trekData.id || trekData.slug || d.id;
          const isSelected = selectedTrekId === trekId;
          
          el.style.pointerEvents = 'auto';
          el.style.cursor = 'pointer';
          el.className = 'globe-marker-node';
          
          if (isCluster) {
            el.innerHTML = `
              <div style="width: 32px; height: 32px; background: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                ${pointCount}
              </div>
            `;
          } else {
            const difficulty = trekData.difficulty || "Moderate";
            let color = "#3b82f6";
            if (difficulty === "Easy") color = "#22c55e";
            else if (difficulty === "Hard") color = "#f97316";
            else if (difficulty === "Extreme") color = "#ef4444";

            el.innerHTML = `
              <div style="position: relative; width: 16px; height: 16px;">
                <div style="position: absolute; inset: -4px; border-radius: 50%; background: ${color}; opacity: 0.4; animation: custom-ping 2s infinite;"></div>
                <div style="position: absolute; inset: 0; border-radius: 50%; background: ${color}; border: 2px solid white; box-shadow: 0 0 10px ${color}88;"></div>
              </div>
            `;
          }

          // Click Handling
          el.onclick = (e) => {
            e.stopPropagation();
            console.log("Marker clicked:", trekId);
            setSelectedTrekId(trekId);
            
            if (isCluster) {
              const clusterLeaves = d.points || d.treks || d.properties?.points || [];
              if (isEmbed) {
                window.parent.postMessage({
                  type: "TREK_SELECTED_FROM_GLOBE",
                  payload: clusterLeaves.map((t: any) => ({ id: t.id || t.properties?.id }))
                }, "*");
              } else {
                setSwipeableTreks(clusterLeaves);
              }
            } else {
              if (isEmbed) {
                window.parent.postMessage({
                  type: "TREK_SELECTED_FROM_GLOBE",
                  payload: [{ id: trekId }]
                }, "*");
              } else {
                setSwipeableTreks([d]);
              }
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
  