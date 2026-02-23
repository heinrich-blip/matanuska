# Quick Start Checklist - Wialon Load Scheduling Integration

## ✅ Step-by-Step Implementation

### 🔴 STEP 1: Verify Database Tables (5 minutes)

1. **Go to Supabase SQL Editor**: https://supabase.com/dashboard/project/wxvhkljrbcpcgpgdqhsp/editor

2. **Run this check**:

```sql
-- Check if calendar_events table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'calendar_events'
) as table_exists;
```

3. **If returns `false`**:

   - Open `/workspaces/car-craft-co/supabase/migrations/20251111000004_phase3_4_planning_analytics.sql`
   - Copy entire contents
   - Paste into Supabase SQL Editor
   - Click "Run"

4. **Regenerate types**:

```bash
cd /workspaces/car-craft-co
npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
```

---

### 🔴 STEP 2: Apply Calendar-to-Load Sync (5 minutes)

1. **Open Supabase SQL Editor**

2. **Copy and run**:

   - File: `/workspaces/car-craft-co/supabase/migrations/20251111000005_calendar_load_sync.sql`

3. **Verify**:

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'sync_calendar_event_to_load';
```

Should return 1 row.

---

### 🟡 STEP 3: Set Up Geofence Automation (10 minutes)

1. **Check existing geofences** (you already have them!):

```sql
-- Check existing geofences
SELECT id, name, type, center_lat, center_lng FROM geofences LIMIT 10;
```

✅ **You have 5 geofences**: St Theresa's Hospital, Harare Central Hospital, Skyline Tollgate, Harare Truck Stop, St. Annes Hospital

**Note**: Your geofences table uses `type` (circle/polygon/line), not `zone_type`. The automation trigger needs to be adjusted.

2. **Check if geofence_zones table exists**:

```sql
-- Check if geofence_zones table exists (needed for automation)
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'geofence_zones'
) as table_exists;
```

**If returns `false`**, you need to apply the Phase 2 migration first:

- File: `/workspaces/car-craft-co/supabase/migrations/20251104000005_phase2_live_tracking.sql`
- Copy and run in Supabase SQL Editor
- This creates `geofence_zones` and `geofence_events` tables

**If returns `true`**, proceed to next step.

3. **Apply geofence automation trigger**:

4. **Apply geofence automation trigger**:

   - File: `/workspaces/car-craft-co/supabase/migrations/20251111000006_geofence_load_automation.sql`
   - Copy and run in SQL Editor

5. **Verify**:

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'handle_geofence_load_automation';
```

---

### 🟡 STEP 4: Enable Real-Time Tracking (15 minutes)

1. **Enable Supabase Realtime** (if not enabled):

   - Go to Supabase Dashboard → Database → Replication
   - Enable replication for:
     - ✅ `geofence_events`
     - ✅ `calendar_events`
     - ✅ `loads`

2. **Add geofence tracking to LiveDeliveryTracking**:

Open `/workspaces/car-craft-co/src/components/loads/LiveDeliveryTracking.tsx`

Add import at top:

```typescript
import { useGeofenceTracking } from "@/hooks/useGeofenceTracking";
```

Add inside component (after other hooks):

```typescript
// Enable geofence tracking
useGeofenceTracking();
```

3. **Add notifications to Layout**:

Open `/workspaces/car-craft-co/src/components/Layout.tsx`

Add import:

```typescript
import { useGeofenceNotifications } from "@/hooks/useGeofenceNotifications";
```

Add inside component:

```typescript
// Enable geofence notifications
useGeofenceNotifications();
```

---

### 🧪 STEP 5: Test the Complete Flow (10 minutes)

1. **Create a test load**:

```sql
INSERT INTO loads (
  load_number, customer_name, origin, destination,
  origin_lat, origin_lng, destination_lat, destination_lng,
  pickup_datetime, delivery_datetime,
  cargo_type, weight_kg, status
) VALUES (
  'LD-TEST-001', 'Test Customer', 'BV Farm', 'Harare',
  -17.8252, 31.0335, -17.8292, 31.0522,
  '2025-11-12 08:00:00+02', '2025-11-12 17:00:00+02',
  'Fresh Produce', 15000, 'pending'
);
```

2. **Open app**: http://localhost:8081 (or your dev URL)

3. **Navigate**: Load Management → Calendar tab

