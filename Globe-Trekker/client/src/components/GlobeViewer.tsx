// TrekDetail.tsx — optimised for performance
//
// Key changes:
// 1. Hero image: loading='eager' + fetchpriority='high' (was lazy — killed LCP score)
// 2. Itinerary + editorial: fetched async via getItineraryAsync() (was sync 212KB import)
// 3. Waypoints passed to RouteMap from fetched data (not imported globally)
// 4. Map Suspense fallback matches actual map height (prevents CLS)
// 5. useEffect deps tightened

import { getTrekById, getItineraryAsync, getEditorialContentAsync } from "@/lib/treks";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, MapPin, Calendar, Mountain,
  Clock, Activity, TrendingUp, Info, Sparkles, CheckCircle2,
  Bed, Tent, Home, Building2, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect, Suspense, lazy } from "react";
import { GearAssistant } from "@/components/GearAssistant";
import { getTrekImageUrl } from "@/lib/images";
import { Helmet } from "react-helmet-async";

const RouteMap = lazy(() => import("@/components/RouteMap"));

// ── Map skeleton matches the actual rendered map height ───────────────────────
function MapSkeleton() {
  return (
    <div className="w-full h-[500px] rounded-xl bg-muted/40 animate-pulse flex items-center justify-center border border-border">
      <div className="text-muted-foreground text-sm flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        <span>Loading map…</span>
      </div>
    </div>
  );
}

