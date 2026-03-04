import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Globe from "react-globe.gl";
import type { GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import { TREKS } from "../data/treks";
import { useTrekStore } from "../store/useTrekStore";
import { useFilterStore } from "../store/useFilterStore";
import { SwipeableTrekCards } from "./SwipeableTrekCards";
import { clusterTreks } from "../lib/clustering";

// ── Zoom-scale helper ─────────────────────────────────────────────────────────
// react-globe.gl default camera distance is ~300 units from globe centre
const BASE_CAM_DIST = 300;
function getCamScale(camera: THREE.Camera): number {
  const dist = (camera as THREE.PerspectiveCamera).position.length();
  // Inverted: 1.0 at default zoom, SHRINKS when zoomed in, grows when zoomed out
  // Markers become small and precise as you get closer to the coordinates
  return Math.max(0.2, Math.min(2.0, dist / BASE_CAM_DIST));
}

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

// Larger base font (56px vs old 44px) for better readability
function makeLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const ctx    = canvas.getContext("2d")!;
  const font   = "bold 56px sans-serif";
  ctx.font = font;
  const tw = Math.ceil(ctx.measureText(text).width) + 40;
  const th = 96;
  canvas.width  = tw;
  canvas.height = th;
  ctx.font = font;
  ctx.shadowColor   = "rgba(0,0,0,0.95)";
  ctx.shadowBlur    = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle    = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 20, th / 2);
  const mat = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(tw / 28, th / 28, 1);
  return sprite;
}

function makeMarkerGroup(d: any): THREE.Group {
  const group = new THREE.Group();
  const isCl  = d.isCluster;
  const dotR  = isCl ? 3.0 : 2.5;
  const color = isCl ? 0xf59e0b : 0x3b82f6;

  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(dotR + 0.45, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide })
  ));
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(dotR, 16, 16),
    new THREE.MeshBasicMaterial({ color })
  ));

  const labelText = isCl
    ? String(d.treks?.length ?? "?")
    : (d.name?.length > 22 ? d.name.slice(0, 20).trimEnd() + "…" : (d.name || ""));
  const label = makeLabelSprite(labelText);
  label.position.set(0, dotR + 3.2, 0);
  group.add(label);

  (group as any).__label = label;
  const tag = (obj: any) => { obj.__trek = d; };
  tag(group); group.children.forEach(tag);
  return group;
}

