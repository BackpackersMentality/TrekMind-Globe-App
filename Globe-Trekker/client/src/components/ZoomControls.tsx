import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
      <button
        onClick={onZoomIn}
        className="w-10 h-10 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-all flex items-center justify-center group border border-white/20"
        title="Zoom In"
      >
        <ZoomIn className="w-5 h-5 text-slate-700 group-hover:text-primary transition-colors" />
      </button>
      
      <button
        onClick={onZoomOut}
        className="w-10 h-10 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-all flex items-center justify-center group border border-white/20"
        title="Zoom Out"
      >
        <ZoomOut className="w-5 h-5 text-slate-700 group-hover:text-primary transition-colors" />
      </button>
      
      <button
        onClick={onReset}
        className="w-10 h-10 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-all flex items-center justify-center group border border-white/20"
        title="Reset View"
      >
        <Maximize2 className="w-5 h-5 text-slate-700 group-hover:text-primary transition-colors" />
      </button>
    </div>
  );
}
