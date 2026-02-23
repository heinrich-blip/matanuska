# Phase 2 & 4 Implementation Guide

**Live Vehicle Tracking & Analytics System**

---

## Overview

This guide covers the implementation of:

- **Phase 2**: Live vehicle tracking during deliveries with GPS breadcrumbs, ETA calculations, and geofencing
- **Phase 4**: Comprehensive analytics for delivery performance, driver behavior, costs, and customer insights

---

## Database Schema Applied

### Phase 2 Tables (Migration: `20251104000005_phase2_live_tracking.sql`)

#### 1. `delivery_tracking`

**Purpose**: GPS breadcrumb trail during active deliveries

**Key Columns**:

- `load_id`, `vehicle_id` - References to loads and vehicles
- `latitude`, `longitude`, `altitude`, `speed`, `heading` - GPS data
- `distance_from_origin_km`, `distance_to_destination_km`, `distance_traveled_km` - Distance calculations
- `is_moving`, `idle_duration_minutes` - Movement status
- `data_source` - 'wialon', 'mobile_app', or 'manual'

**Indexes**: On load_id, vehicle_id, recorded_at, and coordinates for fast lookups

#### 2. `delivery_events`

**Purpose**: Key lifecycle events (started, arrived, loaded, completed, etc.)

**Event Types**:

- `started` - Delivery began
- `arrived_origin` - Arrived at pickup location
- `loaded` - Cargo loaded
- `departed_origin` - Left pickup location
- `rest_stop` - Driver rest break
- `fuel_stop` - Refueling stop
- `arrived_destination` - Arrived at delivery location
- `unloaded` - Cargo unloaded
- `completed` - Delivery finished
- `delayed` - Unexpected delay
- `diverted` - Route deviation

**Features**: Supports photos, signatures, and GPS coordinates for each event

#### 3. `delivery_eta`

**Purpose**: Calculated ETAs vs actual arrival times

**Calculation Methods**:

- `gps_based` - Based on current position and speed
- `historical` - Based on historical data
- `traffic_based` - Includes traffic conditions
- `manual` - Manually entered

**Features**: Tracks confidence level, factors (traffic, weather, rest stops)

#### 4. `geofence_zones`

**Purpose**: Define geographic zones for entry/exit alerts

**Zone Types**:

- `customer` - Customer locations
- `border` - Border crossings
- `depot` - Company depots
- `restricted` - Restricted areas
- `rest_area` - Rest stops
- `custom` - Custom zones

**Features**:

- Circular zones (center + radius)
- Alert on entry, exit, or excessive dwell time
- Email notifications
- Link to predefined_locations

#### 5. `geofence_events`

**Purpose**: Log when vehicles enter/exit zones

**Event Types**: `entered`, `exited`, `dwell_exceeded`

---

### Phase 4 Tables (Migration: `20251104000006_phase4_analytics.sql`)

#### 1. `delivery_performance`

**Purpose**: Comprehensive performance metrics per delivery

**Key Metrics**:

- **Timing**: Scheduled vs actual pickup/delivery times
- **Duration Breakdown**: Driving, idle, rest stops, loading/unloading
- **Distance**: Planned vs actual distance, deviation
- **Speed**: Average, max, overspeeding duration
- **Performance Indicators**: On-time status, early/late minutes
- **Efficiency Scores**: Route (0-100), time (0-100), fuel (0-100), overall (0-100)
- **Incidents**: Harsh braking, acceleration, speeding, unauthorized stops
- **Costs**: Fuel, tolls, labor, total cost, cost per km
- **Customer Satisfaction**: Rating (1-5 stars), feedback

#### 2. `driver_behavior`

**Purpose**: Track driver behavior patterns per trip

**Behavior Metrics**:

- **Driving Events**: Harsh braking, acceleration, cornering
- **Speed Behavior**: Speeding duration, violations, max speed
- **Idling**: Total idle time, excessive idle events
- **Night Driving**: Minutes driven between 10pm-5am
- **Fatigue**: Continuous driving time, rest breaks, fatigue risk score
- **Safety Score**: Overall 0-100 (100 = excellent)
- **Efficiency**: Fuel rating, route adherence percentage

#### 3. `route_efficiency`

**Purpose**: Compare planned vs actual routes

**Analysis**:

- Route deviation (km and percentage)
- Time variance (estimated vs actual)
- Delay breakdown (traffic, weather, breakdown, border, detours)
- Waypoint compliance
- Route optimization score
- Potential savings calculations

#### 4. `delivery_costs`

