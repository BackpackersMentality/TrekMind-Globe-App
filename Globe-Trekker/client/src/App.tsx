import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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

// In your App.tsx or wherever you have header/logo
function App() {
  const isEmbed = new URLSearchParams(window.location.search).get("embed") === "true";

  return (
    <div>
      {!isEmbed && (
        <header>
          <img src="/logo.png" alt="Logo" />
          <h1>TrekMind Globe</h1>
        </header>
      )}
      <GlobeViewer />
    </div>
  );
}

export default App;
