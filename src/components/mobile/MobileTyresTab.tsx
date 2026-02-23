import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  CircleDot,
  Truck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const MobileTyresTab = () => {
  const navigate = useNavigate();

  // Summary counts
  const { data: tyreSummary } = useQuery({
    queryKey: ["tyre-summary-mobile"],
    queryFn: async () => {
      const [inventoryResult, installedResult] = await Promise.all([
        supabase.from("tyre_inventory").select("id, status").limit(1000),
        supabase.from("vehicle_tyre_positions").select("id").limit(1000),
      ]);

      const inventory = inventoryResult.data || [];
      const installed = installedResult.data?.length || 0;
      const inStock = inventory.filter(t => t.status === "in_stock" || t.status === "new").length;
      const needsAttention = inventory.filter(t => t.status === "worn" || t.status === "damaged").length;

      return { total: inventory.length, inStock, installed, needsAttention };
    },
  });

  // Recent tyre inspections
  const { data: recentInspections = [] } = useQuery({
    queryKey: ["tyre-inspections-recent-mobile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .select("*")
        .eq("inspection_type", "tyre")
        .order("inspection_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-lookup-tyres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, fleet_number, registration_number");
      if (error) throw error;
      return data || [];
    },
  });

  const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CircleDot className="h-5 w-5" />
          Tyre Management
        </h1>
        <p className="text-xs text-muted-foreground">
          {tyreSummary?.total || 0} tyres tracked
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-1.5"
          onClick={() => navigate("/inspections/tyre")}
        >
          <Camera className="h-5 w-5" />
          <span className="text-xs font-medium">Tyre Inspection</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-1.5"
          onClick={() => navigate("/tyre-management")}
        >
          <CircleDot className="h-5 w-5" />
          <span className="text-xs font-medium">Full Inventory</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-2 text-center">
          <p className="text-lg font-bold">{tyreSummary?.total || 0}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </Card>
        <Card className="p-2 text-center">
          <p className="text-lg font-bold text-green-600">{tyreSummary?.inStock || 0}</p>
          <p className="text-[10px] text-muted-foreground">In Stock</p>
        </Card>
        <Card className="p-2 text-center">
          <p className="text-lg font-bold text-blue-600">{tyreSummary?.installed || 0}</p>
          <p className="text-[10px] text-muted-foreground">Installed</p>
        </Card>
        <Card className="p-2 text-center">
          <p className={cn("text-lg font-bold", (tyreSummary?.needsAttention || 0) > 0 ? "text-red-600" : "text-gray-400")}>
            {tyreSummary?.needsAttention || 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Attention</p>
        </Card>
      </div>

      {/* Recent Tyre Inspections */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Recent Tyre Inspections</h2>
        {recentInspections.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No tyre inspections yet
          </div>
        ) : (
          <div className="space-y-2">
            {recentInspections.map((insp) => {
              const vehicle = vehicleMap.get(insp.vehicle_id || "");
              return (
                <Card
                  key={insp.id}
                  className="active:scale-[0.98] transition-transform cursor-pointer"
                  onClick={() => navigate(`/inspections/${insp.id}`)}
                >
                  <CardContent className="p-3 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{insp.inspection_number}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {vehicle && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {vehicle.fleet_number || vehicle.registration_number}
                          </span>
                        )}
                        {insp.inspection_date && (
                          <span>
                            {new Date(insp.inspection_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {insp.has_fault ? (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Fault</Badge>
                    ) : (
                      <Badge className="text-[10px] px-1.5 py-0 bg-green-500">OK</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileTyresTab;
