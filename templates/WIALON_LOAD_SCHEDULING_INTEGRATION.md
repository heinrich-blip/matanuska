# Wialon Load Scheduling Integration - Complete Implementation Guide

## 🎯 Overview

This guide connects your **Load Planning Calendar** with **Wialon Active Tracking** and **Geofence-Based Automation** to enable:

1. ✅ Schedule loads via calendar (drag-and-drop)
2. ✅ Assign vehicles to scheduled loads
3. ✅ Track vehicles in real-time via Wialon
4. ✅ Auto-update load status when entering/exiting geofences
5. ✅ Send alerts when vehicles arrive at loading/unloading points

---

## 📋 Current Status Assessment

### ✅ What's Already Built

| Component                   | Status      | Location                    |
| --------------------------- | ----------- | --------------------------- |
| **Calendar UI**             | ✅ Complete | `LoadPlanningCalendar.tsx`  |
| **Event Dialog**            | ✅ Complete | `EventDialog.tsx`           |
| **Vehicle Allocation View** | ✅ Complete | `VehicleAllocationView.tsx` |
| **Wialon Connection**       | ✅ Working  | `WialonProvider.tsx`        |
| **Geofence Display**        | ✅ Working  | `GeofenceDisplay.tsx`       |
| **Live Tracking UI**        | ✅ Working  | `LiveDeliveryTracking.tsx`  |

### ⚠️ What Needs Implementation

| Feature                      | Status         | Priority    |
| ---------------------------- | -------------- | ----------- |
| **Database Migration**       | ❌ Not Applied | 🔴 CRITICAL |
| **Load Assignment Workflow** | ❌ Missing     | 🔴 CRITICAL |
| **Geofence Automation**      | ❌ Partial     | 🟡 HIGH     |
| **Status Auto-Updates**      | ❌ Missing     | 🟡 HIGH     |
| **Notification System**      | ❌ Missing     | 🟢 MEDIUM   |

---

## 🚀 Implementation Roadmap

### **STEP 1: Apply Database Migration** 🔴 CRITICAL

**Why**: The calendar creates records in `calendar_events` table which doesn't exist yet.

#### 1.1 Check Current State

Run in **Supabase SQL Editor**:

```sql
-- Check if calendar_events table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'calendar_events'
);
```

**If returns `false`**, proceed to 1.2.

#### 1.2 Apply Migration

Copy the contents of `/workspaces/car-craft-co/supabase/migrations/20251111000004_phase3_4_planning_analytics.sql` and run in Supabase SQL Editor.

#### 1.3 Regenerate TypeScript Types

```bash
cd /workspaces/car-craft-co
npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
```

#### 1.4 Verify

```sql
-- Should return rows
SELECT * FROM calendar_events LIMIT 1;
SELECT * FROM vehicle_capacity_snapshots LIMIT 1;
```

---

### **STEP 2: Implement Load-to-Vehicle Assignment Bridge** 🔴 CRITICAL

**Problem**: When you create a `calendar_event` with a `load_id` and `assigned_vehicle_id`, the **loads table** doesn't update automatically.

**Solution**: Create a database trigger to sync calendar events → loads.

#### 2.1 Create Trigger Migration

Create file: `/workspaces/car-craft-co/supabase/migrations/20251111000005_calendar_load_sync.sql`

```sql
-- ============================================================================
-- CALENDAR TO LOAD SYNC TRIGGER
-- Automatically update loads table when calendar events are created/updated
-- ============================================================================

-- Function: Sync calendar event vehicle assignment to load
CREATE OR REPLACE FUNCTION sync_calendar_event_to_load()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process pickup/delivery events with load_id
  IF NEW.load_id IS NOT NULL AND NEW.event_type IN ('pickup', 'delivery') THEN

    -- Update the load with assigned vehicle and timing
    UPDATE loads
    SET
      assigned_vehicle_id = NEW.assigned_vehicle_id,
      status = CASE
        WHEN status = 'pending' AND NEW.assigned_vehicle_id IS NOT NULL THEN 'assigned'
        ELSE status
      END,
      pickup_datetime = CASE
        WHEN NEW.event_type = 'pickup' THEN NEW.start_time
        ELSE pickup_datetime
      END,
      delivery_datetime = CASE
        WHEN NEW.event_type = 'delivery' THEN NEW.start_time
        ELSE delivery_datetime
      END,
      updated_at = NOW()
    WHERE id = NEW.load_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Fire after calendar_event insert/update
CREATE TRIGGER trigger_sync_calendar_to_load
  AFTER INSERT OR UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION sync_calendar_event_to_load();

COMMENT ON FUNCTION sync_calendar_event_to_load() IS
  'Auto-sync calendar event assignments to loads table';
```

