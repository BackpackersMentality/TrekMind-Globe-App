import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Globe from "react-globe.gl";
import type { GlobeMethods } from "react-globe.gl";
import { TREKS } from "../data/treks";
import { useTrekStore } from "../store/useTrekStore";
import { useFilterStore } from "../store/useFilterStore";
import { SwipeableTrekCards } from "./SwipeableTrekCards";
import { clusterTreks } from "../lib/clustering";

function getAccommodationCategory(raw: string = ""): string {
  const a = raw.toLowerCase();
  if (a.includes("teahouse")) return "Teahouses";
  if (a.includes("rifugio") || a.includes("refuge") || a.includes("hut") ||
      a.includes("albergue") || a.includes("gite") || a.includes("ryokan") ||
      a.includes("minshuku") || a.includes("monastery") || a.includes("cave")) return "Huts/Refuges";
  if (a.includes("guesthouse") || a.includes("homestay") || a.includes("hotel") ||
      a.includes("b&b") || a.includes("pension") || a.includes("lodge")) return "Guesthouses";
  if (a.includes("camp") || a.includes("wilderness") || a.includes("backcountry")) return "Camping";
  return "Guesthouses";
}

function getTerrainCategory(raw: string = ""): string {
  const t = raw.toLowerCase();
  if (t.includes("volcanic")) return "Volcanic";
  if (t.includes("coastal") || t.includes("coast")) return "Coastal";
  if (t.includes("jungle") || t.includes("rainforest") || t.includes("cloud forest") || t.includes("tropical")) return "Jungle/Forest";
  if (t.includes("desert") || t.includes("canyon") || t.includes("wadi") || t.includes("sandstone")) return "Desert";
  if (t.includes("arctic") || t.includes("tundra") || t.includes("glacial") || t.includes("glaciated")) return "Glacial/Arctic";
  if (t.includes("high alpine") || t.includes("high sierra") || t.includes("andean") || t.includes("high plateau") || t.includes("high desert")) return "High Alpine";
  if (t.includes("alpine")) return "Alpine";
  return "Alpine";
}

function getDurationBucket(totalDays: string | number | undefined): string {
  const m = String(totalDays ?? "").match(/\d+/);
  if (!m) return "Medium";
  const d = parseInt(m[0], 10);
  if (d <= 5) return "Short";
  if (d <= 10) return "Medium";
  if (d <= 16) return "Long";
  return "Epic";
}

function getPopularityBucket(score: number | undefined): string {
  if (!score) return "Hidden Gem";
  if (score >= 8) return "Iconic";
  if (score >= 5) return "Popular";
  return "Hidden Gem";
}

