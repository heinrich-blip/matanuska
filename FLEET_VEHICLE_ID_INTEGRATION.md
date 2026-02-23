# Fleet Vehicle ID Integration - Trip Linking Solution

## Problem

The system was using Wialon units (`wialon_vehicles` table) to capture trips, but some fleet vehicles don't have Wialon GPS tracking. The mobile app tries to load trips for drivers based on their assigned vehicle from the `vehicles` table, but trips were linked to `wialon_vehicles`, causing a mismatch.

**Key issues:**

1. Trips linked to `wialon_vehicles.id` via `vehicle_id` column
2. Driver vehicle assignments linked to `vehicles.id`
3. Some vehicles in `vehicles` table don't exist in `wialon_vehicles`
4. Mobile app lookups by fleet_number were unreliable (case sensitivity, whitespace)

## Solution

Add a `fleet_vehicle_id` column to the `trips` table that directly references the `vehicles` table. This provides a reliable, direct link between trips and fleet vehicles.

### Architecture

```
┌─────────────────┐          ┌─────────────────┐
│     trips       │          │    vehicles     │
├─────────────────┤          ├─────────────────┤
│ id              │          │ id              │
│ vehicle_id ────────────┐   │ fleet_number    │
│ fleet_vehicle_id ──────│──>│ registration_number
│ ...             │      │   │ wialon_id ──────│──┐
└─────────────────┘      │   └─────────────────┘  │
                         │                         │
                         │   ┌─────────────────┐   │
                         │   │ wialon_vehicles │   │
                         │   ├─────────────────┤   │
                         └──>│ id              │   │
                             │ wialon_unit_id <────┘
                             │ fleet_number    │
                             │ name            │
                             └─────────────────┘
```

- `trips.vehicle_id`: FK to `wialon_vehicles.id` (for GPS tracking)
- `trips.fleet_vehicle_id`: FK to `vehicles.id` (for fleet management)

## Database Migration

**File:** `supabase/migrations/20260205000001_add_fleet_vehicle_id_to_trips.sql`

### What it does:

1. Adds `fleet_vehicle_id` column to `trips` table
2. Creates index for performance
3. Backfills existing trips:
   - First by matching `wialon_unit_id` to `vehicles.wialon_id`
   - Then by matching `fleet_number` between tables
4. Creates a trigger to auto-populate `fleet_vehicle_id` when `vehicle_id` is set

### Apply the Migration

**Option 1: Via Supabase Dashboard (Recommended)**

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of the migration file
3. Execute the SQL

**Option 2: Via Supabase CLI**

```bash
cd /workspaces/car-craft-co
npx supabase db push
```

### Regenerate Types (Required after migration)

```bash
npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
```

## Code Changes

### Mobile App

**Files modified:**

- `mobile-app-nextjs/src/app/page.tsx`
- `mobile-app-nextjs/src/app/freight/page.tsx`

**Changes:**

- Removed complex `wialon_vehicles` lookup queries
- Now queries trips directly by `fleet_vehicle_id = vehicle.id`
- Simpler, more reliable, fewer API calls

**Before:**

```tsx
// Had to find wialon_vehicle by fleet_number first
const wialonVehicle = await findWialonVehicleByFleetNumber(
  vehicle.fleet_number
);
// Then query trips by wialon vehicle ID
query.eq("vehicle_id", wialonVehicle.id);
```

**After:**

```tsx
// Direct query by vehicle ID
query.eq("fleet_vehicle_id", vehicle.id);
```

### Dashboard App

**File modified:**

- `src/pages/TripManagement.tsx`

**Changes:**

- Updated query to join with `vehicles` table via `fleet_vehicle_id`
- Prefers fleet_number from `vehicles` table, falls back to `wialon_vehicles`

```tsx
.select(`
  *,
  wialon_vehicles:vehicle_id(id, fleet_number, name),
  vehicles:fleet_vehicle_id(id, fleet_number, registration_number)
`)
```

## Data Flow

### Creating a Trip

1. User selects a vehicle from dropdown (from `wialon_vehicles`)
2. Trip is created with `vehicle_id = wialon_vehicles.id`
3. Database trigger automatically sets `fleet_vehicle_id` by:
   - Finding matching `vehicles` record by `wialon_id = wialon_unit_id`
   - Or matching by `fleet_number`

### Mobile App Loading Trips

1. App gets driver's assigned vehicle from `driver_vehicle_assignments` → `vehicles`
2. Queries trips with `fleet_vehicle_id = vehicle.id`
3. Directly gets all trips for that fleet vehicle

## Verification

After applying the migration, verify:

```sql
-- Check that fleet_vehicle_id is populated for existing trips
SELECT
  t.id,
  t.trip_number,
  t.vehicle_id,
  t.fleet_vehicle_id,
  wv.fleet_number as wialon_fleet,
  v.fleet_number as vehicle_fleet
FROM trips t
LEFT JOIN wialon_vehicles wv ON t.vehicle_id = wv.id
LEFT JOIN vehicles v ON t.fleet_vehicle_id = v.id
ORDER BY t.created_at DESC
LIMIT 20;

-- Count trips with/without fleet_vehicle_id
SELECT
  COUNT(*) as total_trips,
  COUNT(fleet_vehicle_id) as with_fleet_vehicle,
  COUNT(*) - COUNT(fleet_vehicle_id) as without_fleet_vehicle
FROM trips;
```

## Handling Missing Mappings

If some trips don't have `fleet_vehicle_id` populated (no matching vehicle found):

1. **Vehicle not in database**: Add the vehicle to the `vehicles` table
2. **Missing wialon_id**: Update `vehicles.wialon_id` to match `wialon_vehicles.wialon_unit_id`
3. **Fleet number mismatch**: Ensure `fleet_number` matches between tables

### Manual fix example:

```sql
-- Link vehicle to wialon unit by wialon_unit_id
UPDATE vehicles
SET wialon_id = 12345678
WHERE fleet_number = '21H';

-- Re-run backfill
UPDATE public.trips t
SET fleet_vehicle_id = v.id
FROM public.wialon_vehicles wv
INNER JOIN public.vehicles v ON v.wialon_id = wv.wialon_unit_id
WHERE t.vehicle_id = wv.id
  AND t.fleet_vehicle_id IS NULL
  AND v.wialon_id IS NOT NULL;
```

## Future Considerations

1. **Direct vehicle selection**: Consider allowing trip creation to select from `vehicles` table directly (not just `wialon_vehicles`)
2. **Deprecate wialon_vehicles dependency**: Over time, move toward `vehicles` as the source of truth with optional `wialon_id` for GPS tracking
3. **Diesel records**: Consider similar `fleet_vehicle_id` linking for `diesel_records` table

## Summary

| Before                                        | After                                             |
| --------------------------------------------- | ------------------------------------------------- |
| Trips linked only to wialon_vehicles          | Trips linked to both wialon_vehicles AND vehicles |
| Mobile app needed complex fleet_number lookup | Mobile app queries by fleet_vehicle_id directly   |
| Non-GPS vehicles couldn't have trips          | All fleet vehicles can have trips                 |
| Case-sensitive fleet_number matching issues   | Direct UUID-based matching                        |
