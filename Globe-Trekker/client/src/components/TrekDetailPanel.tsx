import { motion } from "framer-motion";
import { X, Mountain, Ruler, Clock, ArrowUp, MapPin } from "lucide-react";

interface TrekDetailPanelProps {
  trek: any;
  onClose: () => void;
}

export function TrekDetailPanel({ trek, onClose }: TrekDetailPanelProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  console.log("PANEL RENDER: Active Trek:", trek?.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: isMobile ? "100%" : 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: isMobile ? "100%" : 50 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="trek-card fixed bottom-0 left-0 right-0 md:bottom-8 md:right-8 md:left-auto w-full md:max-w-sm z-[9999] pointer-events-auto bg-[#0f172a]/95 shadow-2xl"
    >
      <div className="bg-card/90 backdrop-blur-xl border-t md:border border-white/10 rounded-t-3xl md:rounded-2xl p-6 md:p-8 shadow-2xl text-card-foreground max-h-[75vh] overflow-y-auto no-scrollbar">
        
        {/* Mobile Swipe Indicator */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 md:hidden" />
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 text-primary text-xs font-semibold mb-1 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{trek.country} • {trek.continent}</span>
              <span className="mx-1 opacity-20">|</span>
              <span className="text-white/60">{trek.tier === "Tier 1" ? "Tier 1 – Flagship" : trek.tier === "Tier 2" ? "Tier 2 – Classic" : "Tier 3 – Hidden Gem"}</span>
            </div>
            <h2 className="text-3xl font-bold font-display leading-tight tracking-tight text-white drop-shadow-sm">{trek.name}</h2>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 -mr-2 -mt-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
            data-testid="button-close-panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 transition-all group shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-widest mb-1.5 group-hover:text-primary transition-colors">
              <Mountain className="w-3 h-3" />
              <span>Difficulty</span>
            </div>
            <div className={`text-base font-bold ${getDifficultyColor(trek.difficulty)}`}>
              {trek.difficulty}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 transition-all group shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-widest mb-1.5 group-hover:text-primary transition-colors">
              <Clock className="w-3 h-3" />
              <span>Duration</span>
            </div>
            <div className="text-base font-bold text-white">
              {trek.lengthDays} <span className="text-[10px] font-medium text-muted-foreground uppercase">Days</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 transition-all group shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-widest mb-1.5 group-hover:text-primary transition-colors">
              <ArrowUp className="w-3 h-3" />
              <span>Accommodation</span>
            </div>
            <div className="text-base font-bold text-white">
              {trek.accommodation}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 transition-all group shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-widest mb-1.5 group-hover:text-primary transition-colors">
              <Ruler className="w-3 h-3" />
              <span>Popularity</span>
            </div>
            <div className="text-base font-bold text-white">
              {trek.popularityScore} <span className="text-[10px] font-medium text-muted-foreground uppercase">/ 100</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {trek.shortDescription}
          </p>
        </div>

        {/* Action Button */}
        <button 
          className="w-full py-4 rounded-xl font-bold text-base uppercase tracking-widest
            bg-gradient-to-br from-primary via-blue-600 to-indigo-700
            text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]
            hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] hover:-translate-y-0.5
            active:translate-y-0 active:scale-[0.98]
            transition-all duration-300 ease-out border border-white/10"
          onClick={(e) => {
            e.stopPropagation();
            console.log("Viewing trek:", trek.id);
            onClose();
          }}
          data-testid="button-view-trek"
        >
          View Trek Details
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Popularity Score: {trek.popularityScore}/100
        </p>
      </div>
    </motion.div>
  );
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "Easy": return "text-green-500";
    case "Moderate": return "text-blue-500";
    case "Hard": return "text-orange-500";
    case "Extreme": return "text-red-500";
    default: return "text-white";
  }
}
