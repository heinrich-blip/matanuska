import MobileInspectionsTab from "@/components/mobile/MobileInspectionsTab";
import MobileJobCards from "@/components/mobile/MobileJobCards";
import MobileMaintenance from "@/components/mobile/MobileMaintenance";
import MobileTyresTab from "@/components/mobile/MobileTyresTab";
import WorkshopMobileShell, { type WorkshopTab } from "@/components/mobile/WorkshopMobileShell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

// Maps routes to their corresponding workshop tab
const routeToTab: Record<string, WorkshopTab> = {
  "/job-cards": "job-cards",
  "/inspections": "inspections",
  "/maintenance-scheduling": "maintenance",
  "/tyre-management": "tyres",
  "/inspections/tyre": "tyres",
};

interface WorkshopMobileLayoutProps {
  children: ReactNode; // Desktop content passed through, not used on mobile
}

const WorkshopMobileLayout = ({ children: _desktopContent }: WorkshopMobileLayoutProps) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<WorkshopTab>(
    routeToTab[location.pathname] || "job-cards"
  );

  // Sync tab with route changes
  useEffect(() => {
    const mapped = routeToTab[location.pathname];
    if (mapped) setActiveTab(mapped);
  }, [location.pathname]);

  // Badge counts
  const { data: activeJobCount = 0 } = useQuery({
    queryKey: ["mobile-badge-jobs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("job_cards")
        .select("id")
        .in("status", ["pending", "in_progress", "in progress"]);
      return data?.length || 0;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: overdueMaintenanceCount = 0 } = useQuery({
    queryKey: ["mobile-badge-maintenance"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("maintenance_schedules")
        .select("id")
        .eq("is_active", true)
        .lt("next_due_date", today);
      return data?.length || 0;
    },
    refetchInterval: 60000,
  });

  const renderContent = () => {
    switch (activeTab) {
      case "job-cards":
        return <MobileJobCards />;
      case "inspections":
        return <MobileInspectionsTab />;
      case "maintenance":
        return <MobileMaintenance />;
      case "tyres":
        return <MobileTyresTab />;
      default:
        return <MobileJobCards />;
    }
  };

  return (
    <WorkshopMobileShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      badgeCounts={{
        jobCards: activeJobCount > 0 ? activeJobCount : undefined,
        maintenance: overdueMaintenanceCount > 0 ? overdueMaintenanceCount : undefined,
      }}
    >
      {renderContent()}
    </WorkshopMobileShell>
  );
};

export default WorkshopMobileLayout;