**Purpose**: Detailed cost breakdown and profitability

**Cost Categories**:

- **Fuel**: Consumption, price per liter, total, cost per km
- **Tolls**: Number of gates, total cost, locations
- **Labor**: Hours, hourly rate, overtime, total
- **Vehicle**: Depreciation, maintenance, tire wear
- **Administrative**: Insurance, permits
- **Revenue & Profitability**: Revenue, profit margin, profit percentage

#### 5. `customer_delivery_analytics`

**Purpose**: Aggregated delivery performance per customer

**Customer Metrics**:

- Total/on-time/late/failed deliveries
- On-time percentage
- Average delivery time and distance
- Cost and revenue totals
- Average rating and complaints
- Last delivery date

#### 6. `delivery_dashboard_summary` (Materialized View)

**Purpose**: Pre-calculated dashboard metrics for fast loading

**Refresh**: Should be refreshed periodically (e.g., every hour)

```sql
REFRESH MATERIALIZED VIEW delivery_dashboard_summary;
```

---

## Database Functions

### Phase 2 Functions

#### `calculate_delivery_eta(p_load_id UUID)`

**Purpose**: Calculate estimated arrival time based on current position and average speed

**Algorithm**:

1. Get latest tracking position
2. Get destination coordinates
3. Calculate remaining distance using Haversine formula
4. Calculate average speed from last 30 minutes
5. Estimate duration = distance / speed
6. Store calculation in `delivery_eta` table

**Trigger**: Auto-runs every 5 tracking points via `trigger_update_eta()`

#### `check_geofence_entry(p_vehicle_id, p_latitude, p_longitude)`

**Purpose**: Check if vehicle entered any geofence zones

**Process**:

1. Get active load for vehicle
2. Loop through all active geofence zones
3. Calculate distance from zone center
4. If within radius, check if new entry (not logged in last hour)
5. Log entry event in `geofence_events`

**Trigger**: Auto-runs on every tracking point insert

### Phase 4 Functions

#### `calculate_performance_score(p_load_id UUID)`

**Purpose**: Calculate overall performance score (0-100)

**Scoring**:

- **Time Score (40% weight)**: 100 if on time, -10 per 10 minutes late
- **Route Score (30% weight)**: 100 - (deviation percentage \* 100)
- **Safety Score (30% weight)**: 100 - (incidents \* 10)
- **Overall**: Weighted average

#### `generate_customer_analytics(p_customer_name, p_period_start, p_period_end)`

**Purpose**: Generate aggregated analytics for a customer over a period

**Calculates**:

- Total/on-time/late/failed delivery counts
- Average delivery time, distance, cost
- Average customer rating
- On-time percentage

**Usage**: Run monthly/quarterly to populate `customer_delivery_analytics` table

#### `calculate_cost_per_km(p_load_id UUID)`

**Purpose**: Calculate cost per kilometer for a delivery

**Formula**: `total_cost / actual_distance_km`

---

## Frontend Components Created

### 1. `LiveDeliveryTracking.tsx`

**Location**: `/src/components/loads/LiveDeliveryTracking.tsx`

**Purpose**: Real-time tracking view for active deliveries

**Features**:

- ✅ Current GPS position with lat/lng, speed, heading
- ✅ Live ETA calculations with confidence level
- ✅ Distance progress (from origin, to destination, total traveled)
- ✅ Movement status (moving/stationary) with idle time
- ✅ Timeline of delivery events with icons
- ✅ Auto-refresh every 10 seconds (toggle on/off)
- ✅ Supabase real-time subscription for instant updates
- ✅ Manual refresh button

**Usage**:

```tsx
<LiveDeliveryTracking loadId="uuid-of-active-load" />
```

**Props**:

- `loadId: string` - UUID of the load to track

### 2. `DeliveryAnalyticsDashboard.tsx`

**Location**: `/src/components/analytics/DeliveryAnalyticsDashboard.tsx`

**Purpose**: Comprehensive analytics dashboard

**Features**:

- ✅ Summary cards: On-time rate, avg performance, total costs, customer rating
- ✅ **Performance Tab**: Recent deliveries with scores, on-time status, distances
- ✅ **Drivers Tab**: Safety scores, incident counts, fuel efficiency ratings
- ✅ **Costs Tab**: Fuel, labor, total costs, profit margins
- ✅ **Customers Tab**: On-time %, ratings, revenue, avg costs per customer

**Data Sources**:

- `delivery_dashboard_summary` materialized view
- `delivery_performance` table
- `driver_behavior` table
- `delivery_costs` table
- `customer_delivery_analytics` table

