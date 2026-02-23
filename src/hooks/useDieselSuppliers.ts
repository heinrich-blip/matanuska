import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Helper to bypass TypeScript strict typing for tables not yet in types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (tableName: string) => (supabase as any).from(tableName);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpcCall = (fnName: string, params: Record<string, unknown>) => (supabase as any).rpc(fnName, params);

// Types for Diesel Suppliers
export interface DieselSupplier {
  id: string;
  name: string;
  location: string;
  address: string | null;
  province: string | null;
  country: string;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  fuel_type: string;
  current_price_per_liter: number;
  currency: string;
  is_preferred: boolean;
  is_avoided: boolean;
  avoid_reason: string | null;
  min_purchase_liters: number | null;
  operating_hours: string | null;
  has_truck_facilities: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierPriceHistory {
  id: string;
  supplier_id: string;
  price_per_liter: number;
  effective_date: string;
  end_date: string | null;
  price_change: number | null;
  price_change_percent: number | null;
  updated_by: string | null;
  notes: string | null;
  created_at: string;
  supplier?: DieselSupplier;
}

export interface RouteFuelStop {
  id: string;
  route_name: string;
  origin: string;
  destination: string;
  total_distance_km: number | null;
  stop_order: number;
  supplier_id: string;
  distance_from_origin_km: number | null;
  distance_to_next_stop_km: number | null;
  recommended_liters: number | null;
  estimated_cost: number | null;
  is_mandatory: boolean;
  is_recommended: boolean;
  skip_reason: string | null;
  notes: string | null;
  supplier?: DieselSupplier;
}

export interface CreateSupplierData {
  name: string;
  location: string;
  address?: string;
  province?: string;
  country?: string;
  google_maps_url?: string;
  latitude?: number;
  longitude?: number;
  current_price_per_liter: number;
  is_preferred?: boolean;
  is_avoided?: boolean;
  avoid_reason?: string;
  min_purchase_liters?: number;
  operating_hours?: string;
  has_truck_facilities?: boolean;
  notes?: string;
}

export interface UpdatePriceData {
  supplier_id: string;
  new_price: number;
  updated_by?: string;
  notes?: string;
}

export interface RouteAnalysisParams {
  origin: string;
  destination: string;
  total_distance_km: number;
  tank_capacity_liters?: number;
  consumption_per_km?: number;
}

// Query key constants
const SUPPLIER_KEYS = {
  all: ["diesel-suppliers"] as const,
  active: ["diesel-suppliers", "active"] as const,
  preferred: ["diesel-suppliers", "preferred"] as const,
  avoided: ["diesel-suppliers", "avoided"] as const,
  cheapest: ["diesel-suppliers", "cheapest"] as const,
  priceHistory: (supplierId: string) => ["supplier-price-history", supplierId] as const,
  routeStops: (routeName: string) => ["route-fuel-stops", routeName] as const,
  provinceAnalysis: ["diesel-suppliers", "province-analysis"] as const,
};

// Hook to fetch all diesel suppliers
export const useDieselSuppliers = (filters?: {
  activeOnly?: boolean;
  preferredOnly?: boolean;
  avoidedOnly?: boolean;
  province?: string;
  sortBy?: "price" | "name" | "location";
  sortOrder?: "asc" | "desc";
}) => {
  return useQuery({
    queryKey: [...SUPPLIER_KEYS.all, filters],
    queryFn: async () => {
      let query = fromTable("diesel_suppliers")
        .select("*");

      if (filters?.activeOnly !== false) {
        query = query.eq("is_active", true);
      }
      if (filters?.preferredOnly) {
        query = query.eq("is_preferred", true);
      }
      if (filters?.avoidedOnly) {
        query = query.eq("is_avoided", true);
      }
      if (filters?.province) {
        query = query.eq("province", filters.province);
      }

      // Sort
      const sortField = filters?.sortBy === "price" ? "current_price_per_liter" :
                        filters?.sortBy === "location" ? "location" : "name";
      query = query.order(sortField, { ascending: filters?.sortOrder !== "desc" });

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DieselSupplier[];
    },
  });
};

// Hook to fetch cheapest suppliers
export const useCheapestSuppliers = (limit = 10) => {
  return useQuery({
    queryKey: [...SUPPLIER_KEYS.cheapest, limit],
    queryFn: async () => {
      const { data, error } = await fromTable("diesel_suppliers")
        .select("*")
        .eq("is_active", true)
        .eq("is_avoided", false)
        .order("current_price_per_liter", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return (data || []) as DieselSupplier[];
    },
  });
};

// Hook to fetch suppliers to avoid
export const useAvoidedSuppliers = () => {
  return useQuery({
    queryKey: SUPPLIER_KEYS.avoided,
    queryFn: async () => {
      const { data, error } = await fromTable("diesel_suppliers")
        .select("*")
        .eq("is_avoided", true)
        .order("name");

      if (error) throw error;
      return (data || []) as DieselSupplier[];
    },
  });
};

// Hook to fetch price history for a supplier
export const useSupplierPriceHistory = (supplierId: string) => {
  return useQuery({
    queryKey: SUPPLIER_KEYS.priceHistory(supplierId),
    queryFn: async () => {
      const { data, error } = await fromTable("supplier_price_history")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("effective_date", { ascending: false });

      if (error) throw error;
      return (data || []) as SupplierPriceHistory[];
    },
    enabled: !!supplierId,
  });
};

// Hook to get price statistics
export const usePriceStatistics = () => {
  return useQuery({
    queryKey: ["diesel-price-statistics"],
    queryFn: async () => {
      const { data, error } = await fromTable("diesel_suppliers")
        .select("current_price_per_liter, province")
        .eq("is_active", true);

      if (error) throw error;

      const prices = (data || []).map((s: { current_price_per_liter: number }) => s.current_price_per_liter);
      const avgPrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      // Group by province
      const byProvince: Record<string, { count: number; avgPrice: number; minPrice: number }> = {};
      (data || []).forEach((s: { province: string | null; current_price_per_liter: number }) => {
        const prov = s.province || "Unknown";
        if (!byProvince[prov]) {
          byProvince[prov] = { count: 0, avgPrice: 0, minPrice: Infinity };
        }
        byProvince[prov].count++;
        byProvince[prov].avgPrice += s.current_price_per_liter;
        byProvince[prov].minPrice = Math.min(byProvince[prov].minPrice, s.current_price_per_liter);
      });

      // Calculate averages
      Object.keys(byProvince).forEach((prov) => {
        byProvince[prov].avgPrice = byProvince[prov].avgPrice / byProvince[prov].count;
      });

      return {
        totalSuppliers: prices.length,
        avgPrice: Number(avgPrice.toFixed(4)),
        minPrice: Number(minPrice.toFixed(4)),
        maxPrice: Number(maxPrice.toFixed(4)),
        priceRange: Number((maxPrice - minPrice).toFixed(4)),
        byProvince,
      };
    },
  });
};

// Hook to create a new supplier
export const useCreateDieselSupplier = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSupplierData) => {
      const { data: supplier, error } = await fromTable("diesel_suppliers")
        .insert([{
          ...data,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return supplier as DieselSupplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all });
      toast({ title: "Success", description: "Diesel supplier added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to update a supplier
export const useUpdateDieselSupplier = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DieselSupplier> & { id: string }) => {
      const { data: supplier, error } = await fromTable("diesel_suppliers")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return supplier as DieselSupplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all });
      toast({ title: "Success", description: "Supplier updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to update supplier price (with history)
export const useUpdateSupplierPrice = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePriceData) => {
      const { data: result, error } = await rpcCall("update_supplier_price", {
        p_supplier_id: data.supplier_id,
        p_new_price: data.new_price,
        p_updated_by: data.updated_by || null,
        p_notes: data.notes || null,
      });

      if (error) throw error;

      const response = result as { success: boolean; error?: string; old_price?: number; new_price?: number; change?: number; change_percent?: number };
      if (!response.success) {
        throw new Error(response.error || "Failed to update price");
      }

      return response;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all });
      const changeDirection = (result.change || 0) > 0 ? "increased" : "decreased";
      toast({
        title: "Price Updated",
        description: `Price ${changeDirection} from R${result.old_price} to R${result.new_price} (${result.change_percent}%)`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to delete a supplier
export const useDeleteDieselSupplier = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fromTable("diesel_suppliers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all });
      toast({ title: "Success", description: "Supplier deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to toggle preferred status
export const useTogglePreferred = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_preferred }: { id: string; is_preferred: boolean }) => {
      const { data, error } = await fromTable("diesel_suppliers")
        .update({ is_preferred, is_avoided: is_preferred ? false : undefined })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as DieselSupplier;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all });
      toast({
        title: data.is_preferred ? "Marked as Preferred" : "Removed from Preferred",
        description: `${data.name} ${data.is_preferred ? "is now a preferred supplier" : "is no longer preferred"}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to toggle avoided status
export const useToggleAvoided = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_avoided, avoid_reason }: { id: string; is_avoided: boolean; avoid_reason?: string }) => {
      const { data, error } = await fromTable("diesel_suppliers")
        .update({
          is_avoided,
          avoid_reason: is_avoided ? avoid_reason : null,
          is_preferred: is_avoided ? false : undefined
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as DieselSupplier;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all });
      toast({
        title: data.is_avoided ? "Marked to Avoid" : "No Longer Avoided",
        description: `${data.name} ${data.is_avoided ? "should be avoided" : "can be used again"}`,
        variant: data.is_avoided ? "destructive" : "default",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to bulk import suppliers
export const useBulkImportSuppliers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suppliers: CreateSupplierData[]) => {
      const { data, error } = await fromTable("diesel_suppliers")
        .insert(suppliers.map(s => ({ ...s, is_active: true })))
        .select();

      if (error) throw error;
      return data as DieselSupplier[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all });
      toast({
        title: "Import Successful",
        description: `${data.length} suppliers imported successfully`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    },
  });
};

// Hook to get unique provinces for filtering
export const useProvinces = () => {
  return useQuery({
    queryKey: ["diesel-suppliers-provinces"],
    queryFn: async () => {
      const { data, error } = await fromTable("diesel_suppliers")
        .select("province")
        .eq("is_active", true)
        .not("province", "is", null);

      if (error) throw error;

      const provinces = [...new Set((data || []).map((s: { province: string }) => s.province))].sort();
      return provinces as string[];
    },
  });
};

// Utility function to parse the FillingStations.md data
export const parseFillingStationsData = (mdContent: string): CreateSupplierData[] => {
  const lines = mdContent.trim().split("\n");
  const suppliers: CreateSupplierData[] = [];

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse tab-separated or space-separated values
    const parts = line.split("\t").length > 1 ? line.split("\t") : line.split(/\s{2,}/);

    if (parts.length >= 4) {
      const name = parts[0]?.trim();
      const locationUrl = parts[1]?.trim();
      const address = parts[2]?.trim();
      const priceStr = parts[3]?.trim();

      // Parse price (remove 'R' and convert to number)
      const price = parseFloat(priceStr?.replace(/[R,]/g, "") || "0");

      // Extract province from address
      const addressParts = address?.split(",") || [];
      const province = addressParts.length > 3 ? addressParts[addressParts.length - 2]?.trim() : null;
      const location = addressParts.length > 1 ? addressParts[1]?.trim() : addressParts[0]?.trim();

      if (name && price > 0) {
        suppliers.push({
          name,
          location: location || name,
          address,
          province: province || undefined,
          google_maps_url: locationUrl?.startsWith("http") ? locationUrl : undefined,
          current_price_per_liter: price,
          has_truck_facilities: true,
        });
      }
    }
  }

  return suppliers;
};