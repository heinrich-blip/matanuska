"use client";

import { MobileShell } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { BottomSheetSelect } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatNumber } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Calendar, Clock, MapPin, Truck, Receipt } from "lucide-react";
import { useState } from "react";

interface Vehicle {
  id: string;
  fleet_number: string;
  registration_number: string;
  make?: string;
  model?: string;
}

// Trip entry from main dashboard (trips table)
interface TripEntry {
  id: string;
  trip_number: string | null;
  vehicle_id: string | null;
  fleet_vehicle_id: string | null; // Direct link to vehicles table
  origin: string | null;
  destination: string | null;
  departure_date: string | null;
  arrival_date: string | null;
  driver_name: string | null;
  client_name: string | null;
  distance_km: number | null;  starting_km: number | null;
  ending_km: number | null;  base_revenue: number | null;
  invoice_amount: number | null;
  status: string | null;
  created_at: string | null;
}

// Type for driver_vehicle_assignments join result
interface DriverVehicleAssignment {
  id: string;
  vehicle_id: string;
  vehicles: Vehicle | Vehicle[] | null;
}

// Freight details interface
interface FreightDetail {
  id: string;
  trip_id: string;
}

// Import the TripDetailSheet component
import { TripDetailSheet } from "@/components/trip-detail-sheet";
import { StatCard, LoadingSpinner, EmptyState } from "@/components/trip-link-form";

// Helper to get month options (current + past 11 months)
function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
      month: date.getMonth(),
      year: date.getFullYear(),
    });
  }
  return options;
}