### 3. `Analytics.tsx` Page

**Location**: `/src/pages/Analytics.tsx`

**Purpose**: Route page for analytics dashboard

**Access**: Navigate to `/analytics` (needs route setup)

---

## Integration Steps

### Step 1: Apply Database Migrations

**In Supabase SQL Editor**, run these migrations in order:

```sql
-- 1. Phase 2: Live Tracking Tables
-- Copy contents from: supabase/migrations/20251104000005_phase2_live_tracking.sql
-- Execute in SQL Editor

-- 2. Phase 4: Analytics Tables
-- Copy contents from: supabase/migrations/20251104000006_phase4_analytics.sql
-- Execute in SQL Editor
```

**Verify migrations**:

```sql
-- Check tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'delivery_tracking',
    'delivery_events',
    'delivery_eta',
    'geofence_zones',
    'geofence_events',
    'delivery_performance',
    'driver_behavior',
    'route_efficiency',
    'delivery_costs',
    'customer_delivery_analytics'
  );

-- Check materialized view
SELECT * FROM delivery_dashboard_summary;
```

### Step 2: Regenerate TypeScript Types

```bash
cd /workspaces/car-craft-co
npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
```

### Step 3: Enable Realtime for New Tables

**In Supabase SQL Editor**:

```sql
-- Enable realtime for tracking tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_eta;
ALTER PUBLICATION supabase_realtime ADD TABLE public.geofence_events;
```

### Step 4: Add Analytics Route

**Edit `src/App.tsx`**:

```tsx
import Analytics from "@/pages/Analytics";

// Inside <Routes>:
<Route
  path="/analytics"
  element={
    <ProtectedRoute>
      <Analytics />
    </ProtectedRoute>
  }
/>;
```

### Step 5: Add Navigation Link

**Edit `src/components/Layout.tsx`** to add Analytics link to sidebar:

```tsx
import { BarChart3 } from "lucide-react";

// In navigation array:
{
  name: "Analytics",
  href: "/analytics",
  icon: BarChart3,
}
```

### Step 6: Add Live Tracking to Load Management

**Edit `src/pages/LoadManagement.tsx`** to show live tracking for in-transit loads:

```tsx
import { LiveDeliveryTracking } from "@/components/loads/LiveDeliveryTracking";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

// In load card actions:
{
  load.status === "in_transit" && (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MapPin className="h-4 w-4 mr-2" />
          Track Live
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <LiveDeliveryTracking loadId={load.id} />
      </DialogContent>
    </Dialog>
  );
}
```

---

## Wialon Integration - GPS Data Collection

### Automatic Tracking Data Collection

**Create a service to sync Wialon GPS data to `delivery_tracking` table**:

**File**: `/src/integrations/wialon/trackingSync.ts`

```typescript
import { supabase } from "@/integrations/supabase/client";
import { WialonService } from "./service";

export class WialonTrackingSync {
  private wialonService: WialonService;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.wialonService = new WialonService();
  }

  async syncActiveLoads() {
    // Get all in-transit loads
    const { data: loads, error } = await supabase
      .from("loads")
      .select("id, assigned_vehicle_id, vehicles!inner(wialon_unit_id)")
      .eq("status", "in_transit");

    if (error || !loads) return;

    for (const load of loads) {
      if (!load.assigned_vehicle_id) continue;

      try {
        // Get vehicle position from Wialon
        const units = await this.wialonService.getUnits();
        const unit = units.find((u) => u.id === load.vehicles.wialon_unit_id);

        if (unit && unit.pos) {
          // Insert tracking point
          await supabase.from("delivery_tracking").insert({
            load_id: load.id,
            vehicle_id: load.assigned_vehicle_id,
            latitude: unit.pos.y,
            longitude: unit.pos.x,
            speed: unit.pos.s,
            heading: unit.pos.c,
            recorded_at: new Date(unit.pos.t * 1000),
            data_source: "wialon",
            is_moving: unit.pos.s > 5, // Moving if speed > 5 km/h
          });
        }
      } catch (error) {
        console.error(`Error syncing load ${load.id}:`, error);
      }
    }
  }

  startAutoSync(intervalMs: number = 60000) {
    // Sync every 60 seconds by default
    this.syncInterval = setInterval(() => {
      this.syncActiveLoads();
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

// Usage in app:
export const trackingSync = new WialonTrackingSync();
```

**Initialize in `src/App.tsx`**:

