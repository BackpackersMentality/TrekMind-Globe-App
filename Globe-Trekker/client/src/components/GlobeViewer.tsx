import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Globe from "react-globe.gl";
import type { GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import { TREKS } from "../data/treks";
import { useTrekStore } from "../store/useTrekStore";
import { useFilterStore } from "../store/useFilterStore";
import { SwipeableTrekCards } from "./SwipeableTrekCards";
import { clusterTreks } from "../lib/clustering";

function getAccommodationCategory(raw = "") {
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
function getTerrainCategory(raw = "") {
  const t = raw.toLowerCase();
  if (t.includes("volcanic")) return "Volcanic";
  if (t.includes("coastal")) return "Coastal";
  if (t.includes("jungle") || t.includes("rainforest") || t.includes("cloud forest") || t.includes("tropical")) return "Jungle/Forest";
  if (t.includes("desert") || t.includes("canyon") || t.includes("wadi")) return "Desert";
  if (t.includes("arctic") || t.includes("tundra") || t.includes("glacial") || t.includes("glaciated")) return "Glacial/Arctic";
  if (t.includes("high alpine") || t.includes("high sierra") || t.includes("andean")) return "High Alpine";
  if (t.includes("alpine")) return "Alpine";
  return "Alpine";
}
function getDurationBucket(d: any) {
  const m = String(d ?? "").match(/\d+/);
  if (!m) return "Medium";
  const n = parseInt(m[0]);
  return n <= 5 ? "Short" : n <= 10 ? "Medium" : n <= 16 ? "Long" : "Epic";
}
function getPopularityBucket(s: any) {
  return !s ? "Hidden Gem" : s >= 8 ? "Iconic" : s >= 5 ? "Popular" : "Hidden Gem";
}

// Coordinate conversion — verified against three-globe source
function latLngToVec3(lat: number, lng: number, alt = 0.01, R = 100): THREE.Vector3 {
  const DEG2RAD = Math.PI / 180;
  const phi   = (90 - lat) * DEG2RAD;
  const theta = lng * DEG2RAD;
  const r = R * (1 + alt);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.cos(theta)
  );
}

// Canvas text sprite for labels
function makeLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = "bold 48px sans-serif";
  ctx.font = font;
  const tw = Math.ceil(ctx.measureText(text).width) + 24;
  const th = 56;
  canvas.width = tw; canvas.height = th;
  ctx.font = font;
  ctx.shadowColor = "rgba(0,0,0,1)"; ctx.shadowBlur = 10;
  ctx.fillStyle = "#ffffff"; ctx.textBaseline = "middle";
  ctx.fillText(text, 12, th / 2);
  const mat = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  // Base scale — will be multiplied by altitude scale in customThreeObjectUpdate
  sprite.scale.set(tw / 38, th / 38, 1);
  return sprite;
}

function makeMarkerGroup(d: any): THREE.Group {
  const group = new THREE.Group();
  const isCl  = d.isCluster;
  const dotR  = isCl ? 1.1 : 0.75;
  const color = isCl ? 0xf59e0b : 0x3b82f6;

  // White border sphere
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(dotR + 0.15, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide })
  ));
  // Coloured dot
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(dotR, 16, 16),
    new THREE.MeshBasicMaterial({ color })
  ));

  const labelText = isCl
    ? String(d.treks?.length ?? "?")
    : (d.name?.length > 18 ? d.name.slice(0, 16).trimEnd() + "…" : (d.name || ""));
  const label = makeLabelSprite(labelText);
  label.position.set(0, dotR + 1.0, 0);
  group.add(label);

  // Tag for click detection
  const tag = (o: any) => { o.__trek = d; };
  tag(group); group.children.forEach(tag);
  return group;
}

