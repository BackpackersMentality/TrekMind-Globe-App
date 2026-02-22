import { GlobeViewer } from "./components/GlobeViewer";
import "./index.css";

function App() {
  // Grab the query string parameters from the URL
  const params = new URLSearchParams(window.location.search);
  const isEmbed = params.get("embed") === "true";
  
  // Only hide the cards if explicitly passed as a URL parameter. 
  // (Alternatively, you can just use isEmbed if you ALWAYS want cards hidden on embed)
  const hideCards = params.get("hideCards") === "true";

  return (
    <div className="h-screen w-screen relative">
      {!isEmbed && (
        <header className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
          <h1 className="text-xl font-bold">TrekMind Globe</h1>
        </header>
      )}

      {/* Pass the hideCards prop down to the GlobeViewer */}
      <GlobeViewer hideCards={hideCards} />
    </div>
  );
}

export default App;
