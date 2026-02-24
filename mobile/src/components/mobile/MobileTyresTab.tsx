import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  Car,
  CircleDot,
  Truck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const MobileTyresTab = () => {
  const navigate = useNavigate();

  // Vehicle tyre stats
  const { data: vehicleStats } = useQuery({
    queryKey: ["tyre-vehicle-stats-mobile"],
    queryFn: async () => {
      const [positionsResult, vehiclesResult] = await Promise.all([
        supabase.from("fleet_tyre_positions").select("id, tyre_code").limit(2000),
        supabase.from("vehicles").select("id").limit(500),
      ]);

      const positions = positionsResult.data || [];
      const totalVehicles = vehiclesResult.data?.length || 0;
      const filledPositions = positions.filter(p => p.tyre_code && !p.tyre_code.startsWith("NEW_CODE_")).length;
      const emptyPositions = positions.length - filledPositions;

      return { totalVehicles, totalPositions: positions.length, filledPositions, emptyPositions };
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
          Tyres
        </h1>
        <p className="text-xs text-muted-foreground">
          Vehicle tyre positions &amp; inspections
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 rounded-xl border-2 active:scale-[0.97] transition-transform"
          onClick={() => navigate("/inspections/tyre")}
        >
          <Camera className="h-6 w-6 text-primary" />
          <span className="text-xs font-semibold">Tyre Inspection</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 rounded-xl border-2 active:scale-[0.97] transition-transform"
          onClick={() => navigate("/tyre-management")}
        >
          <Car className="h-6 w-6 text-primary" />
          <span className="text-xs font-semibold">Vehicle Store</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center rounded-xl">
          <p className="text-xl font-bold">{vehicleStats?.totalVehicles || 0}</p>
          <p className="text-[11px] text-muted-foreground font-medium">Vehicles</p>
        </Card>
        <Card className="p-3 text-center rounded-xl">
          <p className="text-xl font-bold text-green-600">{vehicleStats?.filledPositions || 0}</p>
          <p className="text-[11px] text-muted-foreground font-medium">Installed</p>
        </Card>
        <Card className="p-3 text-center rounded-xl">
          <p className="text-xl font-bold text-amber-600">{vehicleStats?.emptyPositions || 0}</p>
          <p className="text-[11px] text-muted-foreground font-medium">Empty</p>
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
                      <Badge variant="destructive" className="text-[11px] px-1.5 py-0.5">Fault</Badge>
                    ) : (
                      <Badge className="text-[11px] px-1.5 py-0.5 bg-green-500">OK</Badge>
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
