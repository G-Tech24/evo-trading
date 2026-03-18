import { Switch, Route } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/Dashboard";
import AgentDetail from "@/pages/AgentDetail";
import NotFound from "@/pages/not-found";
import PerplexityAttribution from "@/components/PerplexityAttribution";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <Switch hook={useHashLocation}>
          <Route path="/" component={Dashboard} />
          <Route path="/agent/:id" component={AgentDetail} />
          <Route component={NotFound} />
        </Switch>
        <PerplexityAttribution />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}