```tsx
import { trackingSync } from "@/integrations/wialon/trackingSync";

useEffect(() => {
  // Start auto-sync when user is authenticated
  if (user) {
    trackingSync.startAutoSync(60000); // Every 60 seconds
  }

  return () => {
    trackingSync.stopAutoSync();
  };
}, [user]);
```

---

## Geofencing Setup

### Creating Geofence Zones

**Example**: Create zones for all predefined locations

```sql
-- Create geofence zones for all depot locations
INSERT INTO geofence_zones (
  name,
  description,
  zone_type,
  center_lat,
  center_lng,
  radius_meters,
  location_id,
  alert_on_entry,
  alert_on_exit
)
SELECT
  name,
  'Auto-generated zone for ' || name,
  location_type,
  latitude,
  longitude,
  500, -- 500 meter radius
  id,
  true,
  true
FROM predefined_locations
WHERE location_type IN ('depot', 'customer', 'border_post')
  AND is_active = true;
```

### Geofence Notifications

**Extend `check_geofence_entry()` function** to send notifications:

```sql
-- Add notification logic (example using Supabase Edge Functions)
CREATE OR REPLACE FUNCTION send_geofence_notification(
  p_event_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_event RECORD;
  v_zone RECORD;
BEGIN
  SELECT * INTO v_event
  FROM geofence_events
  WHERE id = p_event_id;

  SELECT * INTO v_zone
  FROM geofence_zones
  WHERE id = v_event.geofence_zone_id;

  -- Call Supabase Edge Function or external notification service
  -- Example: pg_net HTTP request (if enabled)

  UPDATE geofence_events
  SET notification_sent = true,
      notification_sent_at = NOW()
  WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Analytics Workflow

### Daily Analytics Generation

**Create a scheduled job** to generate analytics:

```sql
-- Example: Generate customer analytics for yesterday
SELECT generate_customer_analytics(
  customer_name,
  CURRENT_DATE - INTERVAL '1 day',
  CURRENT_DATE
)
FROM (
  SELECT DISTINCT customer_name
  FROM loads
  WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
) AS customers;

-- Refresh dashboard summary
REFRESH MATERIALIZED VIEW delivery_dashboard_summary;
```

**Schedule with Supabase pg_cron** (if available) or external cron job:

```sql
-- Requires pg_cron extension
SELECT cron.schedule(
  'daily-analytics-generation',
  '0 1 * * *', -- Every day at 1 AM
  $$
  REFRESH MATERIALIZED VIEW delivery_dashboard_summary;
  $$
);
```

---

## Testing Checklist

### Phase 2 - Live Tracking

- [ ] Create a test load and assign to vehicle
- [ ] Manually insert tracking points:
  ```sql
  INSERT INTO delivery_tracking (
    load_id,
    vehicle_id,
    latitude,
    longitude,
    speed,
    is_moving
  ) VALUES (
    'your-load-id',
    'your-vehicle-id',
    -26.2041,
    28.0473,
    60,
    true
  );
  ```
- [ ] Verify `LiveDeliveryTracking` component shows data
- [ ] Test auto-refresh toggle
- [ ] Insert delivery events and verify timeline display
- [ ] Test ETA calculation function manually:
  ```sql
  SELECT calculate_delivery_eta('your-load-id');
  SELECT * FROM delivery_eta WHERE load_id = 'your-load-id';
  ```
- [ ] Create geofence zone and test entry detection:

  ```sql
  INSERT INTO geofence_zones (name, zone_type, center_lat, center_lng, radius_meters)
  VALUES ('Test Zone', 'depot', -26.2041, 28.0473, 1000);

  -- Insert tracking point inside zone
  -- Check geofence_events table for entry event
  ```

### Phase 4 - Analytics

- [ ] Populate test performance data:
  ```sql
  INSERT INTO delivery_performance (
    load_id,
    vehicle_id,
    on_time,
    overall_performance_score,
    actual_distance_km,
    total_delivery_cost
  ) VALUES (
    'your-load-id',
    'your-vehicle-id',
    true,
    85,
    450.5,
    12500.00
  );
  ```
- [ ] Verify dashboard summary view updates:
  ```sql
  REFRESH MATERIALIZED VIEW delivery_dashboard_summary;
  SELECT * FROM delivery_dashboard_summary;
  ```
- [ ] Navigate to `/analytics` page
- [ ] Verify all tabs load data correctly
- [ ] Test performance score calculation:
  ```sql
  SELECT calculate_performance_score('your-load-id');
  ```
- [ ] Generate customer analytics:
  ```sql
  SELECT generate_customer_analytics(
    'Test Customer',
    '2025-11-01',
    '2025-11-30'
  );
  SELECT * FROM customer_delivery_analytics WHERE customer_name = 'Test Customer';
  ```

---

## Performance Optimization

### Indexes

All necessary indexes are created by migrations. **Monitor slow queries**:

```sql
-- Check slow queries
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000 -- Queries taking > 1 second
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Materialized View Refresh Strategy