export function GlobeViewer({ hideCards }: { hideCards?: boolean }) {
  const isEmbed = useMemo(
    () => new URLSearchParams(window.location.search).get("embed") === "true",
    []
  );

  const globeEl      = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Dimensions: measure the wrapper div, pass exact px to Globe ──────────
  // We must pass explicit width+height to Globe so its internal Three.js camera
  // and HTML marker projection match the actual rendered canvas size.
  // Using window.innerWidth/Height fails when the container doesn't fill the
  // full window (header bar, scrollbars, etc.).
  // We initialise with window size as a safe default, then correct immediately
  // via getBoundingClientRect, then keep in sync via ResizeObserver.
  const [dimensions, setDimensions] = useState(() => ({
    width:  window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0)
        setDimensions({ width: r.width, height: r.height });
    };

    update(); // immediate correction on mount

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { selectedTrekId, setSelectedTrekId } = useTrekStore();
  const { continent, tier } = useFilterStore();

  const [embedFilters, setEmbedFilters] = useState<{
    tier: string[]; region: string[]; accommodation: string[];
    terrain: string[]; duration: string[]; popularity: string[];
  } | null>(null);

  const [swipeableTreks, setSwipeableTreks] = useState<any[] | null>(null);
  const setSwipeableRef = useRef(setSwipeableTreks);
  useEffect(() => { setSwipeableRef.current = setSwipeableTreks; }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};
      if (type === "TREKMIND_FILTER_UPDATE" && payload) {
        const n = (val: any): string[] => {
          if (Array.isArray(val)) return val;
          if (!val || val === "ALL") return [];
          return [String(val)];
        };
        setEmbedFilters({
          tier: n(payload.tier), region: n(payload.region ?? payload.continent),
          accommodation: n(payload.accommodation), terrain: n(payload.terrain),
          duration: n(payload.duration), popularity: n(payload.popularity),
        });
      }
      if (type === "TREKMIND_ZOOM_IN") {
        const cam = (globeEl.current as any)?.camera?.();
        if (cam) cam.position.multiplyScalar(0.85);
      }
      if (type === "TREKMIND_ZOOM_OUT") {
        const cam = (globeEl.current as any)?.camera?.();
        if (cam) cam.position.multiplyScalar(1.15);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const filteredTreks = useMemo(() => {
    const f = embedFilters;
    return TREKS.filter((trek: any) => {
      if (f?.tier?.length) {
        const nums = f.tier.map(t => parseInt(String(t).replace(/\D/g, ""), 10));
        if (!nums.includes(trek.tier)) return false;
      } else if (!isEmbed && tier && tier !== "ALL") {
        const n = parseInt(String(tier).replace(/\D/g, ""), 10);
        if (!isNaN(n) && trek.tier !== n) return false;
      }
      if (f?.region?.length) { if (!f.region.includes(trek.region)) return false; }
      else if (!isEmbed && continent && continent !== "ALL") { if (trek.region !== continent) return false; }
      if (f?.accommodation?.length && !f.accommodation.includes(getAccommodationCategory(trek.accommodation))) return false;
      if (f?.terrain?.length     && !f.terrain.includes(getTerrainCategory(trek.terrain)))                    return false;
      if (f?.duration?.length    && !f.duration.includes(getDurationBucket(trek.totalDays)))                  return false;
      if (f?.popularity?.length  && !f.popularity.includes(getPopularityBucket(trek.popularityScore)))        return false;
      return true;
    });
  }, [embedFilters, isEmbed, continent, tier]);

  const displayData = useMemo(() => {
    return clusterTreks(filteredTreks, 250)
      .map((item: any) => ({
        ...item,
        lat: item.lat ?? item.latitude,
        lng: item.lng ?? item.longitude,
      }))
      .filter((item: any) =>
        typeof item.lat === "number" && typeof item.lng === "number" &&
        !isNaN(item.lat) && !isNaN(item.lng)
      );
  }, [filteredTreks]);

  const htmlElementCallback = useCallback((d: any) => {
    const isCluster = d.isCluster;
    const trekId    = d.id;
    const trekName  = d.name || "";
    const dotSize   = isCluster ? 32 : 14;
    const pad       = 14; // touch target padding around dot
    const hitSize   = dotSize + pad;
    const half      = hitSize / 2;

    const el = document.createElement("div");
    // Centre the hit-area on the dot's geographic coordinate.
    // IMPORTANT: margin-left and margin-top pull the element LEFT and UP
    // by exactly half its size, so the centre of the div sits on the coordinate.
    el.style.cssText = `
      width:${hitSize}px; height:${hitSize}px;
      margin-left:-${half}px; margin-top:-${half}px;
      pointer-events:auto; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      position:relative; overflow:visible;
    `;

    if (isCluster) {
      el.innerHTML = `
        <div style="
          width:${dotSize}px; height:${dotSize}px;
          background:#f59e0b; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          color:white; font-size:12px; font-weight:700;
          border:2px solid white; box-shadow:0 4px 12px rgba(0,0,0,0.6);
          transition:transform 0.15s; pointer-events:none;
        ">${d.treks?.length ?? "?"}</div>
      `;
    } else {
      const shortName = trekName.length > 18 ? trekName.slice(0, 16).trimEnd() + "…" : trekName;
      // Label positioned absolute above the dot — outside the hit-area box
      // so it doesn't affect the centering calculation
      el.innerHTML = `
        <div style="
          position:absolute; bottom:${hitSize + 2}px;
          left:50%; transform:translateX(-50%);
          white-space:nowrap; pointer-events:none;
          color:white; font-size:10px; font-weight:600;
          text-shadow:0 1px 4px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.9);
        ">${shortName}</div>
        <div class="globe-dot" style="
          width:${dotSize}px; height:${dotSize}px;
          border-radius:50%; background:#3b82f6;
          border:2px solid white; box-shadow:0 0 10px rgba(59,130,246,0.9);
          transition:transform 0.15s, box-shadow 0.15s;
          pointer-events:none;
        "></div>
      `;
    }

    const dot = el.querySelector(isCluster ? "div" : ".globe-dot") as HTMLElement | null;
    el.onmouseenter = () => {
      if (dot) {
        dot.style.transform = "scale(1.6)";
        dot.style.boxShadow = isCluster ? "0 0 18px rgba(245,158,11,1)" : "0 0 18px rgba(59,130,246,1)";
      }
    };
    el.onmouseleave = () => {
      if (dot) {
        dot.style.transform = "scale(1)";
        dot.style.boxShadow = isCluster ? "0 0 10px rgba(245,158,11,0.9)" : "0 0 10px rgba(59,130,246,0.9)";
      }
    };

    el.onpointerdown = (e) => {
      e.stopPropagation();
      setSelectedTrekId(trekId);
      const trekPayload = isCluster
        ? d.treks.map((t: any) => ({ id: t.id }))
        : [{ id: trekId }];

      if (isEmbed) {
        window.parent.postMessage({ type: "TREK_SELECTED_FROM_GLOBE", payload: trekPayload }, "*");
      } else {
        setSwipeableRef.current(isCluster ? d.treks : [d]);
      }
    };

    return el;
  }, [isEmbed, setSelectedTrekId]);

  return (
    // ── Key: the wrapper must have a defined size for ResizeObserver to measure ─
    // `absolute inset-0` fills the parent (which is h-screen in App.tsx)
    // `overflow:visible` lets labels render above the container boundary
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0, background: "#0a0a1a", overflow: "visible" }}
    >
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
          if (isEmbed) window.parent.postMessage({ type: "TREK_DESELECTED_FROM_GLOBE" }, "*");
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
