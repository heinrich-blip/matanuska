import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch Wialon vehicles for trip assignment
 * Trips table references wialon_vehicles.id via foreign key
 *
 * Vehicles with negative wialon_unit_id values are fleet vehicles
 * without GPS tracking but included for trip/diesel record consistency.
 */
export const useWialonVehicles = () => {
  return useQuery({
    queryKey: ["wialon-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wialon_vehicles")
        .select("*")
        .order("fleet_number", { nullsFirst: false });

      if (error) throw error;

      // Sort by fleet number naturally (e.g., 4H, 6H, 21H, 22H, UD)
      const sorted = (data || []).sort((a, b) => {
        const aFleet = a.fleet_number || a.name || '';
        const bFleet = b.fleet_number || b.name || '';

        // Extract numeric part for natural sorting
        const aNum = parseInt(aFleet.replace(/\D/g, '')) || 999;
        const bNum = parseInt(bFleet.replace(/\D/g, '')) || 999;

        if (aNum !== bNum) return aNum - bNum;
        return aFleet.localeCompare(bFleet);
      });

      return sorted;
    },
  });
};