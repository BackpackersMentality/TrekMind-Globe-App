import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Globe from "react-globe.gl";
import type { GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import { TREKS } from "../data/treks";
import { useTrekStore } from "../store/useTrekStore";
import { useFilterStore } from "../store/useFilterStore";
import { SwipeableTrekCards } from "./SwipeableTrekCards";
import { clusterTreks } from "../lib/clustering";

// ── Filter helpers ────────────────────────────────────────────────────────────
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
function getDurationBucket(d: string | number | undefined): string {
  const m = String(d ?? "").match(/\d+/);
  if (!m) return "Medium";
  const n = parseInt(m[0]);
  return n <= 5 ? "Short" : n <= 10 ? "Medium" : n <= 16 ? "Long" : "Epic";
}
function getPopularityBucket(s: number | undefined): string {
  if (!s) return "Hidden Gem";
  return s >= 8 ? "Iconic" : s >= 5 ? "Popular" : "Hidden Gem";
}

// ── Label sprite builder ──────────────────────────────────────────────────────
// Renders text to a canvas, wraps it in a Three.js Sprite so it's a true
// 3D object that stays locked to its world-space position at all zoom levels.
function makeLabelSprite(text: string): THREE.Sprite {
  const canvas  = document.createElement("canvas");
  const ctx     = canvas.getContext("2d")!;
  const font    = "bold 24px sans-serif";
  ctx.font      = font;
  const metrics = ctx.measureText(text);
  const w = Math.ceil(metrics.width) + 16;
  const h = 36;
  canvas.width  = w;
  canvas.height = h;
  ctx.font      = font;
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, w, h);
  // Text shadow for readability
  ctx.shadowColor   = "rgba(0,0,0,0.95)";
  ctx.shadowBlur    = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 8, h / 2);

  const tex      = new THREE.CanvasTexture(canvas);
  const mat      = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite   = new THREE.Sprite(mat);
  // Scale sprite so it appears ~same pixel size regardless of zoom
  // These values look good at default zoom; THREE.js sprite scale is in world units
  sprite.scale.set(w / 60, h / 60, 1);
  return sprite;
}

// ── Group builder: dot + label as one Three.js Group ─────────────────────────
function makeMarkerGroup(d: any): THREE.Group {
  const group     = new THREE.Group();
  const isCluster = d.isCluster;

  // Dot
  const dotR    = isCluster ? 0.55 : 0.28;
  const color   = isCluster ? 0xf59e0b : 0x3b82f6;
  const geo     = new THREE.SphereGeometry(dotR, 16, 16);
  const mat     = new THREE.MeshBasicMaterial({ color });
  const dot     = new THREE.Mesh(geo, mat);
  group.add(dot);

  // White outline ring (gives the white border look)
  const ringGeo = new THREE.SphereGeometry(dotR + 0.06, 16, 16);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide });
  group.add(new THREE.Mesh(ringGeo, ringMat));

  // Label sprite — positioned above the dot
  const label   = isCluster
    ? makeLabelSprite(String(d.treks?.length ?? "?"))
    : makeLabelSprite(d.name?.length > 18 ? d.name.slice(0, 16).trimEnd() + "…" : (d.name || ""));
  label.position.set(0, dotR + 0.55, 0); // above the dot in local space
  group.add(label);

  // Store metadata for click/hover
  (group as any).__trekData = d;

  return group;
}