export function GlobeViewer({ hideCards }: { hideCards?: boolean }) {
  const isEmbed = useMemo(() =>
    new URLSearchParams(window.location.search).get("embed") === "true", []);

  const globeEl      = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // ── Per-frame: scale markers with zoom + hide back-face labels ─────────────
  useEffect(() => {
    const camDir = new THREE.Vector3();
    const pos    = new THREE.Vector3();
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const camera = (globeEl.current as any)?.camera?.();
      const scene  = (globeEl.current as any)?.scene?.();
      if (!camera || !scene) return;

      const scale = getCamScale(camera);
      camDir.copy(camera.position).normalize();

      scene.traverse((obj: any) => {
        // Scale entire marker group with zoom
        if (obj.__trek && obj.isGroup) {
          obj.scale.setScalar(scale);
        }
        // Hide labels on back face
        if (!obj.__label) return;
        obj.getWorldPosition(pos);
        pos.normalize();
        const opacity = pos.dot(camDir) > 0.05 ? 1 : 0;
        const mat = (obj.__label as THREE.Sprite).material as THREE.SpriteMaterial;
        if (mat.opacity !== opacity) mat.opacity = opacity;
      });
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const { selectedTrekId, setSelectedTrekId } = useTrekStore();
  const { continent, tier } = useFilterStore();
  const [embedFilters, setEmbedFilters] = useState<any>(null);
  const [swipeableTreks, setSwipeableTreks] = useState<any[] | null>(null);
  const swipeRef = useRef(setSwipeableTreks);
  useEffect(() => { swipeRef.current = setSwipeableTreks; }, []);

  // ── Zoom functions ──────────────────────────────────────────────────────────
  const zoomIn = useCallback(() => {
    const c = (globeEl.current as any)?.camera?.();
    if (c) c.position.multiplyScalar(0.85);
  }, []);
  const zoomOut = useCallback(() => {
    const c = (globeEl.current as any)?.camera?.();
    if (c) c.position.multiplyScalar(1.15);
  }, []);

  const startHold = useCallback((direction: "in" | "out") => {
    // Fire once immediately on press, then repeat every 80ms while held
    if (direction === "in") zoomIn(); else zoomOut();
    holdTimerRef.current = setInterval(() => {
      if (direction === "in") zoomIn(); else zoomOut();
    }, 80);
  }, [zoomIn, zoomOut]);

  const stopHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  // Cleanup hold timer on unmount
  useEffect(() => () => stopHold(), [stopHold]);

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
      if (type === "TREKMIND_ZOOM_IN")  zoomIn();
      if (type === "TREKMIND_ZOOM_OUT") zoomOut();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [zoomIn, zoomOut]);

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
    const pos = latLngToVec3(d.lat, d.lng, 0.01);
    obj.position.copy(pos);
    obj.lookAt(new THREE.Vector3(0, 0, 0));
    obj.rotateX(Math.PI);
  }, []);

  const fireSelection = useCallback((d: any) => {
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

  const handleClick = useCallback((obj: any) => {
    let node: any = obj;
    while (node && !node.__trek) node = node.parent;
    fireSelection(node?.__trek);
  }, [fireSelection]);

  useEffect(() => {
    if (!isEmbed) return;
    const attach = () => {
      const renderer = (globeEl.current as any)?.renderer?.();
      const camera   = (globeEl.current as any)?.camera?.();
      const scene    = (globeEl.current as any)?.scene?.();
      if (!renderer || !camera || !scene) return null;
      const canvas    = renderer.domElement;
      const raycaster = new THREE.Raycaster();
      const onPointerDown = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        const y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
        raycaster.setFromCamera({ x, y }, camera);
        const hits = raycaster.intersectObjects(scene.children, true);
        for (const hit of hits) {
          let node: any = hit.object;
          while (node && !node.__trek) node = node.parent;
          if (node?.__trek) { e.stopPropagation(); fireSelection(node.__trek); return; }
        }
      };
      canvas.addEventListener("pointerdown", onPointerDown);
      return () => canvas.removeEventListener("pointerdown", onPointerDown);
    };
    let cleanup: (() => void) | null = null;
    let tries = 0;
    const iv = setInterval(() => {
      const r = attach();
      if (r !== null) { clearInterval(iv); if (r) cleanup = r; }
      else if (tries++ > 20) clearInterval(iv);
    }, 200);
    return () => { clearInterval(iv); cleanup?.(); };
  }, [isEmbed, fireSelection]);

  // ── Zoom button component (inline to access zoomIn/zoomOut/startHold/stopHold)
  const ZoomBtn = ({ dir }: { dir: "in" | "out" }) => (
    <button
      style={{
        width: 44, height: 44,
        background: "rgba(255,255,255,0.92)",
        border: "none", borderRadius: 8,
        fontSize: 24, fontWeight: "bold", lineHeight: 1,
        cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
        userSelect: "none", WebkitUserSelect: "none",
        touchAction: "none", color: "#1e293b",
      }}
      onMouseDown={() => startHold(dir)}
      onMouseUp={stopHold}
      onMouseLeave={stopHold}
      onTouchStart={(e) => { e.preventDefault(); startHold(dir); }}
      onTouchEnd={stopHold}
      onTouchCancel={stopHold}
      aria-label={dir === "in" ? "Zoom in" : "Zoom out"}
    >
      {dir === "in" ? "+" : "−"}
    </button>
  );

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

      {/* Zoom controls — only in standalone mode; embedded mode uses GlobeIntegration's buttons */}
      {!isEmbed && (
        <div style={{
          position: "absolute", bottom: 24, right: 24, zIndex: 20,
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <ZoomBtn dir="in" />
          <ZoomBtn dir="out" />
        </div>
      )}

      {swipeableTreks && !hideCards && (
        <SwipeableTrekCards treks={swipeableTreks} initialIndex={0} onClose={() => setSwipeableTreks(null)} />
      )}
    </div>
  );
}