import { BrowserRouter, Route, Routes } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import AboutPage from "@/pages/marketing/about";
import ContactPage from "@/pages/marketing/contact";
import EgyptPage from "@/pages/marketing/egypt";
import FeaturesPage from "@/pages/marketing/features";
import NotFound from "@/pages/not-found";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import DeleteAccount from "@/pages/delete-account";
import DownloadRedirect from "@/pages/download";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/egypt" element={<EgyptPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/download" element={<DownloadRedirect />} />
              <Route path="/delete-account" element={<DeleteAccount />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