#### 2.2 Apply the Migration

Run the SQL above in Supabase SQL Editor.

---

### **STEP 3: Implement Geofence-Based Status Automation** 🟡 HIGH

**Goal**: Automatically update load status when vehicle enters/exits loading/unloading zones.

#### 3.1 Create Geofence Zones for Your Locations

First, ensure geofences exist for your pickup/delivery locations:

```sql
-- Check existing geofences
SELECT id, name, type, center_lat, center_lng, radius
FROM geofences
WHERE type IN ('warehouse', 'customer', 'depot')
LIMIT 10;
```

**If you don't have geofences**, create them:

```sql
-- Example: Create geofence for BV Farm (pickup location)
INSERT INTO geofences (name, type, description, center_lat, center_lng, radius, color, is_active)
VALUES
  ('BV Farm - Loading Zone', 'warehouse', 'Main loading point for BV produce',
   -17.8252, 31.0335, 500, '#4CAF50', true),

  ('CBC Farm - Loading Zone', 'warehouse', 'Main loading point for CBC produce',
   -17.8300, 31.0400, 500, '#4CAF50', true),

  ('Harare Distribution Center', 'customer', 'Main unloading point in Harare',
   -17.8292, 31.0522, 1000, '#2196F3', true),

  ('Bulawayo Depot', 'customer', 'Main unloading point in Bulawayo',
   -20.1520, 28.5790, 1000, '#2196F3', true);
```

#### 3.2 Create Enhanced Geofence Trigger

Create file: `/workspaces/car-craft-co/supabase/migrations/20251111000006_geofence_load_automation.sql`

```sql
-- ============================================================================
-- GEOFENCE-BASED LOAD STATUS AUTOMATION
-- Auto-update load status when vehicle enters/exits geofences
-- ============================================================================

-- Function: Update load status based on geofence events
CREATE OR REPLACE FUNCTION handle_geofence_load_automation()
RETURNS TRIGGER AS $$
DECLARE
  v_load RECORD;
  v_geofence RECORD;
  v_new_status TEXT;
BEGIN
  -- Only process entry events with load_id
  IF NEW.event_type = 'entered' AND NEW.load_id IS NOT NULL THEN

    -- Get load details
    SELECT * INTO v_load
    FROM loads
    WHERE id = NEW.load_id;

    -- Get geofence details
    SELECT * INTO v_geofence
    FROM geofences
    WHERE id = NEW.geofence_zone_id;

    -- Determine status update based on geofence type and current status
    v_new_status := v_load.status;

    -- LOADING LOCATION LOGIC
    IF v_geofence.type IN ('warehouse', 'depot') AND v_load.status = 'assigned' THEN
      v_new_status := 'arrived_at_pickup';

      UPDATE loads
      SET
        status = v_new_status,
        arrived_at_pickup = NEW.event_timestamp,
        updated_at = NOW()
      WHERE id = NEW.load_id;

      -- Create delivery event
      INSERT INTO delivery_events (
        load_id, vehicle_id, event_type,
        latitude, longitude, location_name,
        event_timestamp, recorded_by
      ) VALUES (
        NEW.load_id, NEW.vehicle_id, 'arrived_origin',
        NEW.latitude, NEW.longitude, v_geofence.name,
        NEW.event_timestamp, 'system_geofence'
      );

    END IF;

    -- DELIVERY LOCATION LOGIC
    IF v_geofence.type IN ('customer', 'delivery_point') AND v_load.status = 'in_transit' THEN
      v_new_status := 'arrived_at_delivery';

      UPDATE loads
      SET
        status = v_new_status,
        arrived_at_delivery = NEW.event_timestamp,
        updated_at = NOW()
      WHERE id = NEW.load_id;

      -- Create delivery event
      INSERT INTO delivery_events (
        load_id, vehicle_id, event_type,
        latitude, longitude, location_name,
        event_timestamp, recorded_by
      ) VALUES (
        NEW.load_id, NEW.vehicle_id, 'arrived_destination',
        NEW.latitude, NEW.longitude, v_geofence.name,
        NEW.event_timestamp, 'system_geofence'
      );

    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Fire after geofence event is created
CREATE TRIGGER trigger_geofence_load_automation
  AFTER INSERT ON geofence_events
  FOR EACH ROW
  EXECUTE FUNCTION handle_geofence_load_automation();

COMMENT ON FUNCTION handle_geofence_load_automation() IS
  'Automatically update load status when vehicle enters loading/delivery geofences';
```

