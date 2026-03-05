import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Globe from "react-globe.gl";
import type { GlobeMethods } from "react-globe.gl";
import { TREKS } from "../data/treks";
import { useTrekStore } from "../store/useTrekStore";
import { useFilterStore } from "../store/useFilterStore";
import { SwipeableTrekCards } from "./SwipeableTrekCards";
import { clusterTreks } from "../lib/clustering";

// ── Filter helpers ────────────────────────────────────────────────────────────
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
function getDurationBucket(d: any, tier?: number) {
  if (tier === 4) return "Thru";
  const m = String(d ?? "").match(/\d+/);
  if (!m) return "Medium";
  const n = parseInt(m[0]);
  return n <= 5 ? "Short" : n <= 10 ? "Medium" : n <= 16 ? "Long" : "Epic";
}
function getPopularityBucket(s: any) {
  return !s ? "Hidden Gem" : s >= 8 ? "Iconic" : s >= 5 ? "Popular" : "Hidden Gem";
}

// ── HTML pin factory ──────────────────────────────────────────────────────────
function makePin(d: any, selectedTrekId: string | null, fireSelection: (d: any) => void): HTMLElement {
  const isCluster  = !!d.isCluster;
  const trekId     = isCluster ? null : String(d.id);
  const isSelected = !isCluster && trekId === String(selectedTrekId);
  const name       = isCluster
    ? `${d.treks?.[0]?.name ?? ""} +${(d.treks?.length ?? 1) - 1}`
    : (d.name ?? "");

  // Tier-coloured pins: T1 gold · T2 blue · T3 slate · T4 Thru purple · cluster orange
  const trekTier = isCluster ? null : (d.tier ?? null);
  const pinColor = isCluster
    ? "#f59e0b"
    : trekTier === 1 ? "#f59e0b"   // gold   — Tier 1 iconic
    : trekTier === 2 ? "#3b82f6"   // blue   — Tier 2 legendary
    : trekTier === 3 ? "#64748b"   // slate  — Tier 3 remote/specialist
    : trekTier === 4 ? "#8b5cf6"   // purple — Tier 4 thru-hike
    : "#3b82f6";                   // fallback
  const selectedRing = isSelected
    ? `box-shadow: 0 0 0 3px #fff, 0 0 0 5px ${pinColor}, 0 0 16px ${pinColor}88;`
    : `box-shadow: 0 0 10px ${pinColor}66;`;

  const el = document.createElement("div");
  el.style.cssText = `
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    pointer-events: auto;
    transform-origin: bottom center;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  `;

  el.innerHTML = `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: ${isSelected ? "scale(1.3)" : "scale(1)"};
      transition: transform 0.2s ease;
    ">
      <!-- Label: hidden by default, shown via JS altitude check -->
      <div class="pin-label" style="
        position: absolute;
        bottom: calc(100% + 4px);
        left: 50%;
        transform: translateX(-50%);
        background: rgba(10,15,30,0.88);
        color: #fff;
        font-size: 11px;
        font-weight: 600;
        font-family: system-ui, -apple-system, sans-serif;
        white-space: nowrap;
        padding: 3px 8px;
        border-radius: 6px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        border: 1px solid rgba(255,255,255,0.15);
        text-shadow: 0 1px 2px rgba(0,0,0,0.9);
        letter-spacing: 0.01em;
      ">${name}</div>

      <!-- Pin head -->
      <div style="
        width: 22px; height: 22px;
        border-radius: 50%;
        background: ${pinColor};
        border: 2.5px solid #fff;
        ${selectedRing}
        display: flex;
        align-items: center;
        justify-content: center;
        transition: box-shadow 0.2s;
      ">
        <div style="
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #fff;
          opacity: 0.55;
        "></div>
      </div>

      ${isCluster ? `
        <div style="
          position: absolute;
          top: -5px; right: -6px;
          background: #fff;
          color: ${pinColor};
          font-size: 9px;
          font-weight: 800;
          font-family: system-ui, sans-serif;
          padding: 1px 4px;
          border-radius: 999px;
          border: 1.5px solid ${pinColor};
          line-height: 1.4;
          pointer-events: none;
        ">${d.treks?.length ?? ""}</div>
      ` : ""}

      <!-- Stem -->
      <div style="
        width: 3px; height: 7px;
        background: ${pinColor};
        margin-top: -1px;
        border-radius: 0 0 2px 2px;
      "></div>

      <!-- Shadow -->
      <div style="
        width: 9px; height: 3px;
        background: rgba(0,0,0,0.2);
        border-radius: 50%;
        filter: blur(1px);
        margin-top: 1px;
      "></div>
    </div>
  `;

  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fireSelection(d);
  });

  return el;
}

