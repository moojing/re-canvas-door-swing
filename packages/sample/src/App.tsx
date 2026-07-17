import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import HeavyWaterDoorA11 from "./poc/HeavyWaterDoorA11";
import SewerGateB10 from "./poc/SewerGateB10";
import LiftPlatformC03 from "./poc/LiftPlatformC03";
import ArchedGateB05 from "./poc/ArchedGateB05";
import HeavyWaterDoubleDoorB06 from "./poc/HeavyWaterDoubleDoorB06";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/poc/a11" element={<HeavyWaterDoorA11 />} />
          <Route path="/poc/b10" element={<SewerGateB10 />} />
          <Route path="/poc/c03" element={<LiftPlatformC03 />} />
          <Route path="/poc/b05" element={<ArchedGateB05 />} />
          <Route path="/poc/b06" element={<HeavyWaterDoubleDoorB06 />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
