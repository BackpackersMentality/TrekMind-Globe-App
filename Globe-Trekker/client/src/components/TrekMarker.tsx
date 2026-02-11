import { TrekGlobeNode } from "@shared/schema";
import { useMemo } from "react";

interface TrekMarkerProps {
  trek: TrekGlobeNode;
  isSelected: boolean;
  onClick: () => void;
}

export function TrekMarker({ trek, isSelected, onClick }: TrekMarkerProps) {
  // Determine color based on difficulty
  const color = useMemo(() => {
    switch (trek.difficulty) {
      case "Easy": return "#22c55e"; // green-500
      case "Moderate": return "#3b82f6"; // blue-500
      case "Hard": return "#f97316"; // orange-500
      case "Extreme": return "#ef4444"; // red-500
      default: return "#3b82f6";
    }
  }, [trek.difficulty]);

  // Size based on popularity (scale 4px to 12px)
  const size = 4 + (trek.popularityScore / 100) * 8;

  return (
    <div 
      onClick={onClick}
      className="group relative cursor-pointer"
      style={{
        transform: isSelected ? 'scale(1.4)' : 'scale(1)',
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
    >
      {/* Pulse effect */}
      <div 
        className={`absolute inset-0 rounded-full animate-ping opacity-40 transition-opacity duration-500 ${isSelected ? 'opacity-70' : 'group-hover:opacity-60'}`}
        style={{ backgroundColor: color, animationDuration: '2s' }}
      />
      
      {/* Glowing aura */}
      <div 
        className="absolute inset-[-4px] rounded-full blur-[6px] opacity-0 group-hover:opacity-40 transition-opacity duration-300"
        style={{ backgroundColor: color }}
      />
      
      {/* Main Dot */}
      <div 
        className="rounded-full shadow-[0_0_15px_rgba(0,0,0,0.6)] border border-white/30 group-hover:border-white transition-all duration-300"
        style={{ 
          width: `${size}px`, 
          height: `${size}px`, 
          backgroundColor: color,
        }}
      />
    </div>
  );
}