export default function TripsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Month selector state
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  // State for trip link form
  const [selectedTrip, setSelectedTrip] = useState<TripEntry | null>(null);
  const [showTripForm, setShowTripForm] = useState(false);

  // Parse selected month to get date range
  const selectedMonthData = monthOptions.find(m => m.value === selectedMonth) || monthOptions[0];
  const firstDayOfMonth = new Date(selectedMonthData.year, selectedMonthData.month, 1).toISOString().split("T")[0];
  const lastDayOfMonth = new Date(selectedMonthData.year, selectedMonthData.month + 1, 0).toISOString().split("T")[0];
  const monthName = new Date(selectedMonthData.year, selectedMonthData.month).toLocaleString("default", { month: "long" });

  // Refresh Handler
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["monthly-trips"] }),
      queryClient.invalidateQueries({ queryKey: ["freight-details"] }),
    ]);
  };

  // Fetch assigned vehicle from driver_vehicle_assignments
  const { data: assignedVehicle } = useQuery({
    queryKey: ["assigned-vehicle", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("driver_vehicle_assignments")
        .select(`
          id,
          vehicle_id,
          vehicles (
            id,
            fleet_number,
            registration_number,
            make,
            model
          )
        `)
        .eq("driver_id", user.id)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      const assignment = data as DriverVehicleAssignment | null;
      if (assignment?.vehicles) {
        const vehicleData = Array.isArray(assignment.vehicles) ? assignment.vehicles[0] : assignment.vehicles;
        return vehicleData as Vehicle;
      }
      return null;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 min - assignment doesn't change often
  });

  // Fetch trips for current month - linked directly via fleet_vehicle_id
  const { data: monthlyTrips = [], isLoading: isLoadingTrips } = useQuery({
    queryKey: ["monthly-trips", assignedVehicle?.id, firstDayOfMonth],
    queryFn: async () => {
      if (!assignedVehicle?.id) return [];

      const { data, error } = await supabase
        .from("trips")
        .select(`
          id,
          trip_number,
          vehicle_id,
          fleet_vehicle_id,
          origin,
          destination,
          departure_date,
          arrival_date,
          driver_name,
          client_name,
          distance_km,
          starting_km,
          ending_km,
          base_revenue,
          invoice_amount,
          status,
          created_at
        `)
        .eq("fleet_vehicle_id", assignedVehicle.id)
        .gte("departure_date", firstDayOfMonth)
        .lte("departure_date", lastDayOfMonth)
        .order("departure_date", { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []) as TripEntry[];
    },
    enabled: !!assignedVehicle?.id,
  });

  // Fetch existing freight details for all trips (lightweight - just need trip_id for mapping)
  const { data: freightDetails = [], isLoading: isLoadingFreight } = useQuery({
    queryKey: ["freight-details", assignedVehicle?.id, user?.id],
    queryFn: async () => {
      if (!assignedVehicle?.id || !user?.id) return [];

      const { data, error } = await supabase
        .from("freight_details")
        .select(`id, trip_id`)
        .eq("vehicle_id", assignedVehicle.id)
        .eq("driver_id", user.id);

      if (error) return [];
      return (data || []) as FreightDetail[];
    },
    enabled: !!assignedVehicle?.id && !!user?.id,
  });

  // Fetch cycle tracker existence for all trips (lightweight)
  const tripIds = monthlyTrips.map(t => t.id);
  const { data: trackerRecords = [] } = useQuery({
    queryKey: ["cycle-tracker-exists", tripIds.join(",")],
    queryFn: async () => {
      if (tripIds.length === 0) return [];
      const { data, error } = await supabase
        .from("trip_cycle_tracker")
        .select("trip_id, current_phase, is_completed")
        .in("trip_id", tripIds);

      if (error) return [];
      return (data || []) as { trip_id: string; current_phase: number; is_completed: boolean }[];
    },
    enabled: tripIds.length > 0,
  });

  // Create tracker map for quick lookup
  const trackerMap = trackerRecords.reduce((acc, t) => {
    acc[t.trip_id] = t;
    return acc;
  }, {} as Record<string, { trip_id: string; current_phase: number; is_completed: boolean }>);

  // Create a map for quick lookup of freight by trip_id
  const freightMap = freightDetails.reduce((acc, freight) => {
    acc[freight.trip_id] = freight;
    return acc;
  }, {} as Record<string, FreightDetail>);

  // Show ALL trips
  const allTrips = monthlyTrips;
  const totalTrips = allTrips.length;
  const totalDistanceKm = allTrips.reduce((sum, e) => sum + (e.distance_km || 0), 0);
  const completedTrips = allTrips.filter(t => t.status === 'completed').length;

  // Handler to open trip detail
  const handleOpenTripDetail = (trip: TripEntry) => {
    setSelectedTrip(trip);
    setShowTripForm(true);
  };

  const isLoading = isLoadingTrips || isLoadingFreight;

  return (
    <MobileShell>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-5 space-y-6 min-h-screen">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-semibold">Trips</h1>
              <BottomSheetSelect
                value={selectedMonth}
                onValueChange={setSelectedMonth}
                options={monthOptions.map(opt => ({ value: opt.value, label: opt.label }))}
                placeholder="Select month"
                label="Select Month"
                className="h-7 w-auto text-xs text-muted-foreground border-none px-0 py-0 bg-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Trips" value={totalTrips} />
            <StatCard label="KM Traveled" value={`${formatNumber(totalDistanceKm)} km`} />
            <StatCard label="Completed" value={completedTrips} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">{monthName} Trips</p>
              <p className="text-xs text-muted-foreground">
                {completedTrips} of {totalTrips} completed
              </p>
            </div>
            {isLoading ? (
              <LoadingSpinner />
            ) : allTrips.length === 0 ? (
              <EmptyState />
            ) : (
              allTrips.map((entry) => (
                <TripCard 
                  key={entry.id} 
                  entry={entry} 
                  tracker={trackerMap[entry.id]}
                  onOpenDetail={() => handleOpenTripDetail(entry)}
                />
              ))
            )}
          </div>

          {/* Trip Detail Sheet */}
          {selectedTrip && (
            <TripDetailSheet
              trip={selectedTrip}
              open={showTripForm}
              onOpenChange={setShowTripForm}
            />
          )}
        </div>
      </PullToRefresh>
    </MobileShell>
  );
}

// Trip Card component
function TripCard({ 
  entry, 
  tracker,
  onOpenDetail 
}: { 
  entry: TripEntry; 
  tracker?: { current_phase: number; is_completed: boolean };
  onOpenDetail: () => void;
}) {
  const statusColor = entry.status === "completed"
    ? "bg-emerald-500/15 text-emerald-400"
    : entry.status === "in_progress" || entry.status === "active"
    ? "bg-blue-500/15 text-blue-400"
    : "bg-muted text-muted-foreground";

  return (
    <Card 
      className="hover:bg-muted/30 transition-colors cursor-pointer active:scale-[0.99]"
      onClick={onOpenDetail}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-medium text-sm truncate">{entry.client_name || entry.trip_number || "Trip"}</p>
            {tracker && (
              <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                tracker.is_completed
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-blue-500/15 text-blue-400"
              }`}>
                <Clock className="w-2.5 h-2.5" />
                {tracker.is_completed ? "360°" : `P${tracker.current_phase}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            {entry.departure_date ? formatDate(entry.departure_date) : "No date"}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{entry.origin || "N/A"}</span>
          <ArrowRight className="w-3 h-3 shrink-0" />
          <span className="truncate">{entry.destination || "N/A"}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
          <span>
            {entry.distance_km ? `${formatNumber(entry.distance_km)} km` : "Distance N/A"}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColor}`}>
            {entry.status || "pending"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}