Apply this migration in Supabase SQL Editor.

---

### **STEP 4: Connect Wialon Tracking to Geofence Detection** 🟡 HIGH

**Current Issue**: Wialon is tracking vehicles, but geofence events aren't being created automatically.

#### 4.1 Create Real-Time Geofence Monitoring Hook

Create file: `/workspaces/car-craft-co/src/hooks/useGeofenceTracking.ts`

```typescript
import { useEffect } from "react";
import { useWialonContext } from "@/integrations/wialon/WialonProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ActiveLoad {
  id: string;
  load_number: string;
  assigned_vehicle_id: string;
  status: string;
}

export const useGeofenceTracking = () => {
  const { vehicleLocations, isConnected } = useWialonContext();
  const { toast } = useToast();

  useEffect(() => {
    if (!isConnected || vehicleLocations.length === 0) return;

    const checkGeofences = async () => {
      try {
        // Get all active loads with assigned vehicles
        const { data: activeLoads, error: loadsError } = await supabase
          .from("loads")
          .select("id, load_number, assigned_vehicle_id, status")
          .in("status", ["assigned", "in_transit", "arrived_at_pickup"])
          .not("assigned_vehicle_id", "is", null);

        if (loadsError) throw loadsError;

        // For each active load, check if vehicle is in any geofence
        for (const load of activeLoads as ActiveLoad[]) {
          const vehicle = vehicleLocations.find(
            (v) => v.vehicleId === load.assigned_vehicle_id
          );

          if (!vehicle) continue;

          // Call database function to check geofence entry
          const { data: geofenceEvents, error: geoError } = await supabase.rpc(
            "check_geofence_entry",
            {
              p_vehicle_id: load.assigned_vehicle_id,
              p_latitude: vehicle.latitude,
              p_longitude: vehicle.longitude,
            }
          );

          if (geoError) {
            console.error("Geofence check error:", geoError);
            continue;
          }

          // Show toast notification for new geofence events
          if (geofenceEvents && geofenceEvents.length > 0) {
            geofenceEvents.forEach((event: any) => {
              toast({
                title: `🚛 ${
                  event.event_type === "entered" ? "Arrived" : "Departed"
                }`,
                description: `${load.load_number} - ${event.geofence_name}`,
                duration: 5000,
              });
            });
          }
        }
      } catch (error) {
        console.error("Geofence tracking error:", error);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkGeofences, 30000);

    // Initial check
    checkGeofences();

    return () => clearInterval(interval);
  }, [isConnected, vehicleLocations, toast]);
};
```

#### 4.2 Integrate into LiveDeliveryTracking Component

Add to `/workspaces/car-craft-co/src/components/loads/LiveDeliveryTracking.tsx`:

```typescript
import { useGeofenceTracking } from "@/hooks/useGeofenceTracking";

// Inside the component:
export const LiveDeliveryTracking = () => {
  // ... existing code ...

  // Add geofence tracking
  useGeofenceTracking();

  // ... rest of component ...
};
```

---

### **STEP 5: Create Load Assignment Workflow UI** 🟡 HIGH

**Goal**: Easy way to assign loads to vehicles from the calendar.

#### 5.1 Enhance EventDialog with Load Assignment

