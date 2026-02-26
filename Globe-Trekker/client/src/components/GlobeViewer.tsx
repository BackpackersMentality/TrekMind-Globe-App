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
          const isSelected = selectedTrekId === (d.id || d.properties?.id);
          
          el.className = 'cursor-pointer hover:scale-110 transition-transform';
          el.style.pointerEvents = 'auto'; // Ensures clicks register on the marker
          
          if (isCluster) {
            el.
