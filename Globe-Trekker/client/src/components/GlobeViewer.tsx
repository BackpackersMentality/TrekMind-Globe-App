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

  // Read filters from the store (used when NOT embedded)
  const { continent, tier, setContinent, setTier } = useFilterStore();

  // When embedded in the main app, override store values with postMessage data
  // so both apps stay in sync without sharing state directly.
  const [embedFilters, setEmbedFilters] = useState<{
    continent: string;
    tier: string;
    region: string;
    accommodation: string;
    duration: string;
    difficulty: string;
  } | null>(null);

  const [swipeableTreks, setSwipeableTreks] = useState<any[] | null>(null);
  const setSwipeableRef = useRef(setSwipeableTreks);
  useEffect(() => { setSwipeableRef.current = setSwipeableTreks; }, []);

  // ── FIX: Listen for filter + zoom postMessages from the parent app ────────────
  // Previously GlobeViewer had NO message listener, so filter updates sent by
  // GlobeIntegration via postMessage were completely ignored by the iframe.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};

      if (type === "TREKMIND_FILTER_UPDATE" && payload) {
        // Normalise the tier value — the main app sends "Tier 1" / "Tier 2" / "ALL"
        // but we need a plain number or "ALL" for filtering trek.tier (which is 1/2/3).
        const rawTier = payload.tier ?? "ALL";
        const normalisedTier =
          rawTier === "ALL" ? "ALL"
          : String(rawTier).match(/\d+/)
            ? String(rawTier).match(/\d+/)![0]   // "Tier 1" → "1", "1" → "1"
            : "ALL";

        // Region in the main app maps to continent in the globe app
        const normalisedContinent = payload.region ?? payload.continent ?? "ALL";

        setEmbedFilters({
          continent: normalisedContinent,
          tier: normalisedTier,
          region: normalisedContinent,
          accommodation: payload.accommodation ?? "ALL",
          duration: payload.duration ?? "ALL",
          difficulty: payload.difficulty ?? "ALL",
        });
      }

      if (type === "TREKMIND_ZOOM_IN") {
        const camera = (globeEl.current as any)?.camera?.();
        if (camera) camera.position.multiplyScalar(0.85);
      }

      if (type === "TREKMIND_ZOOM_OUT") {
        const camera = (globeEl.current as any)?.camera?.();
        if (camera) camera.position.multiplyScalar(1.15);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const handleResize = () =>
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Resolve which filter values to actually use ───────────────────────────────
  // When embedded: use the values received via postMessage (embedFilters).
  // When standalone: use the local filterStore values.
  const activeContinent = isEmbed
    ? (embedFilters?.continent ?? "ALL")
    : (continent ?? "ALL");

  const activeTier = isEmbed
    ? (embedFilters?.tier ?? "ALL")
    : (tier ?? "ALL");

  // ── FIX: Tier comparison now handles both "1" and "Tier 1" formats ───────────
  // Old code: trek.tier !== parseInt(tier)
  //   parseInt("Tier 1") = NaN → trek.tier !== NaN is always true → everything filtered out
  //   parseInt("ALL") = NaN → same problem
  // New code: extract the digit from any format, compare numerically
  const filteredTreks = useMemo(() => {
    return TREKS.filter((trek: any) => {
      // Continent / region filter
      if (activeContinent && activeContinent !== "ALL" && trek.region !== activeContinent)
        return false;

      // Tier filter — safely parse "1", "Tier 1", "Tier 2" etc.
      if (activeTier && activeTier !== "ALL") {
        const tierNum = parseInt(String(activeTier).replace(/\D/g, ""), 10);
        if (!isNaN(tierNum) && trek.tier !== tierNum) return false;
      }

      return true;
    });
  }, [activeContinent, activeTier]);

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
      const trekName = d.name || "";

      const dotSize = isCluster ? 36 : 18;
      const hitSize = isCluster ? 56 : 52;
      const hitOffset = hitSize / 2;

      const el = document.createElement("div");
      el.style.cssText = `
        width:${hitSize}px; height:${hitSize}px;
        margin-left:-${hitOffset}px; margin-top:-${hitOffset}px;
        pointer-events:auto; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        position:relative;
      `;

      if (isCluster) {
        el.innerHTML = `
          <div style="
            width:${dotSize}px; height:${dotSize}px;
            background:#f59e0b; border-radius:50%;
            display:flex; align-items:center; justify-content:center;
            color:white; font-size:13px; font-weight:bold;
            border:2px solid white; box-shadow:0 4px 12px rgba(0,0,0,0.6);
            transition:transform 0.15s;
          ">${d.treks?.length ?? "?"}</div>
        `;
      } else {
        const shortName = trekName.length > 18
          ? trekName.slice(0, 16).trimEnd() + "…"
          : trekName;

        el.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; gap:3px; pointer-events:none;">
            <div style="
              background:rgba(0,0,0,0.65); backdrop-filter:blur(4px);
              color:white; font-size:10px; font-weight:600; line-height:1.2;
              padding:2px 6px; border-radius:4px; white-space:nowrap;
              max-width:120px; overflow:hidden; text-overflow:ellipsis;
              letter-spacing:0.01em; box-shadow:0 1px 4px rgba(0,0,0,0.5);
              pointer-events:none;
            ">${shortName}</div>
            <div style="
              width:${dotSize}px; height:${dotSize}px;
              border-radius:50%; background:#3b82f6;
              border:2px solid white; box-shadow:0 0 10px rgba(59,130,246,0.9);
              transition:transform 0.15s, box-shadow 0.15s;
            "></div>
          </div>
        `;
      }

      const dot = el.querySelector("div > div:last-child") as HTMLElement | null;
      el.onmouseenter = () => {
        if (dot) { dot.style.transform = "scale(1.5)"; dot.style.boxShadow = "0 0 18px rgba(59,130,246,1)"; }
      };
      el.onmouseleave = () => {
        if (dot) { dot.style.transform = "scale(1)"; dot.style.boxShadow = "0 0 10px rgba(59,130,246,0.9)"; }
      };

      // pointerdown fires immediately on press — fixes the "flashing card" issue
      // where onclick required a full press-and-release cycle before registering
      el.onpointerdown = (e) => {
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