The EventDialog already has vehicle selection, but we need to improve the workflow:

Add to `/workspaces/car-craft-co/src/components/loads/calendar/EventDialog.tsx` (after line 350):

```typescript
// Add helper text showing vehicle capacity
{
  vehicleId && (
    <div className="text-sm text-muted-foreground mt-2">
      <p>💡 This will automatically assign the vehicle to the load</p>
    </div>
  );
}
```

#### 5.2 Add Quick Assign Feature to Unscheduled Loads

In `/workspaces/car-craft-co/src/components/loads/calendar/LoadPlanningCalendar.tsx`, enhance the unscheduled loads sidebar:

```typescript
// Add "Quick Assign" button to each load card
<div className="flex gap-2 mt-2">
  <Button
    size="sm"
    variant="outline"
    onClick={() => {
      setSelectedEvent(null);
      setEventDialogDefaults({
        date: currentDate,
        startTime: "08:00",
        endTime: "10:00",
      });
      // Pre-populate with load
      setShowEventDialog(true);
    }}
  >
    Schedule
  </Button>
</div>
```

---

### **STEP 6: Add Real-Time Status Notifications** 🟢 MEDIUM

#### 6.1 Subscribe to Geofence Events

Create file: `/workspaces/car-craft-co/src/hooks/useGeofenceNotifications.ts`

```typescript
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export const useGeofenceNotifications = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to new geofence events
    const channel = supabase
      .channel("geofence-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "geofence_events",
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          const event = payload.new;

          // Fetch load details
          if (event.load_id) {
            const { data: load } = await supabase
              .from("loads")
              .select("load_number, customer_name")
              .eq("id", event.load_id)
              .single();

            // Fetch geofence details
            const { data: geofence } = await supabase
              .from("geofence_zones")
              .select("name, zone_type")
              .eq("id", event.geofence_zone_id)
              .single();

            if (load && geofence) {
              const icon = event.event_type === "entered" ? "📍" : "🚀";
              const action =
                event.event_type === "entered" ? "arrived at" : "departed from";

              toast({
                title: `${icon} Load ${load.load_number}`,
                description: `${action} ${geofence.name}`,
                duration: 7000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);
};
```

#### 6.2 Add to Main Layout

In `/workspaces/car-craft-co/src/components/Layout.tsx`:

```typescript
import { useGeofenceNotifications } from "@/hooks/useGeofenceNotifications";

export default function Layout({ children }: LayoutProps) {
  // ... existing code ...

  // Add notifications
  useGeofenceNotifications();

  // ... rest of component ...
}
```

---

## 🔧 Testing the Complete Workflow

### Test Scenario: Schedule and Track a Load

1. **Create a Load** (if not exists):

   ```sql
   INSERT INTO loads (load_number, customer_name, origin, destination,
     origin_lat, origin_lng, destination_lat, destination_lng,
     pickup_datetime, delivery_datetime, cargo_type, weight_kg, status)
   VALUES
     ('LD-2025-001', 'Test Customer', 'BV Farm', 'Harare',
      -17.8252, 31.0335, -17.8292, 31.0522,
      '2025-11-12 08:00:00+02', '2025-11-12 17:00:00+02',
      'Fresh Produce', 15000, 'pending');
   ```

2. **Open Load Management** → **Calendar** tab

3. **Drag Load** from sidebar onto tomorrow's date at 8:00 AM

4. **In EventDialog**:

   - Event Type: Pickup
   - Load: Select LD-2025-001
   - Vehicle: Select any vehicle (e.g., C-001)
   - Time: 08:00 - 10:00
   - Click "Create Event"

5. **Verify Database**:

   ```sql
   -- Check calendar event created
   SELECT * FROM calendar_events WHERE load_id = (SELECT id FROM loads WHERE load_number = 'LD-2025-001');

   -- Check load was assigned
   SELECT load_number, status, assigned_vehicle_id FROM loads WHERE load_number = 'LD-2025-001';
   ```

