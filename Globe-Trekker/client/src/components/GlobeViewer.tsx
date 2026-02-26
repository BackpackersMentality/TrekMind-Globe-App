import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Globe from "react-globe.gl";
import type { GlobeMethods } from "react-globe.gl";
import { TREKS } from "../data/treks";
import { useTrekStore } from "../store/useTrekStore";
import { useFilterStore } from "../store/useFilterStore";
import { SwipeableTrekCards } from "./SwipeableTrekCards";
import { clusterTreks } from "../lib/clustering";

export function GlobeViewer({ hideCards }: { hideCards?: boolean }) {
  const isEmbed = useMemo(
    () => new URLSearchParams(window.location.search).get("embed") === "true",
    []
  );

  const globeEl = useRef<GlobeMethods | undefined>(undefined);

  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const { selectedTrekId, setSelectedTrekId } = useTrekStore();
  const { continent, tier } = useFilterStore();

  const [swipeableTreks, setSwipeableTreks] = useState<any[] | null>(null);
  const setSwipeableRef = useRef(setSwipeableTreks);
  useEffect(() => { setSwipeableRef.current = setSwipeableTreks; }, []);

  useEffect(() => {
    const handleResize = () =>
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ FIX: Store uses "ALL" (uppercase). Old code checked !== "All" (mixed case).
  // "ALL" !== "All" is always true, so BOTH filters fired on every trek,
  // returning false for everything → filteredTreks was always [] → no markers.
  const filteredTreks = useMemo(() => {
    return TREKS.filter((trek: any) => {
      if (continent && continent !== "ALL" && trek.region !== continent)
        return false;
      if (tier && tier !== "ALL" && trek.tier !== parseInt(tier))
        return false;
      return true;
    });
  }, [continent, tier]);

  const clusteredData = useMemo(() => {
    return clusterTreks(filteredTreks, 250);
  }, [filteredTreks]);

  const displayData = useMemo(() => {
    return clusteredData
      .map((item: any) => ({
        ...item,
        lat: item.lat ?? item.latitude,
        lng: item.lng ?? item.longitude,
      }))
      .filter((item: any) =>
        typeof item.lat === "number" &&
        typeof item.lng === "number" &&
        !isNaN(item.lat) &&
        !isNaN(item.lng)
      );
  }, [clusteredData]);

  const htmlElementCallback = useCallback(
    (d: any) => {
      const isCluster = d.isCluster;
      const trekId = d.id;
      const size = isCluster ? 36 : 20;

      const el = document.createElement("div");
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.marginLeft = `-${size / 2}px`;
      el.style.marginTop = `-${size / 2}px`;
      el.style.pointerEvents = "auto";
      el.style.cursor = "pointer";

      if (isCluster) {
        el.innerHTML = `
          <div style="
            width:${size}px; height:${size}px;
            background:#f59e0b; border-radius:50%;
            display:flex; align-items:center; justify-content:center;
            color:white; font-size:13px; font-weight:bold;
            border:2px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.5);
          ">${d.treks?.length ?? "?"}</div>
        `;
      } else {
        el.innerHTML = `
          <div style="
            width:${size}px; height:${size}px;
            border-radius:50%; background:#3b82f6;
            border:2px solid white; box-shadow:0 0 10px rgba(59,130,246,0.8);
          "></div>
        `;
      }

      el.onclick = (e) => {
        e.stopPropagation();
        setSelectedTrekId(trekId);

        if (isCluster) {
          if (isEmbed) {
            window.parent.postMessage(
              { type: "TREK_SELECTED_FROM_GLOBE", payload: d.treks.map((t: any) => ({ id: t.id })) },
              "*"
            );
          } else {
            setSwipeableRef.current(d.treks);
          }
        } else {
          if (isEmbed) {
            window.parent.postMessage(
              { type: "TREK_SELECTED_FROM_GLOBE", payload: [{ id: trekId }] },
              "*"
            );
          } else {
            setSwipeableRef.current([d]);
          }
        }
      };

      return el;
    },
    [isEmbed, setSelectedTrekId]
  );

  return (
    <div className="absolute inset-0 bg-[#0a0a1a]" style={{ overflow: "visible" }}>
      <Globe
        ref={globeEl as any}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        htmlElementsData={displayData}
        htmlLat={(d: any) => d.lat}
        htmlLng={(d: any) => d.lng}
        htmlAltitude={0.01}
        htmlElement={htmlElementCallback}
        onGlobeClick={() => {
          setSelectedTrekId(null);
          setSwipeableTreks(null);
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
          initialIndex={0}
          onClose={() => setSwipeableTreks(null)}
        />
      )}
    </div>
  );
}