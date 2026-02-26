import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, TrendingUp, Package, Calculator, Home, Menu, X, Bot, LogOut, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { AiChat } from './AiChat';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { title: 'მთავარი', icon: Home, path: '/' },
  { title: 'შესყიდვა', icon: ShoppingCart, path: '/purchases' },
  { title: 'გაყიდვა', icon: TrendingUp, path: '/sales' },
  { title: 'ნაშთი', icon: Package, path: '/inventory' },
  { title: 'ბუღალტერია', icon: Calculator, path: '/accounting' },
  { title: 'ადმინ პანელი', icon: ShieldCheck, path: '/admin' },
];

function SidebarContent({ onNavigate, isCollapsed }: { onNavigate?: () => void; isCollapsed?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || null);
    });
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={cn("p-4 border-b border-sidebar-border transition-all", isCollapsed && "items-center px-2")}>
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shrink-0">
            <Package className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-sidebar-foreground truncate">JabsOna-MTS</h2>
              <p className="text-[10px] text-muted-foreground truncate font-medium uppercase tracking-wider">საწყობის მართვა</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => { navigate(item.path); onNavigate?.(); }}
            title={isCollapsed ? item.title : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
              location.pathname === item.path
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-sidebar-foreground hover:bg-sidebar-accent/80",
              isCollapsed && "justify-center px-2"
            )}
          >
            <item.icon className={cn("h-5 w-5 shrink-0 transition-transform", !isCollapsed && "group-hover:scale-110")} />
            {!isCollapsed && <span className="truncate">{item.title}</span>}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t border-sidebar-border mt-auto">
        {!isCollapsed && userEmail && (
          <div className="px-3 py-2 mb-2 bg-muted/50 rounded-lg overflow-hidden">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-tighter">მომხმარებელი</p>
            <p className="text-[11px] font-medium truncate">{userEmail}</p>
          </div>
        )}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            onNavigate?.();
          }}
          title={isCollapsed ? "გასვლა" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors group",
            isCollapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          {!isCollapsed && <span>გასვლა</span>}
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse on smaller desktop screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && window.innerWidth >= 768) {
        setIsCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside
          className={cn(
            "bg-sidebar-background border-r border-sidebar-border shrink-0 transition-all duration-300 ease-in-out relative flex flex-col shadow-sm print:hidden",
            isCollapsed ? "w-20" : "w-60"
          )}
        >
          <SidebarContent isCollapsed={isCollapsed} />

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-20 bg-background border border-border rounded-full p-1 shadow-md hover:bg-muted transition-colors z-20"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Mobile header */}
        {isMobile && (
          <header className="flex items-center gap-2 p-3 border-b border-border bg-background shrink-0 z-30 print:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar-background">
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 flex-1">
              <Package className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">საწყობი</h1>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-0">
          <div className="h-full w-full">
            {children}
          </div>
        </main>
      </div>

      {/* AI Chat FAB */}
      <div className="print:hidden">
        <Button
          onClick={() => setAiOpen(!aiOpen)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl hover:scale-105 transition-transform"
          size="icon"
        >
          {aiOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        </Button>
      </div>

      {/* AI Chat Panel */}
      {aiOpen && (
        <div className="print:hidden">
          <AiChat onClose={() => setAiOpen(false)} />
        </div>
      )}
    </div>
  );
}
