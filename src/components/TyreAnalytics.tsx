// src/components/TyreAnalytics.tsx
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFleetNumbers } from "@/hooks/useFleetNumbers";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, Package, TrendingUp } from "lucide-react";
import { useMemo, useState, useCallback } from "react"; // Added useCallback to imports
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Use real DB type with optional position fields (until migration is applied)
type Tyre = Database["public"]["Tables"]["tyres"]["Row"] & {
  position?: string | null;
  current_fleet_position?: string | null;
};

// Move constant outside component to prevent recreation on each render
const INITIAL_TREAD_DEPTHS = {
  steer: 15,   // Steer tyres (V1, V2)
  drive: 22,   // Drive tyres (V3-V10)
  trailer: 15, // Trailer tyres (T*)
} as const;

const TyreAnalytics = () => {
  const [fleetFilter, setFleetFilter] = useState("all");

  // Fetch real tyre data
  const { data: tyres = [] } = useQuery({
    queryKey: ["tyres_analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tyres")
        .select("*");

      if (error) throw error;
      return data as Tyre[];
    },
  });

  // Get unique fleet numbers dynamically from database
  const { data: dynamicFleetNumbers = [] } = useFleetNumbers();
  const fleetTypes = useMemo(() => ["all", ...dynamicFleetNumbers], [dynamicFleetNumbers]);

  // Filter tyres by fleet
  const filteredTyres = useMemo(() => {
    if (fleetFilter === "all") return tyres;
    return tyres.filter((t) => t.position?.startsWith(fleetFilter));
  }, [tyres, fleetFilter]);

  // Helper to determine tyre position type
  const getPositionType = useCallback((position: string | null | undefined): 'steer' | 'drive' | 'trailer' | null => {
    if (!position) return null;
    if (position.startsWith('V1') || position.startsWith('V2')) return 'steer';
    if (position.startsWith('V')) return 'drive';
    if (position.startsWith('T')) return 'trailer';
    return null;
  }, []);

  // Calculate real stats
  const totalTyres = filteredTyres.length;
  const tyresInService = filteredTyres.filter((t) => t.position).length;
  const avgTreadDepth = filteredTyres.reduce((sum, t) => sum + (t.current_tread_depth || 0), 0) / totalTyres || 0;
  const criticalTyres = filteredTyres.filter((t) => t.condition === "needs_replacement").length;

  const stats = [
    {
      title: "Total Tyres",
      value: totalTyres.toString(),
      change: `${tyresInService} in service`,
      icon: Package,
      color: "text-primary",
    },
    {
      title: "Avg Tread Depth",
      value: `${avgTreadDepth.toFixed(1)} mm`,
      change: "Fleet average",
      icon: TrendingUp,
      color: "text-success",
    },
    {
      title: "Excellent/Good",
      value: filteredTyres.filter((t) => ["excellent", "good"].includes(t.condition)).length.toString(),
      change: "Healthy tyres",
      icon: CheckCircle,
      color: "text-info",
    },
    {
      title: "Needs Replacement",
      value: criticalTyres.toString(),
      change: "Critical attention",
      icon: AlertCircle,
      color: "text-warning",
    },
  ];

  // Brand distribution
  const brandDistribution = useMemo(() => {
    const counts = filteredTyres.reduce((acc, t) => {
      acc[t.brand] = (acc[t.brand] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      color: `hsl(${(i * 360) / Object.keys(counts).length}, 70%, 50%)`,
    }));
  }, [filteredTyres]);

  // Fleet performance with tread loss calculation
  const fleetPerformance = useMemo(() => {
    return fleetTypes
      .filter((ft) => ft !== "all")
      .map((fleetType) => {
        const fleetTyres = tyres.filter((t) => t.position?.startsWith(fleetType));
        const avgKm = fleetTyres.reduce((sum, t) => sum + (t.km_travelled || 0), 0) / fleetTyres.length || 0;
        
        // Calculate total tread lost based on position type
        const totalTreadLost = fleetTyres.reduce((sum, t) => {
          const positionType = getPositionType(t.position || t.current_fleet_position);
          if (!positionType) return sum;
          
          const initialDepth = INITIAL_TREAD_DEPTHS[positionType];
          const currentDepth = t.current_tread_depth || 0;
          const treadLost = Math.max(0, initialDepth - currentDepth);
          
          return sum + treadLost;
        }, 0);

        return {
          fleet: fleetType,
          avgKm: Math.round(avgKm),
          totalTreadLost: parseFloat(totalTreadLost.toFixed(1)),
          count: fleetTyres.length,
        };
      });
  }, [tyres, fleetTypes, getPositionType]); // Removed INITIAL_TREAD_DEPTHS from deps since it's now constant

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <Select value={fleetFilter} onValueChange={setFleetFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by fleet" />
          </SelectTrigger>
          <SelectContent>
            {fleetTypes.map((ft) => (
              <SelectItem key={ft} value={ft}>
                {ft === "all" ? "All Fleets" : `Fleet ${ft}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="brands" className="space-y-4">
        <TabsList>
          <TabsTrigger value="brands">Brand Distribution</TabsTrigger>
          <TabsTrigger value="performance">Fleet Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="brands">
          <Card>
            <CardHeader>
              <CardTitle>Brand Distribution</CardTitle>
              <CardDescription>Market share by tyre brand</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={brandDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {brandDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Fleet Type Performance</CardTitle>
              <CardDescription>Average km traveled and total tread lost by fleet type (Initial depths: Steer 15mm, Drive 22mm, Trailer 15mm)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={fleetPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fleet" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="avgKm"
                    fill="hsl(var(--primary))"
                    name="Avg KM Traveled"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="totalTreadLost"
                    fill="hsl(var(--destructive))"
                    name="Total Tread Lost (mm)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TyreAnalytics;