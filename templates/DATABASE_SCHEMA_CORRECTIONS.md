# Database Schema Corrections for Advanced Tracking

## Issue Summary

The `ADVANCED_TRACKING_INTEGRATION_GUIDE.md` contained SQL that didn't match the actual database schema. This caused the error: **"ERROR: 42703: column "timestamp" does not exist"**

## Schema Differences

### 1. `geofence_events` Table

**Guide Had (INCORRECT):**

```sql
CREATE TABLE geofence_events (
  geofence_id UUID REFERENCES geofences(id),
  geofence_name TEXT,
  timestamp TIMESTAMPTZ,  -- ❌ Wrong column name
  location GEOGRAPHY(POINT),  -- ❌ Wrong type
  metadata JSONB  -- ❌ Doesn't exist
);
```

**Actual Database Schema (CORRECT):**

```sql
CREATE TABLE geofence_events (
  geofence_zone_id UUID REFERENCES geofence_zones(id),  -- ✅ Correct table reference
  event_timestamp TIMESTAMPTZ,  -- ✅ Correct column name
  latitude NUMERIC(10, 7),  -- ✅ Separate lat/lng
  longitude NUMERIC(10, 7),
  dwell_duration_minutes INTEGER,  -- ✅ Additional fields
  notification_sent BOOLEAN,
  notification_sent_at TIMESTAMPTZ
);
```

### 2. `route_waypoints` Table

**Guide Had (INCORRECT):**

```sql
CREATE TABLE route_waypoints (
  name TEXT,  -- ❌ Wrong column name
  type TEXT,  -- ❌ Wrong column name and type
  geofence_id UUID,  -- ❌ Wrong reference
  eta TIMESTAMPTZ  -- ❌ Wrong column name
);
```

**Actual Database Schema (CORRECT):**

```sql
CREATE TABLE route_waypoints (
  trip_id UUID REFERENCES trips(id),  -- ✅ Primary reference is trip, not just load
  location_name TEXT,  -- ✅ Correct column name
  waypoint_type waypoint_type,  -- ✅ Uses ENUM type
  planned_arrival TIMESTAMPTZ,  -- ✅ Separate planned/actual columns
  planned_departure TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  estimated_duration_mins INTEGER,
  completed BOOLEAN,
  completed_at TIMESTAMPTZ
);
```

### 3. `delivery_eta` Table

**Guide Had (INCORRECT):**

```sql
CREATE TABLE delivery_eta (
  confidence NUMERIC,  -- ❌ Wrong column name
  factors JSONB NOT NULL  -- ❌ Doesn't exist in base table
);
```

**Actual Database Schema (CORRECT):**

```sql
CREATE TABLE delivery_eta (
  confidence_level NUMERIC(3, 2),  -- ✅ Correct column name
  traffic_delay_minutes INTEGER,  -- ✅ Separate delay columns
  weather_delay_minutes INTEGER,
  rest_stop_minutes INTEGER,
  calculation_method TEXT,
  remaining_distance_km NUMERIC(10, 2),
  average_speed_kmh NUMERIC(6, 2),
  estimated_duration_minutes INTEGER,
  calculated_at TIMESTAMPTZ  -- ✅ Not created_at/updated_at
);
```

## How to Fix Your Code

### Update Hook: `useWialonLoadIntegration.ts`

If you're accessing geofence_events, use the correct column names:

```typescript
// ❌ OLD (Incorrect)
const { data } = await supabase
  .from("geofence_events")
  .select("timestamp, geofence_name, location")
  .eq("load_id", loadId);

// ✅ NEW (Correct)
const { data } = await supabase
  .from("geofence_events")
  .select(
    `
    event_timestamp,
    geofence_zone_id,
    geofence_zones!inner(name),
    latitude,
    longitude
  `
  )
  .eq("load_id", loadId);
```

### Update Service: `advancedRouteTracking.ts`

When inserting delivery_eta:

```typescript
// ❌ OLD (Incorrect)
await supabase.from('delivery_eta').insert({
  load_id: loadId,
  estimated_arrival: eta,
  confidence: 0.85,  // ❌ Wrong column
  factors: { ... }   // ❌ Column doesn't exist yet
});

// ✅ NEW (Correct) - Option 1: Use existing schema
await supabase.from('delivery_eta').insert({
  load_id: loadId,
  estimated_arrival: eta,
  confidence_level: 0.85,  // ✅ Correct column
  traffic_delay_minutes: 10,
  weather_delay_minutes: 5,
  calculation_method: 'gps_based'
});

// ✅ NEW (Correct) - Option 2: After running migration
await supabase.from('delivery_eta').insert({
  load_id: loadId,
  estimated_arrival: eta,
  confidence_level: 0.85,
  factors: { ... },  // ✅ After migration adds this column
  optimistic_eta: optimistic,
  pessimistic_eta: pessimistic
});
```

### Update Route Waypoint Queries

```typescript
// ❌ OLD (Incorrect)
const { data } = await supabase
  .from("route_waypoints")
  .select("name, type, eta")
  .eq("load_id", loadId);

// ✅ NEW (Correct)
const { data } = await supabase
  .from("route_waypoints")
  .select("location_name, waypoint_type, planned_arrival")
  .eq("load_id", loadId);
```

## Apply the Migration

To add the missing columns for advanced tracking features:

```bash
# Via Supabase Dashboard
1. Go to SQL Editor
2. Paste contents of: supabase/migrations/20251117000000_advanced_tracking_extensions.sql
3. Run the query

# Or via Supabase CLI
supabase migration up
```

This migration adds:

- ✅ `fuel_level`, `temperature`, `odometer`, `engine_hours` to `delivery_tracking`
- ✅ `factors`, `optimistic_eta`, `pessimistic_eta` to `delivery_eta`
- ✅ Proper indexes for performance
- ✅ Helpful view: `geofence_events_with_details`
- ✅ RLS policies for authenticated access

## Quick Verification

After applying the migration, verify with:

```sql
-- Check delivery_tracking has new columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'delivery_tracking'
  AND column_name IN ('fuel_level', 'temperature', 'odometer', 'engine_hours');

-- Check delivery_eta has new columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'delivery_eta'
  AND column_name IN ('factors', 'optimistic_eta', 'pessimistic_eta');

-- Check geofence_events view exists
SELECT * FROM geofence_events_with_details LIMIT 1;
```

## Summary of Changes

| Component                                  | Status             | Action Required                                       |
| ------------------------------------------ | ------------------ | ----------------------------------------------------- |
| **ADVANCED_TRACKING_INTEGRATION_GUIDE.md** | ✅ Fixed           | Documentation updated with correct schema             |
| **Migration File**                         | ✅ Created         | Run `20251117000000_advanced_tracking_extensions.sql` |
| **useWialonLoadIntegration.ts**            | ⚠️ Check           | Update column references if using geofence_events     |
| **advancedRouteTracking.ts**               | ⚠️ Check           | Update delivery_eta inserts to use `confidence_level` |
| **Database**                               | ⚠️ Action Required | Apply the new migration                               |

## Next Steps

1. **Apply the migration** using Supabase Dashboard or CLI
2. **Update your code** to use correct column names (see examples above)
3. **Test geofence event handling** with the corrected schema
4. **Verify** that ETA calculations work with the new columns

The error should be resolved once you apply the migration and update any code that directly references the old column names!
