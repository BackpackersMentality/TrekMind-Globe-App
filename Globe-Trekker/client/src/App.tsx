import { GlobeViewer } from "./components/GlobeViewer";
import "./index.css";

function App() {
  const params   = new URLSearchParams(window.location.search);
  const isEmbed  = params.get("embed") === "true";
  const hideCards = params.get("hideCards") === "true";

  return (
    // position:relative + explicit 100vw/100vh gives ResizeObserver a concrete
    // size to measure. `overflow:hidden` prevents any scrollbar from appearing
    // which would change the measured dimensions.
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {!isEmbed && (
        <header className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
          <h1 className="text-xl font-bold">TrekMind Globe</h1>
        </header>
      )}
      <GlobeViewer hideCards={hideCards} />
    </div>
  );
}

export default App;
