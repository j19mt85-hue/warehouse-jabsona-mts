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
import { getCurrentUserProfile } from "@/lib/warehouse";
import { AppUser } from "@/types/warehouse";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Failsafe timeout: force exit loading state after 2.5s if Supabase hangs
    const timeout = setTimeout(() => {
      if (mounted && loading) setLoading(false);
    }, 2500);

    const initialize = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!mounted) return;
        setSession(session);

        if (session?.user) {
          const profile = await getCurrentUserProfile(session.user.id);
          if (mounted) setUserProfile(profile);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(timeout);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return; // Handled heavily by initialize()

      setSession(session);
      if (session?.user) {
        const profile = await getCurrentUserProfile(session.user.id);
        if (mounted) setUserProfile(profile);
      } else {
        if (mounted) setUserProfile(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-slate-500">იტვირთება...</p>
      </div>
    );
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
                  <Layout userRole={userProfile?.role || 'admin'} userName={userProfile?.name || userProfile?.email}>
                    <Routes>
                      {/* Cashier Routes */}
                      <Route path="/sales" element={<Sales />} />
                      <Route path="/inventory" element={<Inventory />} />

                      {/* Admin-only Routes */}
                      {userProfile?.role !== 'cashier' ? (
                        <>
                          <Route path="/" element={<Index />} />
                          <Route path="/purchases" element={<Purchases />} />
                          <Route path="/accounting" element={<Accounting />} />
                          <Route path="/admin" element={<Admin />} />
                        </>
                      ) : (
                        <Route path="*" element={<Navigate to="/sales" replace />} />
                      )}

                      <Route path="*" element={userProfile?.role === 'cashier' ? <Navigate to="/sales" replace /> : <NotFound />} />
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
