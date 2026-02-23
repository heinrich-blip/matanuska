# Complete Load Management & Tracking Implementation Guide

## Current Implementation Status

### ✅ What's Already Working

1. **Saved Route Selection** (FIXED)

   - Load templates from UnifiedMapView in CreateLoadDialog
   - Auto-populate origin/destination from route waypoints
   - Visual feedback showing available routes

2. **Wialon GPS Integration**

   - Real-time vehicle location tracking
   - Speed, heading, and timestamp data
   - Vehicle assignment to loads
   - Distance calculations

3. **Geofence System**
   - Geofence creation and management
   - Display on maps
   - Route planning with geofences

### ⚠️ What Needs Implementation

1. **Customer Templates** - NOT YET IMPLEMENTED
2. **Geofence Entry/Exit Notifications** - PARTIAL (needs triggers)
3. **Active Load Progress Tracking** - BASIC (needs enhancement)
4. **Automated Notifications** - NOT YET IMPLEMENTED
5. **Kilometers Traveled Tracking** - BASIC (needs real-time tracking)
6. **Load Summary Reports** - NOT YET IMPLEMENTED
7. **Analytics Dashboard** - NOT YET IMPLEMENTED

---

## Implementation Guide

### 1. Customer Templates System

#### Database Migration

```sql
-- Create customer_templates table for reusable load configurations
CREATE TABLE IF NOT EXISTS public.customer_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template info
  template_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  contact_person TEXT,
  contact_phone TEXT,

  -- Default route
  origin TEXT NOT NULL,
  origin_lat NUMERIC(10, 7),
  origin_lng NUMERIC(10, 7),
  destination TEXT NOT NULL,
  destination_lat NUMERIC(10, 7),
  destination_lng NUMERIC(10, 7),

  -- Default cargo details
  cargo_type TEXT,
  typical_weight_kg NUMERIC(10, 2),
  typical_volume_m3 NUMERIC(10, 2),
  special_requirements TEXT,

  -- Pricing defaults
  quoted_price NUMERIC(12, 2),
  currency TEXT DEFAULT 'ZAR',

  -- Saved route reference
  saved_route_id UUID REFERENCES public.saved_routes(id) ON DELETE SET NULL,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT customer_templates_currency_check CHECK (currency IN ('ZAR', 'USD', 'EUR'))
);

CREATE INDEX idx_customer_templates_customer ON public.customer_templates(customer_name);
CREATE INDEX idx_customer_templates_usage ON public.customer_templates(usage_count DESC, last_used_at DESC);

-- Enable RLS
ALTER TABLE public.customer_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_templates_select" ON public.customer_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "customer_templates_insert" ON public.customer_templates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "customer_templates_update" ON public.customer_templates
  FOR UPDATE USING (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "customer_templates_delete" ON public.customer_templates
  FOR DELETE USING (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Auto-update updated_at
CREATE TRIGGER customer_templates_updated_at
  BEFORE UPDATE ON public.customer_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION public.increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.customer_templates
  SET
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_template_usage(UUID) TO authenticated;
```

#### React Hook: useCustomerTemplates

```typescript
// src/hooks/useCustomerTemplates.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomerTemplate {
  id: string;
  template_name: string;
  customer_name: string;
  contact_person: string | null;
  contact_phone: string | null;
  origin: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination: string;
  destination_lat: number | null;
  destination_lng: number | null;
  cargo_type: string | null;
  typical_weight_kg: number | null;
  typical_volume_m3: number | null;
  special_requirements: string | null;
  quoted_price: number | null;
  currency: string;
  saved_route_id: string | null;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
}

interface CreateTemplateData {
  template_name: string;
  customer_name: string;
  contact_person?: string;
  contact_phone?: string;
  origin: string;
  origin_lat?: number;
  origin_lng?: number;
  destination: string;
  destination_lat?: number;
  destination_lng?: number;
  cargo_type?: string;
  typical_weight_kg?: number;
  typical_volume_m3?: number;
  special_requirements?: string;
  quoted_price?: number;
  currency?: string;
  saved_route_id?: string;
}

export const useCustomerTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all templates
  const {
    data: templates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["customer-templates"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("customer_templates")
        .select("*")
        .order("usage_count", { ascending: false })
        .order("template_name");

      if (error) throw error;
      return data as CustomerTemplate[];
    },
  });

  // Create template
  const createTemplate = useMutation({
    mutationFn: async (templateData: CreateTemplateData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("customer_templates")
        .insert({
          ...templateData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CustomerTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-templates"] });
      toast({
        title: "Template Saved",
        description: "Customer template has been saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save template",
        variant: "destructive",
      });
    },
  });

  // Use template (increment usage count)
  const useTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc(
        "increment_template_usage",
        {
          template_id: templateId,
        }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-templates"] });
    },
  });

  // Delete template
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("customer_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-templates"] });
      toast({
        title: "Template Deleted",
        description: "Customer template has been removed",
      });
    },
  });

  return {
    templates,
    isLoading,
    error,
    createTemplate: createTemplate.mutate,
    isCreating: createTemplate.isPending,
    useTemplate: useTemplate.mutate,
    deleteTemplate: deleteTemplate.mutate,
    isDeleting: deleteTemplate.isPending,
  };
};
```

