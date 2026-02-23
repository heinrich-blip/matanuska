// src/components/Vehicle/VehicleKPITiles.tsx
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Factory, Layers, Tag, Truck } from "lucide-react";

interface KPITile {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

export default function VehicleKPITiles() {
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles-kpi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("active, make, model, vehicle_type");

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const total = vehicles.length;
  const active = vehicles.filter((v) => v.active === true).length;
  const inactive = vehicles.filter((v) => v.active === false).length;
  const makes = new Set(vehicles.map((v) => v.make).filter(Boolean)).size;
  const models = new Set(vehicles.map((v) => v.model).filter(Boolean)).size;
  const types = new Set(vehicles.map((v) => v.vehicle_type).filter(Boolean)).size;

  const tiles: KPITile[] = [
    {
      label: "Total Vehicles",
      value: total,
      icon: <Truck className="h-5 w-5" />,
      colorClass: "text-blue-600",
      bgClass: "bg-blue-50 border-blue-200",
    },
    {
      label: "Active",
      value: active,
      icon: <CheckCircle2 className="h-5 w-5" />,
      colorClass: "text-green-600",
      bgClass: "bg-green-50 border-green-200",
    },
    {
      label: "Inactive",
      value: inactive,
      icon: <AlertCircle className="h-5 w-5" />,
      colorClass: "text-amber-600",
      bgClass: "bg-amber-50 border-amber-200",
    },
    {
      label: "Unique Makes",
      value: makes,
      icon: <Factory className="h-5 w-5" />,
      colorClass: "text-indigo-600",
      bgClass: "bg-indigo-50 border-indigo-200",
    },
    {
      label: "Unique Models",
      value: models,
      icon: <Tag className="h-5 w-5" />,
      colorClass: "text-cyan-600",
      bgClass: "bg-cyan-50 border-cyan-200",
    },
    {
      label: "Vehicle Types",
      value: types,
      icon: <Layers className="h-5 w-5" />,
      colorClass: "text-teal-600",
      bgClass: "bg-teal-50 border-teal-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {tiles.map((tile, i) => (
        <Card key={i} className={`border ${tile.bgClass}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {tile.label}
                </p>
                <p className="text-2xl font-bold mt-1">{tile.value.toLocaleString()}</p>
              </div>
              <div className={`p-2 rounded-full ${tile.bgClass} ${tile.colorClass}`}>
                {tile.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}