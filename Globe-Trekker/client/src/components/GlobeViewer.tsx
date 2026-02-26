import { useEffect, useState, useRef, useMemo } from "react";
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

  useEffect(() => {
    const handleResize = () =>
      setDimensions({ width: window.innerWidth, height: window.innerHeight });

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ FILTER
  const filteredTreks = useMemo(() => {
    return TREKS.filter((trek) => {
      if (continent && continent !== "All" && trek.region !== continent)
        return false;
      if (tier && tier !== "All" && trek.tier !== parseInt(tier))
        return false;
      return true;
    });
  }, [continent, tier]);

  // ✅ CLUSTER
  const clusteredData = useMemo(() => {
    return clusterTreks(filteredTreks, 250); // 250km threshold
  }, [filteredTreks]);

  // ✅ NORMALIZE COORDINATES
  // FIX: Handle both `lat`/`lng` and `latitude`/`longitude` field names
  // and filter out any items with invalid coordinates so the Globe
  // doesn't silently drop markers.
  const displayData = useMemo(() => {
    return clusteredData
      .map((item: any) => {
        const lat = item.lat ?? item.latitude;
        const lng = item.lng ?? item.longitude;
        return {
          ...item,
          lat,
          lng,
        };
      })
      .filter((item: any) => {
        const valid =
          typeof item.lat === "number" &&
          typeof item.lng === "number" &&
          !isNaN(item.lat) &&
          !isNaN(item.lng);
        if (!valid) {
          console.warn("[GlobeViewer] Dropping marker with invalid coords:", item);
        }
        return valid;
      });
  }, [clusteredData]);

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
        htmlLat={(d: any) => d.lat}
        htmlLng={(d: any) => d.lng}
        htmlElement={(d: any) => {
          const el = document.createElement("div");
          el.style.pointerEvents = "auto";
          el.style.cursor = "pointer";

          const isCluster = d.isCluster;
          const trekId = d.id;

          if (isCluster) {
            el.innerHTML = `
              <div style="
                width: 32px;
                height: 32px;
                background: #f59e0b;
                border-radius: 50%;
                display:flex;
                align-items:center;
                justify-content:center;
                color:white;
                font-weight:bold;
                border:2px solid white;
                box-shadow:0 4px 10px rgba(0,0,0,0.5);
              ">
                ${d.treks?.length ?? "?"}
              </div>
            `;
          } else {
            el.innerHTML = `
              <div style="
                width:16px;
                height:16px;
                border-radius:50%;
                background:#3b82f6;
                border:2px solid white;
                box-shadow:0 0 10px rgba(59,130,246,0.8);
              "></div>
            `;
          }

          el.onclick = (e) => {
            e.stopPropagation();
            setSelectedTrekId(trekId);

            if (isCluster) {
              if (isEmbed) {
                window.parent.postMessage(
                  {
                    type: "TREK_SELECTED_FROM_GLOBE",
                    payload: d.treks.map((t: any) => ({ id: t.id })),
                  },
                  "*"
                );
              } else {
                setSwipeableTreks(d.treks);
              }
            } else {
              if (isEmbed) {
                window.parent.postMessage(
                  {
                    type: "TREK_SELECTED_FROM_GLOBE",
                    payload: [{ id: trekId }],
                  },
                  "*"
                );
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
            window.parent.postMessage(
              { type: "TREK_DESELECTED_FROM_GLOBE" },
              "*"
            );
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