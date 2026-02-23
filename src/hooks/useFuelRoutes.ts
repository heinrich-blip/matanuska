import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Helper to bypass TypeScript strict typing for tables not yet in types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (tableName: string) => (supabase as any).from(tableName);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpcCall = (fnName: string, params: Record<string, unknown>) => (supabase as any).rpc(fnName, params);

// Types for Fuel Routes
export interface FuelRoute {
  id: string;
  name: string;
  origin: string;
  origin_latitude: number | null;
  origin_longitude: number | null;
  destination: string;
  destination_latitude: number | null;
  destination_longitude: number | null;
  total_distance_km: number | null;
  estimated_duration_hours: number | null;
  is_round_trip: boolean;
  notes: string | null;
  driver_tips: string | null;
  best_fuel_strategy: string | null;
  avg_fuel_consumption_per_km: number;
  is_active: boolean;
  is_favorite: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteWaypoint {
  id: string;
  route_id: string;
  sequence_order: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  distance_from_origin_km: number | null;
  distance_to_next_km: number | null;
  is_fuel_stop: boolean;
  supplier_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface RouteNote {
  id: string;
  route_id: string;
  note_type: "general" | "fuel" | "road_condition" | "hazard" | "tip";
  title: string | null;
  content: string;
  location_description: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_from_origin_km: number | null;
  is_important: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteFuelRecommendation {
  id: string;
  route_id: string;
  supplier_id: string;
  sequence_order: number;
  distance_from_origin_km: number | null;
  distance_to_destination_km: number | null;
  recommended_liters: number | null;
  price_at_calculation: number | null;
  estimated_cost: number | null;
  savings_vs_average: number | null;
  reason: string | null;
  is_mandatory: boolean;
  calculated_at: string;
}

export interface RouteAnalytics {
  id: string;
  route_id: string;
  trip_date: string;
  vehicle_id: string | null;
  driver_name: string | null;
  actual_fuel_liters: number | null;
  actual_fuel_cost: number | null;
  fuel_stops_used: string[] | null;
  optimized_cost_would_be: number | null;
  savings_achieved: number | null;
  notes: string | null;
  created_at: string;
}

export interface CreateRouteData {
  name: string;
  origin: string;
  origin_latitude?: number;
  origin_longitude?: number;
  destination: string;
  destination_latitude?: number;
  destination_longitude?: number;
  total_distance_km?: number;
  estimated_duration_hours?: number;
  is_round_trip?: boolean;
  notes?: string;
  driver_tips?: string;
  best_fuel_strategy?: string;
  avg_fuel_consumption_per_km?: number;
}

export interface CreateWaypointData {
  route_id: string;
  sequence_order: number;
  name: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
  distance_from_origin_km?: number;
  distance_to_next_km?: number;
  is_fuel_stop?: boolean;
  supplier_id?: string;
  notes?: string;
}

export interface CreateNoteData {
  route_id: string;
  note_type: "general" | "fuel" | "road_condition" | "hazard" | "tip";
  title?: string;
  content: string;
  location_description?: string;
  latitude?: number;
  longitude?: number;
  is_important?: boolean;
  created_by?: string;
}

export interface NearestSupplier {
  id: string;
  name: string;
  location: string;
  distance_km: number;
  price_per_liter: number;
  is_preferred: boolean;
  google_maps_url: string | null;
}

export interface RouteSummary {
  route_name: string;
  origin: string;
  destination: string;
  total_distance_km: number;
  total_fuel_needed_liters: number;
  cheapest_station_name: string;
  cheapest_price: number;
  cheapest_total_cost: number;
  avg_market_price: number;
  potential_savings: number;
  notes_count: number;
  waypoints_count: number;
  last_trip_date: string | null;
  usage_count: number;
}

// Query keys
const ROUTE_KEYS = {
  all: ["fuel-routes"] as const,
  active: ["fuel-routes", "active"] as const,
  favorites: ["fuel-routes", "favorites"] as const,
  detail: (id: string) => ["fuel-routes", id] as const,
  waypoints: (routeId: string) => ["route-waypoints", routeId] as const,
  notes: (routeId: string) => ["route-notes", routeId] as const,
  recommendations: (routeId: string) => ["route-recommendations", routeId] as const,
  analytics: (routeId: string) => ["route-analytics", routeId] as const,
  summary: (routeId: string) => ["route-summary", routeId] as const,
};

// Hook to fetch all routes
export const useFuelRoutes = (options?: { activeOnly?: boolean; favoritesOnly?: boolean }) => {
  return useQuery({
    queryKey: [...ROUTE_KEYS.all, options],
    queryFn: async () => {
      let query = fromTable("fuel_routes").select("*");

      if (options?.activeOnly !== false) {
        query = query.eq("is_active", true);
      }
      if (options?.favoritesOnly) {
        query = query.eq("is_favorite", true);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return (data || []) as FuelRoute[];
    },
  });
};

// Hook to fetch a single route
export const useFuelRoute = (routeId: string) => {
  return useQuery({
    queryKey: ROUTE_KEYS.detail(routeId),
    queryFn: async () => {
      const { data, error } = await fromTable("fuel_routes")
        .select("*")
        .eq("id", routeId)
        .single();

      if (error) throw error;
      return data as FuelRoute;
    },
    enabled: !!routeId,
  });
};

// Hook to fetch route waypoints
export const useRouteWaypoints = (routeId: string) => {
  return useQuery({
    queryKey: ROUTE_KEYS.waypoints(routeId),
    queryFn: async () => {
      const { data, error } = await fromTable("route_waypoints")
        .select("*, diesel_suppliers(*)")
        .eq("route_id", routeId)
        .order("sequence_order");

      if (error) throw error;
      return (data || []) as (RouteWaypoint & { diesel_suppliers?: unknown })[];
    },
    enabled: !!routeId,
  });
};

// Hook to fetch route notes
export const useRouteNotes = (routeId: string, noteType?: string) => {
  return useQuery({
    queryKey: [...ROUTE_KEYS.notes(routeId), noteType],
    queryFn: async () => {
      let query = fromTable("route_notes")
        .select("*")
        .eq("route_id", routeId);

      if (noteType) {
        query = query.eq("note_type", noteType);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as RouteNote[];
    },
    enabled: !!routeId,
  });
};

// Hook to fetch route fuel recommendations
export const useRouteFuelRecommendations = (routeId: string) => {
  return useQuery({
    queryKey: ROUTE_KEYS.recommendations(routeId),
    queryFn: async () => {
      const { data, error } = await fromTable("route_fuel_recommendations")
        .select("*, diesel_suppliers(*)")
        .eq("route_id", routeId)
        .order("sequence_order");

      if (error) throw error;
      return (data || []) as RouteFuelRecommendation[];
    },
    enabled: !!routeId,
  });
};

// Hook to fetch route analytics
export const useRouteAnalytics = (routeId: string) => {
  return useQuery({
    queryKey: ROUTE_KEYS.analytics(routeId),
    queryFn: async () => {
      const { data, error } = await fromTable("route_analytics")
        .select("*")
        .eq("route_id", routeId)
        .order("trip_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as RouteAnalytics[];
    },
    enabled: !!routeId,
  });
};

// Hook to get route summary with analytics
export const useRouteSummary = (routeId: string) => {
  return useQuery({
    queryKey: ROUTE_KEYS.summary(routeId),
    queryFn: async () => {
      const { data, error } = await rpcCall("get_route_summary", {
        p_route_id: routeId,
      });

      if (error) throw error;
      return (data?.[0] || null) as RouteSummary | null;
    },
    enabled: !!routeId,
  });
};

// Hook to find nearest suppliers
export const useNearestSuppliers = (latitude: number | null, longitude: number | null, maxDistance = 50) => {
  return useQuery({
    queryKey: ["nearest-suppliers", latitude, longitude, maxDistance],
    queryFn: async () => {
      const { data, error } = await rpcCall("find_nearest_suppliers", {
        p_latitude: latitude,
        p_longitude: longitude,
        p_max_distance_km: maxDistance,
      });

      if (error) throw error;
      return (data || []) as NearestSupplier[];
    },
    enabled: latitude !== null && longitude !== null,
  });
};

// Hook to calculate distance between two points
export const useCalculateDistance = () => {
  return useMutation({
    mutationFn: async ({
      lat1,
      lon1,
      lat2,
      lon2,
    }: {
      lat1: number;
      lon1: number;
      lat2: number;
      lon2: number;
    }) => {
      const { data, error } = await rpcCall("calculate_distance_km", {
        lat1,
        lon1,
        lat2,
        lon2,
      });

      if (error) throw error;
      return data as number;
    },
  });
};

// Hook to create a new route
export const useCreateFuelRoute = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRouteData) => {
      const { data: route, error } = await fromTable("fuel_routes")
        .insert([{ ...data, is_active: true }])
        .select()
        .single();

      if (error) throw error;
      return route as FuelRoute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROUTE_KEYS.all });
      toast({ title: "Success", description: "Route created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to update a route
export const useUpdateFuelRoute = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FuelRoute> & { id: string }) => {
      const { data: route, error } = await fromTable("fuel_routes")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return route as FuelRoute;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROUTE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ROUTE_KEYS.detail(data.id) });
      toast({ title: "Success", description: "Route updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to delete a route
export const useDeleteFuelRoute = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fromTable("fuel_routes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROUTE_KEYS.all });
      toast({ title: "Success", description: "Route deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to toggle favorite
export const useToggleRouteFavorite = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { data, error } = await fromTable("fuel_routes")
        .update({ is_favorite })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as FuelRoute;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROUTE_KEYS.all });
      toast({
        title: data.is_favorite ? "Added to Favorites" : "Removed from Favorites",
        description: `${data.name} ${data.is_favorite ? "is now a favorite route" : "removed from favorites"}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to add a waypoint
export const useAddRouteWaypoint = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWaypointData) => {
      const { data: waypoint, error } = await fromTable("route_waypoints")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return waypoint as RouteWaypoint;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROUTE_KEYS.waypoints(data.route_id) });
      toast({ title: "Success", description: "Waypoint added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to delete a waypoint
export const useDeleteRouteWaypoint = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, route_id }: { id: string; route_id: string }) => {
      const { error } = await fromTable("route_waypoints").delete().eq("id", id);
      if (error) throw error;
      return route_id;
    },
    onSuccess: (route_id) => {
      queryClient.invalidateQueries({ queryKey: ROUTE_KEYS.waypoints(route_id) });
      toast({ title: "Success", description: "Waypoint removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to update waypoint notes
export const useUpdateWaypointNotes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, route_id, notes }: { id: string; route_id: string; notes: string }) => {
      const { data, error } = await fromTable("route_waypoints")
        .update({ notes })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { waypoint: data as RouteWaypoint, route_id };
    },
    onSuccess: ({ route_id }) => {
      queryClient.invalidateQueries({ queryKey: ROUTE_KEYS.waypoints(route_id) });
      toast({ title: "Success", description: "Driver notes saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to reorder waypoints
export const useReorderWaypoints = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      route_id,
      waypoint_orders
    }: {
      route_id: string;
      waypoint_orders: { id: string; sequence_order: number }[]
    }) => {
      // Update each waypoint's sequence_order
      const updates = waypoint_orders.map(({ id, sequence_order }) =>
        fromTable("route_waypoints")
          .update({ sequence_order })
          .eq("id", id)
      );

      const results = await Promise.all(updates);

      // Check for any errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error?.message || "Failed to reorder waypoints");
      }

      return route_id;
    },
    onSuccess: (route_id) => {
      queryClient.invalidateQueries({ queryKey: ROUTE_KEYS.waypoints(route_id) });
      toast({ title: "Success", description: "Fuel stops reordered successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to add a note
export const useAddRouteNote = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNoteData) => {
      const { data: note, error } = await fromTable("route_notes")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return note as RouteNote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROUTE_KEYS.notes(data.route_id) });
      toast({ title: "Success", description: "Note added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to update a note
export const useUpdateRouteNote = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, route_id, ...data }: Partial<RouteNote> & { id: string; route_id: string }) => {
      const { data: note, error } = await fromTable("route_notes")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...note, route_id } as RouteNote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROUTE_KEYS.notes(data.route_id) });
      toast({ title: "Success", description: "Note updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to delete a note
export const useDeleteRouteNote = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, route_id }: { id: string; route_id: string }) => {
      const { error } = await fromTable("route_notes").delete().eq("id", id);
      if (error) throw error;
      return route_id;
    },
    onSuccess: (route_id) => {
      queryClient.invalidateQueries({ queryKey: ROUTE_KEYS.notes(route_id) });
      toast({ title: "Success", description: "Note deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to calculate optimal fuel stops
export const useCalculateOptimalFuelStops = () => {
  return useMutation({
    mutationFn: async ({
      routeId,
      tankCapacity = 500,
      reserveLiters = 50,
    }: {
      routeId: string;
      tankCapacity?: number;
      reserveLiters?: number;
    }) => {
      const { data, error } = await rpcCall("calculate_route_fuel_stops", {
        p_route_id: routeId,
        p_tank_capacity_liters: tankCapacity,
        p_reserve_liters: reserveLiters,
      });

      if (error) throw error;
      return data as {
        supplier_id: string;
        supplier_name: string;
        location: string;
        distance_from_origin_km: number;
        price_per_liter: number;
        recommended_liters: number;
        estimated_cost: number;
        savings_vs_avg: number;
      }[];
    },
  });
};

// Hook to record a trip on a route
export const useRecordRouteTrip = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      route_id: string;
      trip_date: string;
      vehicle_id?: string;
      driver_name?: string;
      actual_fuel_liters?: number;
      actual_fuel_cost?: number;
      fuel_stops_used?: string[];
      notes?: string;
    }) => {
      // Insert analytics record
      const { data: analytics, error } = await fromTable("route_analytics")
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      // Update route usage count
      await fromTable("fuel_routes")
        .update({
          usage_count: (await fromTable("fuel_routes").select("usage_count").eq("id", data.route_id).single()).data?.usage_count + 1 || 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", data.route_id);

      return analytics as RouteAnalytics;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROUTE_KEYS.analytics(data.route_id) });
      queryClient.invalidateQueries({ queryKey: ROUTE_KEYS.all });
      toast({ title: "Success", description: "Trip recorded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Note type options for UI
export const NOTE_TYPES = [
  { value: "general", label: "General", icon: "📝" },
  { value: "fuel", label: "Fuel", icon: "⛽" },
  { value: "road_condition", label: "Road Condition", icon: "🛣️" },
  { value: "hazard", label: "Hazard", icon: "⚠️" },
  { value: "tip", label: "Tip", icon: "💡" },
] as const;