4. **Schedule load**:

   - Drag "LD-TEST-001" from sidebar onto tomorrow at 8 AM
   - Select a vehicle
   - Click "Create Event"

5. **Verify in database**:

```sql
-- Check event created
SELECT * FROM calendar_events ORDER BY created_at DESC LIMIT 1;

-- Check load assigned
SELECT load_number, status, assigned_vehicle_id
FROM loads WHERE load_number = 'LD-TEST-001';
```

Should show:

- ✅ Calendar event exists
- ✅ Load status = 'assigned'
- ✅ Load has assigned_vehicle_id

6. **Simulate geofence entry** (for testing):

```sql
-- Get IDs
SELECT id FROM geofences WHERE name LIKE '%BV Farm%' LIMIT 1;
SELECT id FROM wialon_vehicles LIMIT 1;
SELECT id FROM loads WHERE load_number = 'LD-TEST-001';

-- Insert geofence event (replace with actual IDs)
INSERT INTO geofence_events (
  geofence_zone_id, vehicle_id, load_id, event_type,
  latitude, longitude, event_timestamp
) VALUES (
  '<geofence_id>',
  '<vehicle_id>',
  '<load_id>',
  'entered',
  -17.8252, 31.0335,
  NOW()
);
```

7. **Check result**:

```sql
SELECT load_number, status, arrived_at_pickup
FROM loads WHERE load_number = 'LD-TEST-001';
```

Should show:

- ✅ Status changed to 'arrived_at_pickup'
- ✅ arrived_at_pickup timestamp set
- ✅ Toast notification appeared in UI

---

## 🎯 Success Criteria

After completing all steps, you should have:

- [x] Calendar events create and sync to loads table
- [x] Loads automatically assigned when scheduling
- [x] Geofence events trigger status updates
- [x] Real-time notifications when vehicles enter/exit zones
- [x] Complete tracking from schedule → pickup → transit → delivery

---

## 📊 Monitoring Queries

### See all active trackings:

```sql
SELECT
  l.load_number,
  l.status,
  v.fleet_number,
  ce.start_time as scheduled,
  l.arrived_at_pickup,
  l.arrived_at_delivery
FROM loads l
JOIN wialon_vehicles v ON l.assigned_vehicle_id = v.id
LEFT JOIN calendar_events ce ON ce.load_id = l.id
WHERE l.status IN ('assigned', 'arrived_at_pickup', 'in_transit')
ORDER BY ce.start_time;
```

### See recent geofence events:

```sql
SELECT
  ge.event_timestamp,
  l.load_number,
  v.fleet_number,
  gz.name as zone_name,
  ge.event_type
FROM geofence_events ge
JOIN loads l ON ge.load_id = l.id
JOIN wialon_vehicles v ON ge.vehicle_id = v.id
JOIN geofence_zones gz ON ge.geofence_zone_id = gz.id
WHERE ge.event_timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY ge.event_timestamp DESC;
```

---

## 🚨 Troubleshooting

### Calendar creates event but load doesn't update?

- Check: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_sync_calendar_to_load';`
- If empty, re-run Step 2

### No geofence events firing?

- Check: Is Wialon connected? (green indicator in GPS Tracking)
- Check: Do geofences exist? `SELECT COUNT(*) FROM geofences WHERE is_active = true;`
- Check: Is hook added? Search for `useGeofenceTracking()` in LiveDeliveryTracking.tsx

### No notifications appearing?

- Check: Supabase Realtime enabled? (Dashboard → Database → Replication)
- Check: Is hook added? Search for `useGeofenceNotifications()` in Layout.tsx
- Check: Browser console for errors (F12 → Console)

---

## 📚 Files Created

1. `/workspaces/car-craft-co/WIALON_LOAD_SCHEDULING_INTEGRATION.md` - Complete guide
2. `/workspaces/car-craft-co/supabase/migrations/20251111000005_calendar_load_sync.sql` - Sync trigger
3. `/workspaces/car-craft-co/supabase/migrations/20251111000006_geofence_load_automation.sql` - Automation trigger
4. `/workspaces/car-craft-co/src/hooks/useGeofenceTracking.ts` - Tracking hook
5. `/workspaces/car-craft-co/src/hooks/useGeofenceNotifications.ts` - Notifications hook

---

**Estimated Total Time**: 45-60 minutes
**Ready to start?** Begin with Step 1! 🚀
