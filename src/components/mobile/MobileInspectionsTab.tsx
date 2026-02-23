import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  Camera,
  ChevronRight,
  ClipboardCheck,
  FileText,
  MapPin,
  QrCode,
  Search,
  User,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MobileInspectionsTab = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ["inspections-mobile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .select("*")
        .order("inspection_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-lookup-inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, fleet_number, registration_number");
      if (error) throw error;
      return data || [];
    },
  });

  const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

  const { data: faultCount = 0 } = useQuery({
    queryKey: ["fault-count-mobile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .select("id")
        .eq("has_fault", true)
        .is("fault_resolved", false);

      if (error) throw error;
      return data?.length || 0;
    },
  });

  const filteredInspections = inspections.filter((insp) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const vehicle = vehicleMap.get(insp.vehicle_id || "");
    return (
      insp.inspection_number?.toLowerCase().includes(term) ||
      (vehicle?.fleet_number || "").toLowerCase().includes(term) ||
      (vehicle?.registration_number || "").toLowerCase().includes(term) ||
      (insp.inspector_name || "").toLowerCase().includes(term)
    );
  });

  const recentInspections = filteredInspections.slice(0, 20);
  const faultInspections = filteredInspections.filter(i => i.has_fault);

  const InspectionCard = ({ inspection }: { inspection: typeof inspections[0] }) => {
    const vehicle = vehicleMap.get(inspection.vehicle_id || "");
    return (
      <Card
        className={cn(
          "active:scale-[0.98] transition-transform cursor-pointer border-l-4",
          inspection.has_fault && !inspection.fault_resolved
            ? "border-l-red-500"
            : inspection.has_fault && inspection.fault_resolved
              ? "border-l-yellow-500"
              : "border-l-green-500"
        )}
        onClick={() => navigate(`/inspections/${inspection.id}`)}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-muted-foreground">
                  {inspection.inspection_number}
                </span>
                {inspection.has_fault && !inspection.fault_resolved && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0">
                    Fault
                  </Badge>
                )}
                {inspection.has_fault && inspection.fault_resolved && (
                  <Badge className="text-[10px] px-1 py-0 bg-yellow-500">
                    Resolved
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium truncate">
                {inspection.inspection_type || "Vehicle Inspection"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
            {vehicle && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {vehicle.fleet_number || vehicle.registration_number}
              </span>
            )}
            {inspection.inspector_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {inspection.inspector_name}
              </span>
            )}
            {inspection.inspection_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(inspection.inspection_date).toLocaleDateString()}
              </span>
            )}
            {inspection.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {inspection.location}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Inspections
        </h1>
        <p className="text-xs text-muted-foreground">
          {inspections.length} inspections · {faultCount > 0 && (
            <span className="text-destructive font-medium">{faultCount} open faults</span>
          )}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-1.5"
          onClick={() => navigate("/inspections/mobile")}
        >
          <QrCode className="h-5 w-5" />
          <span className="text-xs font-medium">QR Scan Start</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-1.5"
          onClick={() => navigate("/inspections/tyre")}
        >
          <Camera className="h-5 w-5" />
          <span className="text-xs font-medium">Tyre Inspection</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search inspections..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="recent" className="text-xs">
            Recent ({recentInspections.length})
          </TabsTrigger>
          <TabsTrigger value="faults" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Faults ({faultInspections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="mt-3 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : recentInspections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No inspections found</div>
          ) : (
            recentInspections.map((insp) => <InspectionCard key={insp.id} inspection={insp} />)
          )}
        </TabsContent>

        <TabsContent value="faults" className="mt-3 space-y-2">
          {faultInspections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-green-400" />
              No open faults
            </div>
          ) : (
            faultInspections.map((insp) => <InspectionCard key={insp.id} inspection={insp} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MobileInspectionsTab;
