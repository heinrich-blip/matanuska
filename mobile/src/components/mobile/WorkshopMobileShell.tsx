import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useGeofenceNotifications } from "@/hooks/useGeofenceNotifications";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CircleDot,
  ClipboardList,
  LogOut,
  Menu,
  Search,
} from "lucide-react";
import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";

export type WorkshopTab = "job-cards" | "inspections" | "maintenance" | "tyres";

interface WorkshopMobileShellProps {
  children: ReactNode;
  activeTab: WorkshopTab;
  onTabChange: (tab: WorkshopTab) => void;
  badgeCounts?: {
    jobCards?: number;
    inspections?: number;
    maintenance?: number;
    tyres?: number;
  };
}

const tabs: { id: WorkshopTab; label: string; icon: typeof ClipboardList; path: string }[] = [
  { id: "job-cards", label: "Job Cards", icon: ClipboardList, path: "/job-cards" },
  { id: "inspections", label: "Inspections", icon: Search, path: "/inspections" },
  { id: "maintenance", label: "Maintenance", icon: Calendar, path: "/maintenance-scheduling" },
  { id: "tyres", label: "Tyres", icon: CircleDot, path: "/tyre-management" },
];

// Standalone mobile app — no external links needed

const WorkshopMobileShell = ({
  children,
  activeTab,
  onTabChange,
  badgeCounts = {},
}: WorkshopMobileShellProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [moreOpen, setMoreOpen] = useState(false);

  useGeofenceNotifications();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast({ title: "Logged out successfully" });
  };

  const handleTabPress = (tab: typeof tabs[number]) => {
    onTabChange(tab.id);
  };

  const getBadge = (tabId: WorkshopTab) => {
    const count = badgeCounts[tabId === "job-cards" ? "jobCards" : tabId];
    if (!count || count === 0) return null;
    return (
      <Badge
        variant="destructive"
        className="absolute -top-1.5 -right-1.5 h-[18px] min-w-[18px] px-1 text-[11px] leading-none"
      >
        {count > 99 ? "99+" : count}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header with safe-area */}
      <header className="fixed top-0 left-0 right-0 border-b border-border/50 bg-card/95 backdrop-blur-md z-50 safe-area-top">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary-active flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-xs">MT</span>
            </div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Workshop</h2>
          </div>

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-4">
              <nav className="space-y-1 mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                  Workshop Portal
                </p>
              </nav>
              <div className="mt-6 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pt-14 pb-16 safe-area-bottom">
        <div className="p-4">{children}</div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/50 z-50 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabPress(tab)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 relative transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-full bg-primary" />
                )}
                <div className="relative">
                  <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                  {getBadge(tab.id)}
                </div>
                <span className={cn(
                  "text-[11px] leading-tight",
                  isActive ? "font-semibold" : "font-medium"
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default WorkshopMobileShell;