export function GlobeViewer({ hideCards }: { hideCards?: boolean }) {
  const isEmbed = useMemo(() =>
    new URLSearchParams(window.location.search).get("embed") === "true", []);

  const globeEl     = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Altitude ref — updated by controls listener, read by customThreeObjectUpdate
  // Using a ref (not state) means no re-renders when altitude changes.
  // Default orbit altitude in react-globe.gl = 2.5 globe-radii.
  const altitudeRef = useRef(2.5);

  const [dimensions, setDimensions] = useState(() => ({
    width: window.innerWidth, height: window.innerHeight,
  }));

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setDimensions({ width: r.width, height: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Track camera altitude via controls 'change' event ────────────────────
  // pointOfView().altitude is in globe-radii units (2.5 = default view).
  // We store it in a ref so customThreeObjectUpdate can read it without
  // triggering a re-render every time the user rotates/zooms.
  useEffect(() => {
    const attachControls = () => {
      const controls = (globeEl.current as any)?.controls?.();
      if (!controls) return false;
      const onControlChange = () => {
        const pov = globeEl.current?.pointOfView?.();
        if (pov?.altitude != null) altitudeRef.current = pov.altitude;
      };
      controls.addEventListener("change", onControlChange);
      return true;
    };
    // Globe may not be ready immediately — retry until attached
    let tries = 0;
    const interval = setInterval(() => {
      if (attachControls() || tries++ > 20) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
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
    return (TREKS as any[]).filter(trek => {
      if (f?.tier?.length) { const nums = f.tier.map((t:any)=>parseInt(String(t).replace(/\D/g,""),10)); if (!nums.includes(trek.tier)) return false; }
      else if (!isEmbed && tier && tier !== "ALL") { const n=parseInt(String(tier).replace(/\D/g,""),10); if (!isNaN(n)&&trek.tier!==n) return false; }
      if (f?.region?.length && !f.region.includes(trek.region)) return false;
      else if (!isEmbed && continent && continent !== "ALL" && trek.region !== continent) return false;
      if (f?.accommodation?.length && !f.accommodation.includes(getAccommodationCategory(trek.accommodation))) return false;
      if (f?.terrain?.length     && !f.terrain.includes(getTerrainCategory(trek.terrain))) return false;
      if (f?.duration?.length    && !f.duration.includes(getDurationBucket(trek.totalDays))) return false;
      if (f?.popularity?.length  && !f.popularity.includes(getPopularityBucket(trek.popularityScore))) return false;
      return true;
    });
  }, [embedFilters, isEmbed, continent, tier]);

  const displayData = useMemo(() =>
    clusterTreks(filteredTreks, 250)
      .map((item: any) => ({
        ...item,
        lat: item.lat ?? item.latitude,
        lng: item.lng ?? item.longitude,
      }))
      .filter((item: any) =>
        typeof item.lat === "number" && typeof item.lng === "number" &&
        !isNaN(item.lat) && !isNaN(item.lng)
      ),
  [filteredTreks]);

  const customThreeObject = useCallback((d: any) => makeMarkerGroup(d), []);

  const customThreeObjectUpdate = useCallback((obj: THREE.Object3D, d: any) => {
    // 1. Position on globe surface
    const pos = latLngToVec3(d.lat, d.lng, 0.01);
    obj.position.copy(pos);
    // 2. Orient so label sits above dot
    obj.lookAt(new THREE.Vector3(0, 0, 0));
    obj.rotateX(Math.PI);
    // 3. Scale by altitude — bigger when zoomed out, smaller when zoomed in.
    //    altitude 2.5 (default) → scale 1.0
    //    altitude 0.5 (close)   → scale 0.3 (clamped min)
    //    altitude 4.0 (far)     → scale 1.6 (clamped max)
    //    Scaling the group works here because scale is applied in local space
    //    around the group's own origin (on the globe surface), not the world origin.
    const alt = altitudeRef.current;
    const s = Math.min(1.6, Math.max(0.3, alt / 2.5));
    obj.scale.setScalar(s);
  }, []);

  const handleClick = useCallback((obj: any) => {
    let node: any = obj;
    while (node && !node.__trek) node = node.parent;
    const d = node?.__trek;
    if (!d) return;
    setSelectedTrekId(d.id);
    const payload = d.isCluster ? d.treks.map((t: any) => ({ id: t.id })) : [{ id: d.id }];
    if (isEmbed) {
      window.parent.postMessage({ type: "TREK_SELECTED_FROM_GLOBE", payload }, "*");
    } else {
      swipeRef.current(d.isCluster ? d.treks : [d]);
    }
  }, [isEmbed, setSelectedTrekId]);

  return (
    <div ref={containerRef}
      style={{ position: "absolute", inset: 0, background: "#0a0a1a", overflow: "visible" }}>
      <Globe
        ref={globeEl as any}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        customLayerData={displayData}
        customThreeObject={customThreeObject}
        customThreeObjectUpdate={customThreeObjectUpdate}
        customLayerLabel={() => ""}
        onCustomLayerClick={handleClick}
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