export default function TrekDetail() {
  const [, params] = useRoute("/trek/:id");
  const trekId = params?.id;
  const [imgError, setImgError] = useState(false);

  // ── Async data state ──────────────────────────────────────────────────────
  const [itinerary, setItinerary]   = useState<any[] | null>(null);
  const [editorial, setEditorial]   = useState<any | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => { window.scrollTo(0, 0); }, [trekId]);

  // ── Fetch itinerary + editorial on demand ─────────────────────────────────
  // This replaces the 212KB synchronous import with a 1-9KB per-trek fetch.
  useEffect(() => {
    if (!trekId) return;
    setItinerary(null);
    setEditorial(null);
    setDataLoading(true);

    Promise.all([
      getItineraryAsync(trekId),
      getEditorialContentAsync(trekId),
    ]).then(([itin, ed]) => {
      setItinerary(itin);
      setEditorial(ed);
      setDataLoading(false);
    });
  }, [trekId]);

  const trek = useMemo(() => trekId ? getTrekById(trekId) : null, [trekId]);

  if (!trek) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <h1 className="text-2xl font-bold text-foreground">Trek not found</h1>
        <Link href="/"><Button variant="ghost">Return to Home</Button></Link>
      </div>
    );
  }

  // ── SEO meta — unique per trek page ───────────────────────────────────────
  const pageTitle       = `${trek.name} Trek Guide — ${trek.country} | TrekMind`;
  const pageDescription = `Plan your ${trek.name} trek in ${trek.country}. ${trek.totalDays}, ${trek.distance}, max altitude ${trek.maxAltitude || "N/A"}. ${trek.terrain} terrain in ${trek.region}.`;
  const pageUrl         = `https://trekmind.pages.dev/trek/${trekId}`;
  const pageImage       = getTrekImageUrl(trek.imageFilename);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords"    content={`${trek.name}, ${trek.country} trekking, ${trek.region} hiking, ${trek.terrain} trek, trekking routes`} />
        <link rel="canonical"    href={pageUrl} />
        {/* OpenGraph — controls how the link looks when shared on social */}
        <meta property="og:type"        content="article" />
        <meta property="og:url"         content={pageUrl} />
        <meta property="og:title"       content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image"       content={pageImage} />
        {/* Twitter card */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image"       content={pageImage} />
        {/* JSON-LD structured data — helps Google show rich results */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TouristAttraction",
          "name": trek.name,
          "description": pageDescription,
          "url": pageUrl,
          "image": pageImage,
          "address": {
            "@type": "PostalAddress",
            "addressCountry": trek.country,
            "addressRegion": trek.region,
          },
          "touristType": "Trekking / Hiking",
        })}</script>
      </Helmet>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <div className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
        {/*
          ✅ PERFORMANCE FIX: Hero image is above the fold — it IS the LCP element.
          loading='eager' + fetchpriority='high' tells the browser to prioritise
          this image over everything else. The original had loading='lazy' which
          actively told the browser to DEPRIORITISE the most important image.
        */}
        <img
          src={imgError ? "/images/placeholder-trek.jpg" : getTrekImageUrl(trek.imageFilename)}
          alt={trek.name}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/40 to-transparent" />

        <div className="absolute top-4 left-4 z-50">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-5xl mx-auto">
          <div className="animate-in slide-in-from-bottom-8 duration-700 fade-in">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="backdrop-blur-sm bg-white/90 text-black">{trek.terrain}</Badge>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-black/40 text-white backdrop-blur-md border border-white/20">
                <Calendar className="w-3.5 h-3.5" /> Best: {trek.season || trek.bestSeason || trek.best_season || "Year Round"}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-2 leading-tight drop-shadow-lg">
              {trek.name}
            </h1>
            <div className="flex items-center text-white/90 text-lg font-light gap-2">
              <MapPin className="w-5 h-5" />
              {trek.region}, {trek.country}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 space-y-12">

        {/* Stats Grid */}
        <div className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border border-border grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <StatItem icon={Clock}      label="Duration"  value={trek.totalDays || `${trek.durationDays} Days`} />
          <StatItem icon={Activity}   label="Distance"  value={trek.distance || `${trek.distanceKm}km`} />
          <StatItem icon={Mountain}   label="Max Alt"   value={`${trek.maxAltitude || trek.maxAltitudeM || "N/A"}`} highlight={(trek.maxAltitude || trek.maxAltitudeM || 0) > 4000} />
          <StatItem icon={TrendingUp} label="Daily Avg" value={`${Math.round(parseInt(trek.distance || String(trek.distanceKm)) / parseInt(trek.totalDays || String(trek.durationDays)))} km`} />
        </div>

        {/* Accommodation & Risk */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Bed className="w-5 h-5 text-primary" /> Accommodation
            </h3>
            <div className="bg-secondary/20 rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-lg shadow-sm">
                  {trek.accommodation === "Camping"   ? <Tent      className="w-4 h-4 text-primary" /> :
                   trek.accommodation === "Teahouses" ? <Home      className="w-4 h-4 text-primary" /> :
                                                        <Building2 className="w-4 h-4 text-primary" />}
                </div>
                <span className="font-semibold text-foreground">{trek.accommodation}</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" /> Risk Factors
            </h3>
            <div className="flex flex-wrap gap-3 pt-1">
              {(trek.maxAltitude || trek.maxAltitudeM || 0) > 3000 && <Badge variant="destructive">Altitude Risk</Badge>}
              {(trek.permits === "Required" || trek.permits === "Restricted") && <Badge variant="secondary">Permit Required</Badge>}
            </div>
          </div>
        </div>

        {/* Why Special & Highlights — rendered once editorial loads */}
        {editorial && (editorial.whySpecial || editorial.highlights?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t">
            {editorial.whySpecial && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" /> Why This Trek Is Special
                </h3>
                <p className="text-muted-foreground leading-relaxed text-lg italic">{editorial.whySpecial}</p>
              </div>
            )}
            {editorial.highlights?.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-primary" /> Highlights
                </h3>
                <ul className="grid grid-cols-1 gap-3">
                  {editorial.highlights.map((h: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Interactive Route Map */}
        <div className="pt-8 border-t">
          <h2 className="text-2xl font-bold mb-2">Interactive Route Map</h2>
          {/*
            ✅ MapSkeleton matches h-[500px] — prevents CLS while Mapbox chunk downloads.
            RouteMap lazy chunk (~300KB) only downloads here, never on the homepage.
          */}
          <Suspense fallback={<MapSkeleton />}>
            {itinerary && itinerary.length > 0 ? (
              <RouteMap stops={itinerary} trek={trek} />
            ) : dataLoading ? (
              <MapSkeleton />
            ) : (
              <div className="w-full h-[500px] rounded-xl bg-muted/30 flex items-center justify-center border border-border">
                <p className="text-muted-foreground text-sm">No route data available for this trek.</p>
              </div>
            )}
          </Suspense>
        </div>

        {/* Itinerary */}
        {itinerary && itinerary.length > 0 && (
          <div className="space-y-6 pt-8 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="w-6 h-6 text-primary" /> Day-by-Day Itinerary
              </h3>
              <span className="text-sm text-muted-foreground">{itinerary.length} Days</span>
            </div>
            <div className="space-y-4">
              {itinerary.map((day: any) => (
                <ItineraryItem key={day.day} day={day} />
              ))}
            </div>
          </div>
        )}

        {/* Loading state for itinerary */}
        {dataLoading && (
          <div className="space-y-4 pt-8 border-t">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Gear Assistant */}
        <div className="space-y-6 pt-8 border-t">
          <h3 className="text-2xl font-bold">Recommended Gear</h3>
          <GearAssistant
            trekName={trek.name}
            difficulty={trek.terrain}
            maxAltitude={trek.maxAltitude || trek.maxAltitudeM || 0}
            durationDays={parseInt(trek.totalDays || String(trek.durationDays))}
            accommodationType={trek.accommodation}
            campingRequired={trek.accommodation === "Camping"}
          />
        </div>

        {/* Disclaimer */}
        <div className="pt-8 border-t">
          <div className="bg-muted/30 rounded-lg p-4 flex gap-3 items-start border border-border/50">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-muted-foreground/80">AI-generated content:</span> Trek itineraries, risk information, and gear recommendations are AI-generated and intended for planning inspiration only. Details may be incomplete or inaccurate. Always verify routes, permits, weather conditions, and equipment requirements with official sources or certified guides before setting out. TrekMind has no affiliation with any gear brands mentioned.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-muted-foreground/80">Route map:</span> The interactive map shows key waypoints and overnight stops only — it is not a navigation tool and should not be used in the field. For full trail maps and GPS tracks, use{" "}
                <a href="https://www.alltrails.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground transition-colors">AllTrails</a>,{" "}
                <a href="https://www.gaiagps.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground transition-colors">Gaia GPS</a>,
                {" "}or download the official GPX from the relevant trail authority.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatItem({ icon: Icon, label, value, highlight = false }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <span className={cn("text-2xl font-bold", highlight ? "text-destructive" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

function ItineraryItem({ day }: { day: any }) {
  const isHardDay =
    parseFloat(day.maxAltM || day.maxAlt || day.elevation || "0") > 4500 ||
    parseFloat(day.distanceKm || day.distance || "0") > 20;

  return (
    <div className="group">
      <div className={cn(
        "bg-card rounded-xl border border-border transition-all duration-200 hover:shadow-md",
        isHardDay && "border-l-4 border-l-orange-500"
      )}>
        <div className="w-full flex items-center gap-4 p-4 text-left">
          <div className={cn(
            "flex flex-col items-center justify-center w-12 h-12 rounded-lg font-bold shrink-0",
            isHardDay ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
          )}>
            <span className="text-[10px] uppercase">Day</span>
            <span className="text-lg leading-none">{day.day}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-foreground truncate">
                {day.overnight || day.route || day.location}
              </h4>
              {isHardDay && (
                <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0">
                  Challenging
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
              {(day.distanceKm || day.distance) && <span>Distance: {day.distanceKm || day.distance}km</span>}
              {(day.elevGainM || day.elevGain) && <span>· ↑ {day.elevGainM || day.elevGain}m</span>}
              {(day.elevLossM || day.elevLoss) && <span>· ↓ {day.elevLossM || day.elevLoss}m</span>}
              {(day.maxAltM || day.maxAlt || day.elevation) && <span>· Alt: {day.maxAltM || day.maxAlt || day.elevation}m</span>}
            </div>
          </div>
        </div>
        <div className="px-4 pb-5 pt-0 ml-[4.5rem] border-l border-dashed border-border/50 pl-6">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {day.mapNote || day.notes || day.overnightStay || "No additional notes for this day."}
          </p>
        </div>
      </div>
    </div>
  );
}
