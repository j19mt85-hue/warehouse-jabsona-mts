import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Purchases from "./pages/Purchases";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Accounting from "./pages/Accounting";
import NotFound from "./pages/NotFound";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
                session ? (
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/purchases" element={<Purchases />} />
                      <Route path="/sales" element={<Sales />} />
                      <Route path="/inventory" element={<Inventory />} />
                      <Route path="/accounting" element={<Accounting />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
