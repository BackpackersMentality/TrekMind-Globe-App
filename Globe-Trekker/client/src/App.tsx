import { useMemo } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const isEmbed = useMemo(
    () => new URLSearchParams(window.location.search).get("embed") === "true",
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <div className={isEmbed ? "h-screen w-screen overflow-hidden" : ""}>
        {/* Hide header/logo in embed mode */}
        {!isEmbed && (
          <header className="bg-white shadow-sm p-4 flex items-center gap-4">
            <img src="/logo.png" alt="TrekMind Logo" className="h-10" />
            <h1 className="text-2xl font-bold">TrekMind Globe</h1>
          </header>
        )}

        {/* Router renders Home (which has GlobeViewer) */}
        <div className={isEmbed ? "h-full" : "h-[calc(100vh-80px)]"}>
          <Router />
        </div>
        
      </div>
    </QueryClientProvider>
  );
}

export default App;