6. **Simulate Vehicle Movement** (for testing):

   ```sql
   -- Manually trigger geofence entry
   INSERT INTO geofence_events (
     geofence_zone_id, vehicle_id, load_id, event_type,
     latitude, longitude, event_timestamp
   ) VALUES (
     (SELECT id FROM geofences WHERE name LIKE '%BV Farm%' LIMIT 1),
     (SELECT id FROM wialon_vehicles WHERE fleet_number = 'C-001'),
     (SELECT id FROM loads WHERE load_number = 'LD-2025-001'),
     'entered',
     -17.8252, 31.0335,
     NOW()
   );
   ```

7. **Check Results**:
   - Load status should change from `assigned` → `arrived_at_pickup`
   - Toast notification should appear
   - Delivery event should be created

---

## 📊 Monitoring Dashboard Queries

### Active Loads with Vehicle Tracking

```sql
SELECT
  l.load_number,
  l.status,
  l.customer_name,
  l.origin || ' → ' || l.destination as route,
  v.fleet_number as vehicle,
  v.name as vehicle_name,
  ce.start_time as scheduled_pickup,
  l.arrived_at_pickup,
  l.arrived_at_delivery,
  CASE
    WHEN l.status = 'assigned' THEN '🟡 Assigned'
    WHEN l.status = 'arrived_at_pickup' THEN '🟠 At Loading'
    WHEN l.status = 'in_transit' THEN '🟢 In Transit'
    WHEN l.status = 'arrived_at_delivery' THEN '🔵 At Delivery'
    ELSE l.status
  END as status_display
FROM loads l
LEFT JOIN wialon_vehicles v ON l.assigned_vehicle_id = v.id
LEFT JOIN calendar_events ce ON ce.load_id = l.id AND ce.event_type = 'pickup'
WHERE l.status IN ('assigned', 'arrived_at_pickup', 'in_transit', 'arrived_at_delivery')
ORDER BY ce.start_time;
```

### Recent Geofence Events

```sql
SELECT
  ge.event_timestamp,
  l.load_number,
  v.fleet_number,
  gz.name as geofence_name,
  gz.zone_type,
  ge.event_type,
  l.status as current_load_status
FROM geofence_events ge
JOIN loads l ON ge.load_id = l.id
JOIN wialon_vehicles v ON ge.vehicle_id = v.id
JOIN geofence_zones gz ON ge.geofence_zone_id = gz.id
WHERE ge.event_timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY ge.event_timestamp DESC;
```

---

## 🚨 Troubleshooting

### Issue: Calendar events create but load doesn't update

**Solution**: Check if trigger exists:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_sync_calendar_to_load';
```

If missing, re-apply Step 2.1 migration.

### Issue: Geofence events not firing

**Check**:

1. Are geofences active? `SELECT * FROM geofences WHERE is_active = true;`
2. Is Wialon connected? Check WialonProvider state
3. Does `check_geofence_entry()` function exist?
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'check_geofence_entry';
   ```

### Issue: No notifications appearing

**Check**:

1. Is `useGeofenceNotifications` hook added to Layout?
2. Are Supabase Realtime subscriptions enabled? (Check Supabase Dashboard → Database → Replication)
3. Check browser console for errors

---

## 🎯 Next Steps Priority Order

1. 🔴 **STEP 1** - Apply database migration (5 minutes)
2. 🔴 **STEP 2** - Create calendar-to-load sync trigger (10 minutes)
3. 🟡 **STEP 3** - Set up geofence zones and automation (30 minutes)
4. 🟡 **STEP 4** - Add geofence tracking hook (20 minutes)
5. 🟢 **STEP 6** - Add real-time notifications (15 minutes)
6. 🟡 **STEP 5** - Enhance assignment UI (optional, 30 minutes)

---

## 📚 Related Documentation

- `LOAD_STATUS_WORKFLOW.md` - Complete status transition flow
- `GEOFENCE_STATUS.md` - Geofence setup guide
- `PHASE_2_4_IMPLEMENTATION_GUIDE.md` - Original planning docs
- `IMPLEMENTATION_STATUS.md` - What's already implemented

---

**Total Implementation Time**: ~2-3 hours
**Complexity**: Medium
**Dependencies**: Wialon connection, Supabase access

Let me know which step you'd like to start with!
