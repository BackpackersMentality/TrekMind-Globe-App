import { GlobeViewer } from "./components/GlobeViewer";
import "./index.css";

function App() {
  const isEmbed = new URLSearchParams(window.location.search).get("embed") === "true";
  const hideCards = params.get('hideCards') === 'true';

// Only show swipeable cards if NOT hiding them
{!hideCards && <SwipeableTrekCards ... />}

  return (
    <div className="h-screen w-screen">
      {!isEmbed && (
        <header className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
          <h1 className="text-xl font-bold">TrekMind Globe</h1>
        </header>
      )}

      <GlobeViewer />
    </div>
  );
}

export default App;
