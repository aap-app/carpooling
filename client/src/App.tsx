import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AddTrip from "@/pages/add-trip";
import ListTrips from "@/pages/list-trips";
import Header from "@/components/header";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AddTrip} />
      <Route path="/add" component={AddTrip} />
      <Route path="/trips" component={ListTrips} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Header />
          <Router />
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