export function GlobeViewer({ hideCards }: { hideCards?: boolean }) {
  const isEmbed = useMemo(() =>
    new URLSearchParams(window.location.search).get("embed") === "true", []);

  const globeEl      = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
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

  const { selectedTrekId, setSelectedTrekId } = useTrekStore();
  const { continent, tier } = useFilterStore();
  const [embedFilters, setEmbedFilters] = useState<any>(null);
  const [swipeableTreks, setSwipeableTreks] = useState<any[] | null>(null);
  const swipeRef = useRef(setSwipeableTreks);
  useEffect(() => { swipeRef.current = setSwipeableTreks; }, []);

  // ── Zoom via pointOfView altitude (smooth, works with HTML pins) ──────────
  const zoomIn = useCallback(() => {
    if (!globeEl.current) return;
    const cur = globeEl.current.pointOfView();
    globeEl.current.pointOfView({ altitude: Math.max(0.15, cur.altitude - 0.25) }, 350);
  }, []);

  const zoomOut = useCallback(() => {
    if (!globeEl.current) return;
    const cur = globeEl.current.pointOfView();
    globeEl.current.pointOfView({ altitude: Math.min(4.5, cur.altitude + 0.25) }, 350);
  }, []);

  const stopHold = useCallback(() => {
    if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
  }, []);

  useEffect(() => () => stopHold(), [stopHold]);

  // ── Native pointer events on zoom buttons (bypasses WebGL event capture) ──
  const zoomInBtnRef  = useRef<HTMLButtonElement>(null);
  const zoomOutBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const attach = (btn: HTMLButtonElement | null, fn: () => void) => {
      if (!btn) return;
      const onDown = (e: PointerEvent) => {
        e.preventDefault(); e.stopPropagation();
        fn();
        holdTimerRef.current = setInterval(fn, 120);
      };
      const onUp = () => stopHold();
      btn.addEventListener("pointerdown",   onDown);
      btn.addEventListener("pointerup",     onUp);
      btn.addEventListener("pointerleave",  onUp);
      btn.addEventListener("pointercancel", onUp);
      return () => {
        btn.removeEventListener("pointerdown",   onDown);
        btn.removeEventListener("pointerup",     onUp);
        btn.removeEventListener("pointerleave",  onUp);
        btn.removeEventListener("pointercancel", onUp);
      };
    };
    const c1 = attach(zoomInBtnRef.current,  zoomIn);
    const c2 = attach(zoomOutBtnRef.current, zoomOut);
    return () => { c1?.(); c2?.(); };
  }, [zoomIn, zoomOut, stopHold]);

  // ── Track altitude → update pin scale CSS var + label visibility ──────────
  useEffect(() => {
    let attached = false;
    const tryAttach = () => {
      const controls = (globeEl.current as any)?.controls?.();
      if (!controls || attached) return;
      attached = true;

      const onCamChange = () => {
        const globe  = globeEl.current as any;
        const camera = globe?.camera?.();
        const radius = globe?.getGlobeRadius?.();
        if (!camera || !radius) return;

        const alt = Math.max(0.1, camera.position.length() / radius - 1);

        // Pin scale: 1.0 at alt 2.5, shrinks toward 0.35 when zoomed in
        const pinScale = Math.max(0.35, Math.min(1.6, alt / 2.5));
        document.documentElement.style.setProperty("--pin-scale", pinScale.toFixed(3));

        // Labels: show below alt 1.2 (zoomed in enough to read them)
        const showLabels = alt < 1.2;
        document.querySelectorAll<HTMLElement>(".pin-label").forEach(l => {
          l.style.opacity = showLabels ? "1" : "0";
        });
      };

      controls.addEventListener("change", onCamChange);
    };

    // Poll briefly until controls are ready
    const iv = setInterval(() => { tryAttach(); if (attached) clearInterval(iv); }, 200);
    return () => clearInterval(iv);
  }, []);

  // ── Globe init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!globeEl.current) return;
    const controls = (globeEl.current as any)?.controls?.();
    if (controls) { controls.autoRotate = false; controls.enableDamping = true; }
    globeEl.current.pointOfView({ altitude: 2.5 }, 0);
  }, []);

  // ── postMessage (embed filters + zoom from parent) ────────────────────────
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

  // ── Filter treks ───────────────────────────────────────────────────────────
  const filteredTreks = useMemo(() => {
    const f = embedFilters;
    return (TREKS as any[]).filter(trek => {
      if (f?.tier?.length) { const nums = f.tier.map((t:any)=>parseInt(String(t).replace(/\D/g,""),10)); if (!nums.includes(trek.tier)) return false; }
      else if (!isEmbed && tier && tier !== "ALL") { const n=parseInt(String(tier).replace(/\D/g,""),10); if (!isNaN(n)&&trek.tier!==n) return false; }
      if (f?.region?.length && !f.region.includes(trek.region)) return false;
      else if (!isEmbed && continent && continent !== "ALL" && trek.region !== continent) return false;
      if (f?.accommodation?.length && !f.accommodation.includes(getAccommodationCategory(trek.accommodation))) return false;
      if (f?.terrain?.length     && !f.terrain.includes(getTerrainCategory(trek.terrain))) return false;
      if (f?.duration?.length    && !f.duration.includes(getDurationBucket(trek.totalDays, trek.tier))) return false;
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

  // ── Selection ──────────────────────────────────────────────────────────────
  const fireSelection = useCallback((d: any) => {
    if (!d) return;
    setSelectedTrekId(d.isCluster ? null : d.id);
    const payload = d.isCluster
      ? d.treks.map((t: any) => ({ id: t.id }))
      : [{ id: d.id }];
    if (isEmbed) {
      window.parent.postMessage({ type: "TREK_SELECTED_FROM_GLOBE", payload }, "*");
    } else {
      swipeRef.current(d.isCluster ? d.treks : [d]);
    }
  }, [isEmbed, setSelectedTrekId]);

  const htmlElement = useCallback(
    (d: any) => makePin(d, selectedTrekId, fireSelection),
    [selectedTrekId, fireSelection],
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
        htmlElementsData={displayData}
        htmlLat={(d: any) => d.lat}
        htmlLng={(d: any) => d.lng}
        htmlElement={htmlElement}
        onGlobeClick={() => {
          setSelectedTrekId(null);
          setSwipeableTreks(null);
          if (isEmbed) window.parent.postMessage({ type: "TREK_DESELECTED_FROM_GLOBE" }, "*");
        }}
        atmosphereColor="#3a228a"
        atmosphereAltitude={0.15}
      />

      {/* Zoom controls — standalone only; embed handled by GlobeIntegration */}
      {!isEmbed && (
        <div style={{
          position: "absolute", bottom: 24, right: 24, zIndex: 30,
          display: "flex", flexDirection: "column", gap: 8,
          pointerEvents: "auto",
        }}>
          {(["in", "out"] as const).map(dir => (
            <button
              key={dir}
              ref={dir === "in" ? zoomInBtnRef : zoomOutBtnRef}
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
              aria-label={dir === "in" ? "Zoom in" : "Zoom out"}
            >
              {dir === "in" ? "+" : "−"}
            </button>
          ))}
        </div>
      )}

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