**Option 1**: Scheduled refresh (every hour)

```sql
REFRESH MATERIALIZED VIEW delivery_dashboard_summary;
```

**Option 2**: On-demand refresh after data changes

```sql
-- Trigger refresh after major updates
CREATE OR REPLACE FUNCTION refresh_dashboard_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY delivery_dashboard_summary;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to delivery_performance table
CREATE TRIGGER refresh_summary_on_performance_update
  AFTER INSERT OR UPDATE ON delivery_performance
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_summary();
```

### Data Retention

**Archive old tracking data** to keep table sizes manageable:

```sql
-- Example: Delete tracking points older than 90 days
DELETE FROM delivery_tracking
WHERE recorded_at < NOW() - INTERVAL '90 days';

-- Keep events longer (365 days)
DELETE FROM delivery_events
WHERE event_timestamp < NOW() - INTERVAL '365 days';
```

---

## Future Enhancements

### Phase 2 Extensions

- [ ] **Map visualization**: Display tracking breadcrumbs on interactive map
- [ ] **Route playback**: Animate delivery journey on map
- [ ] **Traffic integration**: Use Google Maps/Waze API for traffic data
- [ ] **Weather integration**: Fetch weather conditions along route
- [ ] **Polygon geofences**: Support complex shapes, not just circles
- [ ] **Custom alerts**: SMS/WhatsApp notifications for geofence events

### Phase 4 Extensions

- [ ] **Predictive analytics**: ML models for ETA prediction
- [ ] **Benchmarking**: Compare performance against industry standards
- [ ] **Export reports**: PDF/Excel exports of analytics
- [ ] **Real-time dashboards**: WebSocket-powered live updates
- [ ] **Driver leaderboards**: Gamification with rankings
- [ ] **Cost forecasting**: Predict future costs based on trends

---

## Troubleshooting

### Issue: No tracking data showing

**Solution**:

1. Check if Wialon sync is running: `trackingSync.startAutoSync()`
2. Verify loads are in `in_transit` status
3. Check browser console for errors
4. Verify RLS policies allow access:
   ```sql
   SELECT * FROM delivery_tracking LIMIT 10;
   ```

### Issue: ETA not calculating

**Solution**:

1. Ensure trigger is installed: `SELECT * FROM pg_trigger WHERE tgname = 'update_eta_on_tracking';`
2. Manually trigger calculation: `SELECT calculate_delivery_eta('load-id');`
3. Check if destination coordinates are set in loads table

### Issue: Analytics dashboard empty

**Solution**:

1. Populate test data in `delivery_performance` table
2. Refresh materialized view: `REFRESH MATERIALIZED VIEW delivery_dashboard_summary;`
3. Check query errors in browser console
4. Verify date filters in queries

### Issue: Geofence events not logging

**Solution**:

1. Verify zones are active: `SELECT * FROM geofence_zones WHERE is_active = true;`
2. Check trigger is firing: Look for errors in Postgres logs
3. Test function manually:
   ```sql
   SELECT check_geofence_entry('vehicle-id', -26.2041, 28.0473);
   SELECT * FROM geofence_events ORDER BY created_at DESC LIMIT 10;
   ```

---

## Summary

**Phase 2 - Live Tracking** provides:
✅ Real-time GPS breadcrumb tracking
✅ Dynamic ETA calculations
✅ Delivery event timeline
✅ Geofencing with automatic alerts

**Phase 4 - Analytics** provides:
✅ Delivery performance metrics (scores, on-time %, efficiency)
✅ Driver behavior analysis (safety scores, incidents)
✅ Cost breakdown and profitability tracking
✅ Customer delivery analytics (ratings, on-time %)
✅ Pre-calculated dashboard for fast loading

**Next Steps**:

1. Apply both SQL migrations in Supabase
2. Regenerate TypeScript types
3. Enable realtime for new tables
4. Add analytics route to App.tsx
5. Initialize Wialon tracking sync
6. Test with sample data
7. Set up scheduled analytics generation

This implementation provides a complete foundation for monitoring deliveries in real-time and analyzing performance to continuously improve operations. 🚀
