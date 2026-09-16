import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import TransitionComplete from "./pages/TransitionComplete";
import DevAnimationList from "./pages/DevAnimationList";
import DevAnimationVerifier from "./pages/DevAnimationVerifier";
import NotFound from "./pages/NotFound";

const DevHandleMaterialVerifier = import.meta.env.VITE_DOOR_ASSET_MODE === "cdn"
  ? null
  : lazy(() => import("./pages/DevHandleMaterialVerifier"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dev" element={<Navigate to="/dev/animations" replace />} />
          <Route path="/dev/animations" element={<DevAnimationList />} />
          <Route path="/dev/animations/:animationId" element={<DevAnimationVerifier />} />
          {DevHandleMaterialVerifier && (
            <Route
              path="/dev/handles/:handleId"
              element={
                <Suspense fallback={null}>
                  <DevHandleMaterialVerifier />
                </Suspense>
              }
            />
          )}
          <Route path="/transition-complete" element={<TransitionComplete />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