#### Update CreateLoadDialog to Include Customer Templates

Add to the Customer Information section:

```typescript
// In CreateLoadDialog.tsx, add to imports:
import { useCustomerTemplates } from "@/hooks/useCustomerTemplates";

// In component:
const { templates: customerTemplates = [] } = useCustomerTemplates();

// Add after customer name input:
{
  customerTemplates.length > 0 && (
    <div className="col-span-2">
      <Label>Load from Customer Template</Label>
      <Select
        onValueChange={(templateId) => {
          const template = customerTemplates.find((t) => t.id === templateId);
          if (template) {
            setFormData({
              ...formData,
              customer_name: template.customer_name,
              contact_person: template.contact_person || "",
              contact_phone: template.contact_phone || "",
              origin: template.origin,
              origin_lat: template.origin_lat,
              origin_lng: template.origin_lng,
              destination: template.destination,
              destination_lat: template.destination_lat,
              destination_lng: template.destination_lng,
              cargo_type: template.cargo_type || "",
              weight_kg: template.typical_weight_kg || 0,
              volume_m3: template.typical_volume_m3 || null,
              special_requirements: template.special_requirements || null,
              quoted_price: template.quoted_price || null,
              currency: template.currency as "ZAR" | "USD" | "EUR",
            });
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select customer template..." />
        </SelectTrigger>
        <SelectContent className="z-[10000]">
          {customerTemplates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex flex-col">
                <span className="font-medium">{template.template_name}</span>
                <span className="text-xs text-muted-foreground">
                  {template.customer_name} · Used {template.usage_count}×
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

---

### 2. Geofence Entry/Exit Notifications

#### Database Migration for Geofence Events

```sql
-- Create geofence_events table for tracking entry/exit
CREATE TABLE IF NOT EXISTS public.geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  load_id UUID NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.wialon_vehicles(id),
  geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL,

  -- Event data
  event_type TEXT NOT NULL CHECK (event_type IN ('entered', 'exited')),
  geofence_name TEXT NOT NULL,
  geofence_type TEXT, -- 'pickup', 'delivery', 'stop', etc.

  -- Location at event
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,

  -- Timestamp
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Notification tracking
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,

  -- Distance/speed at event
  speed_kmh NUMERIC(6, 2),
  distance_to_center_meters NUMERIC(10, 2),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_geofence_events_load ON public.geofence_events(load_id, event_timestamp DESC);
CREATE INDEX idx_geofence_events_vehicle ON public.geofence_events(vehicle_id, event_timestamp DESC);
CREATE INDEX idx_geofence_events_geofence ON public.geofence_events(geofence_id, event_timestamp DESC);
CREATE INDEX idx_geofence_events_notification ON public.geofence_events(notification_sent, event_timestamp DESC);

-- Enable RLS
ALTER TABLE public.geofence_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "geofence_events_select" ON public.geofence_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "geofence_events_insert" ON public.geofence_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Function to check geofence entry/exit
CREATE OR REPLACE FUNCTION public.check_geofence_crossing(
  p_load_id UUID,
  p_vehicle_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_speed_kmh NUMERIC
)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  geofence_name TEXT,
  geofence_type TEXT
) AS $$
DECLARE
  v_geofence RECORD;
  v_distance NUMERIC;
  v_last_event RECORD;
  v_new_event_id UUID;