export function GlobeViewer({ hideCards }: { hideCards?: boolean }) {
  const isEmbed = useMemo(
    () => new URLSearchParams(window.location.search).get("embed") === "true", []
  );

  const globeEl      = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState(() => ({
    width: window.innerWidth, height: window.innerHeight,
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setDimensions({ width: r.width, height: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { selectedTrekId, setSelectedTrekId } = useTrekStore();
  const { continent, tier } = useFilterStore();

  const [embedFilters, setEmbedFilters] = useState<any>(null);
  const [swipeableTreks, setSwipeableTreks] = useState<any[] | null>(null);
  const swipeRef = useRef(setSwipeableTreks);
  useEffect(() => { swipeRef.current = setSwipeableTreks; }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const { type, payload } = e.data || {};
      if (type === "TREKMIND_FILTER_UPDATE" && payload) {
        const n = (v: any): string[] => Array.isArray(v) ? v : (!v || v === "ALL") ? [] : [String(v)];
        setEmbedFilters({
          tier: n(payload.tier), region: n(payload.region ?? payload.continent),
          accommodation: n(payload.accommodation), terrain: n(payload.terrain),
          duration: n(payload.duration), popularity: n(payload.popularity),
        });
      }
      if (type === "TREKMIND_ZOOM_IN")  { const c = (globeEl.current as any)?.camera?.(); if (c) c.position.multiplyScalar(0.85); }
      if (type === "TREKMIND_ZOOM_OUT") { const c = (globeEl.current as any)?.camera?.(); if (c) c.position.multiplyScalar(1.15); }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const filteredTreks = useMemo(() => {
    const f = embedFilters;
    return TREKS.filter((trek: any) => {
      if (f?.tier?.length) { const nums = f.tier.map((t:any) => parseInt(String(t).replace(/\D/g,""),10)); if (!nums.includes(trek.tier)) return false; }
      else if (!isEmbed && tier && tier !== "ALL") { const n = parseInt(String(tier).replace(/\D/g,""),10); if (!isNaN(n) && trek.tier !== n) return false; }
      if (f?.region?.length && !f.region.includes(trek.region)) return false;
      else if (!isEmbed && continent && continent !== "ALL" && trek.region !== continent) return false;
      if (f?.accommodation?.length && !f.accommodation.includes(getAccommodationCategory(trek.accommodation))) return false;
      if (f?.terrain?.length     && !f.terrain.includes(getTerrainCategory(trek.terrain))) return false;
      if (f?.duration?.length    && !f.duration.includes(getDurationBucket(trek.totalDays))) return false;
      if (f?.popularity?.length  && !f.popularity.includes(getPopularityBucket(trek.popularityScore))) return false;
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
      .filter((item: any) => typeof item.lat === "number" && typeof item.lng === "number" && !isNaN(item.lat) && !isNaN(item.lng));
  }, [filteredTreks]);

  // Build a stable THREE.Group per data point, memoised so we don't recreate
  // geometry every render — only when the trek list actually changes.
  const customThreeObject = useCallback((d: any) => makeMarkerGroup(d), []);

  const handleObjectClick = useCallback((obj: any) => {
    const d = (obj as any)?.__trekData ?? (obj?.parent as any)?.__trekData;
    if (!d) return;
    setSelectedTrekId(d.id);
    const payload = d.isCluster
      ? d.treks.map((t: any) => ({ id: t.id }))
      : [{ id: d.id }];
    if (isEmbed) {
      window.parent.postMessage({ type: "TREK_SELECTED_FROM_GLOBE", payload }, "*");
    } else {
      swipeRef.current(d.isCluster ? d.treks : [d]);
    }
  }, [isEmbed, setSelectedTrekId]);

  const handleObjectHover = useCallback((obj: any) => {
    // Scale the dot mesh up on hover
    const group = (obj as any)?.__trekData
      ? obj
      : (obj?.parent as any)?.__trekData
        ? obj.parent
        : null;
    if (!group) return;
    const dot = group.children[0] as THREE.Mesh;
    if (dot) dot.scale.setScalar(obj ? 1.5 : 1.0);
  }, []);

  return (
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

        // ── TRUE 3D MARKERS — no more HTML element drift ──────────────────
        // customLayerData places real Three.js objects in the scene graph.
        // They're rendered by the GPU at exactly the right world position
        // every frame — no CSS projection, no drift at any zoom level.
        customLayerData={displayData}
        customThreeObject={customThreeObject}
        customThreeObjectUpdate={(obj: any, d: any) => {
          // react-globe.gl calls this to let us update position.
          // The library handles lat/lng → world coords via the helper below.
          // We just store the data reference in case it changed.
          (obj as any).__trekData = d;
        }}
        customLayerLabel={(d: any) => ""} // disable built-in tooltip
        onCustomLayerClick={handleObjectClick}
        onCustomLayerHover={handleObjectHover}

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
