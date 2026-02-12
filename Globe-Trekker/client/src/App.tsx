import { useMemo } from "react";
import { GlobeViewer } from "./components/GlobeViewer";
import "./index.css";

function App() {
  const isEmbed = useMemo(
    () => new URLSearchParams(window.location.search).get("embed") === "true",
    []
  );

  return (
    <div className="h-screen w-screen">
      {!isEmbed && (
        <header className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 flex items-center gap-3">
          <img src="/logo.png" alt="TrekMind" className="h-8" />
          <h1 className="text-xl font-bold">TrekMind Globe</h1>
        </header>
      )}

      <GlobeViewer />
    </div>
  );
}

export default App;