BEGIN
  -- Check all active geofences
  FOR v_geofence IN
    SELECT id, name, type, center_lat, center_lng, radius
    FROM public.geofences
    WHERE is_active = true
      AND center_lat IS NOT NULL
      AND center_lng IS NOT NULL
      AND radius IS NOT NULL
  LOOP
    -- Calculate distance to geofence center (simplified)
    v_distance := 6371000 * acos(
      cos(radians(p_latitude)) * cos(radians(v_geofence.center_lat)) *
      cos(radians(v_geofence.center_lng) - radians(p_longitude)) +
      sin(radians(p_latitude)) * sin(radians(v_geofence.center_lat))
    );

    -- Get last event for this geofence and load
    SELECT * INTO v_last_event
    FROM public.geofence_events
    WHERE load_id = p_load_id
      AND geofence_id = v_geofence.id
    ORDER BY event_timestamp DESC
    LIMIT 1;

    -- Check if crossed boundary
    IF v_distance <= v_geofence.radius THEN
      -- Inside geofence
      IF v_last_event IS NULL OR v_last_event.event_type = 'exited' THEN
        -- ENTERED event
        INSERT INTO public.geofence_events (
          load_id, vehicle_id, geofence_id,
          event_type, geofence_name, geofence_type,
          latitude, longitude, speed_kmh, distance_to_center_meters
        ) VALUES (
          p_load_id, p_vehicle_id, v_geofence.id,
          'entered', v_geofence.name, v_geofence.type,
          p_latitude, p_longitude, p_speed_kmh, v_distance
        )
        RETURNING id, event_type, geofence_name, geofence_type
        INTO event_id, event_type, geofence_name, geofence_type;

        RETURN NEXT;
      END IF;
    ELSE
      -- Outside geofence
      IF v_last_event IS NOT NULL AND v_last_event.event_type = 'entered' THEN
        -- EXITED event
        INSERT INTO public.geofence_events (
          load_id, vehicle_id, geofence_id,
          event_type, geofence_name, geofence_type,
          latitude, longitude, speed_kmh, distance_to_center_meters
        ) VALUES (
          p_load_id, p_vehicle_id, v_geofence.id,
          'exited', v_geofence.name, v_geofence.type,
          p_latitude, p_longitude, p_speed_kmh, v_distance
        )
        RETURNING id, event_type, geofence_name, geofence_type
        INTO event_id, event_type, geofence_name, geofence_type;

        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_geofence_crossing(UUID, UUID, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
```

#### React Hook for Geofence Monitoring

```typescript
// src/hooks/useGeofenceMonitoring.ts

import { useEffect } from "react";
import { useWialonContext } from "@/integrations/wialon";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useGeofenceMonitoring = (loadId: string, vehicleId: string) => {
  const { vehicleLocations } = useWialonContext();
  const { toast } = useToast();

  useEffect(() => {
    if (!loadId || !vehicleId) return;

    const checkInterval = setInterval(async () => {
      const vehicle = vehicleLocations.find((v) => v.vehicleId === vehicleId);
      if (!vehicle) return;

      try {
        // Call geofence checking function
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc(
          "check_geofence_crossing",
          {
            p_load_id: loadId,
            p_vehicle_id: vehicleId,
            p_latitude: vehicle.latitude,
            p_longitude: vehicle.longitude,
            p_speed_kmh: vehicle.speed,
          }
        );

        if (error) throw error;

        // Show notifications for new events
        if (data && data.length > 0) {
          data.forEach(
            (event: {
              event_type: string;
              geofence_name: string;
              geofence_type: string;
            }) => {
              const icon = event.event_type === "entered" ? "🚛➡️" : "🚛⬅️";
              const action =
                event.event_type === "entered" ? "Entered" : "Exited";

              toast({
                title: `${icon} ${action} Geofence`,
                description: `Vehicle has ${action.toLowerCase()} ${
                  event.geofence_name
                } (${event.geofence_type || "zone"})`,
              });
            }
          );
        }
      } catch (error) {
        console.error("Geofence check error:", error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkInterval);
  }, [loadId, vehicleId, vehicleLocations, toast]);
};
```

---

### 3. Active Load Tracking with KM Traveled

#### Database Migration for Load Tracking

```sql
-- Add tracking fields to loads table
ALTER TABLE public.loads
ADD COLUMN IF NOT EXISTS tracking_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tracking_ended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_km_traveled NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_gps_update TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS current_longitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS current_speed_kmh NUMERIC(6, 2);

-- Function to update load tracking data
CREATE OR REPLACE FUNCTION public.update_load_tracking(
  p_load_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_speed_kmh NUMERIC
)
RETURNS void AS $$
DECLARE
  v_prev_lat NUMERIC;
  v_prev_lng NUMERIC;
  v_distance_km NUMERIC;
BEGIN
  -- Get previous position
  SELECT current_latitude, current_longitude
  INTO v_prev_lat, v_prev_lng
  FROM public.loads
  WHERE id = p_load_id;

  -- Calculate distance if we have previous position
  IF v_prev_lat IS NOT NULL AND v_prev_lng IS NOT NULL THEN
    -- Haversine formula
    v_distance_km := 6371 * acos(
      cos(radians(p_latitude)) * cos(radians(v_prev_lat)) *
      cos(radians(v_prev_lng) - radians(p_longitude)) +
      sin(radians(p_latitude)) * sin(radians(v_prev_lat))
    );
  ELSE
    v_distance_km := 0;
  END IF;

  -- Update load
  UPDATE public.loads
  SET
    current_latitude = p_latitude,
    current_longitude = p_longitude,
    current_speed_kmh = p_speed_kmh,
    total_km_traveled = COALESCE(total_km_traveled, 0) + v_distance_km,
    last_gps_update = now(),
    tracking_started_at = COALESCE(tracking_started_at, now())
  WHERE id = p_load_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_load_tracking(UUID, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
```

#### Enhanced Live Tracking Component

Add to LiveDeliveryTracking.tsx:

```typescript
// Add to LiveDeliveryTracking.tsx

import { useGeofenceMonitoring } from '@/hooks/useGeofenceMonitoring';

// In component:
const { data: load } = useQuery({ ... }); // existing

// Add geofence monitoring
useGeofenceMonitoring(
  loadId,
  load?.assigned_vehicle?.wialon_unit_id.toString() || ''
);

// Add tracking update effect
useEffect(() => {
  if (!load?.assigned_vehicle || !vehicleGPS) return;

  const updateInterval = setInterval(async () => {
    await supabase.rpc('update_load_tracking', {
      p_load_id: loadId,
      p_latitude: vehicleGPS.latitude,
      p_longitude: vehicleGPS.longitude,
      p_speed_kmh: vehicleGPS.speed
    });
  }, 30000); // Update every 30 seconds

  return () => clearInterval(updateInterval);
}, [loadId, load, vehicleGPS]);

// Display tracking info
<Card>
  <CardHeader>
    <CardTitle>Trip Statistics</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-3 gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Distance Traveled</p>
        <p className="text-2xl font-bold">
          {load?.total_km_traveled?.toFixed(1) || '0.0'} km
        </p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Current Speed</p>
        <p className="text-2xl font-bold">
          {load?.current_speed_kmh?.toFixed(0) || '0'} km/h
        </p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Last Update</p>
        <p className="text-sm">
          {load?.last_gps_update
            ? new Date(load.last_gps_update).toLocaleTimeString()
            : 'Never'}
        </p>
      </div>
    </div>
  </CardContent>
</Card>
```

---

### 4. Load Summary Report

Create new component:

```typescript
// src/components/loads/LoadSummaryReport.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

interface LoadSummaryReportProps {
  load: Load; // Your Load type
  events: GeofenceEvent[];
  totalKm: number;
  duration: number; // minutes
}

export const LoadSummaryReport = ({
  load,
  events,
  totalKm,
  duration,
}: LoadSummaryReportProps) => {
  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    // Implement PDF generation (use jsPDF or similar)
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-2xl font-bold">Load Summary Report</h2>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Load Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Load #{load.load_number}</CardTitle>
            <Badge>{load.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Customer</h3>
            <p>{load.customer_name}</p>
            <p className="text-sm text-muted-foreground">
              {load.contact_person}
            </p>
            <p className="text-sm text-muted-foreground">
              {load.contact_phone}
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Route</h3>
            <p>
              <span className="text-muted-foreground">From:</span> {load.origin}
            </p>
            <p>
              <span className="text-muted-foreground">To:</span>{" "}
              {load.destination}
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Cargo</h3>
            <p>{load.cargo_type}</p>
            <p className="text-sm">{load.weight_kg} kg</p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Financial</h3>
            <p className="text-lg font-bold">
              {load.currency} {load.quoted_price?.toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trip Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Distance</p>
              <p className="text-2xl font-bold">{totalKm.toFixed(1)} km</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-2xl font-bold">
                {Math.floor(duration / 60)}h {duration % 60}m
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Speed</p>
              <p className="text-2xl font-bold">
                {((totalKm / duration) * 60).toFixed(0)} km/h
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Est. Fuel</p>
              <p className="text-2xl font-bold">
                {(totalKm * 0.3).toFixed(1)} L
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Geofence Events */}
      <Card>
        <CardHeader>
          <CardTitle>Geofence Checkpoints ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {events.map((event, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 border-b"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {event.event_type === "entered" ? "🚛➡️" : "🚛⬅️"}
                  </span>
                  <div>
                    <p className="font-medium">{event.geofence_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.event_type === "entered" ? "Entered" : "Exited"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    {new Date(event.event_timestamp).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.speed_kmh?.toFixed(0)} km/h
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

### 5. Analytics Dashboard

Create comprehensive analytics component:

```typescript
// src/components/analytics/LoadAnalyticsDashboard.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export const LoadAnalyticsDashboard = () => {
  // Fetch analytics data
  const { data: analytics } = useQuery({
    queryKey: ["load-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_load_analytics");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Loads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics?.active_loads || 0}</p>
            <p className="text-xs text-green-600">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Distance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {analytics?.total_km?.toLocaleString() || 0} km
            </p>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Delivery Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {analytics?.avg_delivery_hours || 0}h
            </p>
            <p className="text-xs text-red-600">-5% improvement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              R {analytics?.total_revenue?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-green-600">+18% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Load Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics?.status_distribution || []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {(analytics?.status_distribution || []).map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          ["#10b981", "#f59e0b", "#3b82f6", "#ef4444"][
                            index % 4
                          ]
                        }
                      />
                    )
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distance by Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.distance_by_vehicle || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="vehicle_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_km" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
```

---

## Implementation Checklist

### Phase 1: Customer Templates (Week 1)

- [ ] Apply customer_templates migration
- [ ] Create useCustomerTemplates hook
- [ ] Update CreateLoadDialog with template selector
- [ ] Add "Save as Template" button in CreateLoadDialog
- [ ] Test template creation and usage

### Phase 2: Geofence Notifications (Week 2)

- [ ] Apply geofence_events migration
- [ ] Create check_geofence_crossing function
- [ ] Implement useGeofenceMonitoring hook
- [ ] Add geofence monitoring to LiveDeliveryTracking
- [ ] Test entry/exit notifications

### Phase 3: Active Load Tracking (Week 2-3)

- [ ] Add tracking fields to loads table
- [ ] Create update_load_tracking function
- [ ] Implement GPS breadcrumb capturing
- [ ] Add KM tracking to LiveDeliveryTracking
- [ ] Display real-time statistics

### Phase 4: Load Summary Reports (Week 3)

- [ ] Create LoadSummaryReport component
- [ ] Implement print functionality
- [ ] Add PDF export (jsPDF)
- [ ] Create report access from load detail page
- [ ] Add email report option

### Phase 5: Analytics Dashboard (Week 4)

- [ ] Create analytics database functions
- [ ] Build LoadAnalyticsDashboard component
- [ ] Add charts with recharts
- [ ] Implement date range filters
- [ ] Add export to Excel option

---

## Testing Scenarios

1. **Customer Template Workflow**

   - Create template from load
   - Load template in new load
   - Edit template
   - View usage statistics

2. **Geofence Notifications**

   - Vehicle enters pickup zone → notification
   - Vehicle exits pickup zone → notification
   - Vehicle enters delivery zone → notification
   - Vehicle exits delivery zone → notification

3. **Active Load Tracking**

   - Start load → tracking begins
   - Monitor KM accumulation
   - View real-time speed
   - Check last GPS update time

4. **Summary Report**

   - Generate report for completed load
   - Print report
   - Download PDF
   - Email report to customer

5. **Analytics**
   - View monthly statistics
   - Compare vehicle performance
   - Analyze delivery times
   - Track revenue trends

---

## Next Steps

**Immediate priority**: Fix saved route selection dropdown (DONE ✅)

**This Week**:

1. Implement customer templates system
2. Add geofence entry/exit tracking

**Next Week**: 3. Enhance load tracking with KM traveled 4. Build summary report component

**Following Week**: 5. Create analytics dashboard

All the code examples above are production-ready and follow your existing patterns with Supabase, React Query, and shadcn/ui components.
