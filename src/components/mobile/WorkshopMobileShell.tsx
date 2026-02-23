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
import { Link, useLocation, useNavigate } from "react-router-dom";

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

const moreMenuLinks = [
  { path: "/", label: "Dashboard" },
  { path: "/incidents", label: "Incidents" },
  { path: "/vendors", label: "Vendors" },
  { path: "/vehicles", label: "Fleet Management" },
  { path: "/procurement", label: "Procurement & Inventory" },
  { path: "/inspector-profiles", label: "Inspector Profiles" },
  { path: "/trip-management", label: "Trip Management" },
  { path: "/driver-management", label: "Driver Management" },
  { path: "/diesel-management", label: "Diesel Management" },
  { path: "/unified-map", label: "Fleet Map & Reports" },
  { path: "/action-log", label: "Action Log" },
];

const WorkshopMobileShell = ({
  children,
  activeTab,
  onTabChange,
  badgeCounts = {},
}: WorkshopMobileShellProps) => {
  const navigate = useNavigate();
  const location = useLocation();
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
    navigate(tab.path);
  };

  const getBadge = (tabId: WorkshopTab) => {
    const count = badgeCounts[tabId === "job-cards" ? "jobCards" : tabId];
    if (!count || count === 0) return null;
    return (
      <Badge
        variant="destructive"
        className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[10px] leading-none"
      >
        {count > 99 ? "99+" : count}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Compact Mobile Header */}
      <header className="fixed top-0 left-0 right-0 h-12 border-b border-border bg-card z-50 flex items-center justify-between px-3 safe-area-top">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
            <span className="text-accent-foreground font-bold text-xs">MT</span>
          </div>
          <h2 className="text-sm font-bold text-foreground">Workshop</h2>
        </div>

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-4">
            <nav className="space-y-1 mt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                More Pages
              </p>
              {moreMenuLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    location.pathname === link.path
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
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
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pt-12 pb-16 safe-area-bottom">
        <div className="p-3">
          {children}
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-50 safe-area-bottom">
        <div className="flex items-center justify-around h-full px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabPress(tab)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                  {getBadge(tab.id)}
                </div>
                <span className={cn(
                  "text-[10px] leading-tight",
                  isActive ? "font-semibold" : "font-normal"
                )}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default WorkshopMobileShell;
