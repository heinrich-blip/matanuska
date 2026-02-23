# Migration Guide: Fix Trips vs Loads Data Contradiction

## 🚨 Problem Identified

Your system has **TWO tables with contradictory purposes**:

### Current State (BROKEN)

**`trips` table:** Contains **BOTH**:

1. ❌ Webhook-imported LOAD data (has `external_load_ref`)
2. ✅ Manually-created trip data (no `external_load_ref`)

**`loads` table:** Contains: 3. ✅ Proper load management data

**Result**: Confusion, empty dropdowns, data in wrong places

### Database Schema Confirms the Relationships

```sql
-- CORRECT relationship (as designed):
trips.vehicle_id → wialon_vehicles.id
loads.assigned_vehicle_id → wialon_vehicles.id
loads.assigned_trip_id → trips.id

-- trips = vehicle journey
-- loads = cargo shipment that can be assigned to a trip
```

## 📊 Your Actual Data Analysis

### Trips Table (20 entries total)

**Webhook imports (17 entries)** - SHOULD BE IN LOADS:

- `external_load_ref`: `"(Retail)Bv to Rezende_Marketing Depot Loads/2025/10/25-0001"`
- `import_source`: `"web_book"`
- `vehicle_id`: **NULL** (not assigned to vehicles)
- Status: `"completed"` or `"active"`

**Manual test entries (3 entries)** - INVALID, SHOULD DELETE:

- `trip_number`: `"3"` (duplicate!)
- All fields NULL except `arrival_date`

### Loads Table (21 entries)

**Proper load data**:

- `load_number`: `"LD-20251111-797"`, `"LD-20251110-001"`, etc.
- Proper fields: `customer_name`, `cargo_type`, `weight_kg`, `pickup_datetime`
- Status: `pending`, `in_transit`, `completed` (ENUM type)
- Can have `assigned_trip_id` and `assigned_vehicle_id`

## ✅ Solution: Run Migration

### Step 1: Apply SQL Migration

```bash
cd /workspaces/car-craft-co

# Apply via Supabase SQL Editor
# Copy contents of: supabase/migrations/20251111_migrate_trips_to_loads.sql
```

**Or run directly:**

```sql
-- Run the migration script in Supabase SQL Editor
\i supabase/migrations/20251111_migrate_trips_to_loads.sql
```

### Step 2: What the Migration Does

1. **Migrates 17 webhook entries** from `trips` → `loads`

   - Maps `external_load_ref` → `load_number`
   - Converts `client_name` → `customer_name`
   - Maps datetime fields correctly
   - Converts status to enum: `'completed'` → `completed::load_status`
   - Preserves original data in `attachments` JSON field

2. **Deletes migrated entries** from `trips` table

3. **Cleans up test entries** (3 duplicate `trip_number: "3"`)

4. **Leaves clean state**:
   - `trips` table: EMPTY (ready for manual trip creation)
   - `loads` table: 38 entries (21 existing + 17 migrated)

### Step 3: Verify After Migration

**Check trips table** (should be empty or minimal):

```sql
SELECT COUNT(*), status, import_source
FROM trips
GROUP BY status, import_source;
```

**Check loads table** (should have all data):

```sql
SELECT COUNT(*), status
FROM loads
GROUP BY status;
```

**Check migrated data**:

```sql
SELECT load_number, customer_name, status, attachments->>'migrated_from_trips' as migrated
FROM loads
WHERE attachments->>'migrated_from_trips' = 'true'
LIMIT 5;
```

[
{
"load_number": "(Retail)Bv to Rezende_Marketing Depot Loads/2025/10/25-0001",
"customer_name": "Marketing Local",
"status": "completed",
"migrated": "true"
},
{
"load_number": "(Vendor) CBC to Rezende_Marketing Depot Loads/2025/11/2-0004",
"customer_name": "Marketing Local",
"status": "completed",
"migrated": "true"
},
{
"load_number": "(Retail)Bv to Rezende_Marketing Depot Loads/2025/11/2-0001",
"customer_name": "Marketing Local",
"status": "completed",
"migrated": "true"
},
{
"load_number": "(Retail/Vendor) CBC to Bulawayo_Marketing Depot Loads/2025/11/2-0003",
"customer_name": "Marketing Local",
"status": "completed",
"migrated": "true"
},
{
"load_number": "(Vendor) CBC to Rezende_Marketing Depot Loads/2025/10/25-0002",
"customer_name": "Marketing Local",
"status": "completed",
"migrated": "true"
}
]

## 🎯 Post-Migration Workflow

### For TRIPS (Vehicle Journeys)

**Create a trip** via `AddTripDialog`:

1. Navigate to Trips page
2. Click "Add Trip"
3. **Vehicle dropdown**: Now shows `wialon_vehicles` (fix applied ✅)
4. Fill in: trip_number, vehicle, driver, origin, destination, dates
5. Save

**Result**: Entry in `trips` table with `vehicle_id` assigned

### For LOADS (Cargo Shipments)

**Create a load** via `CreateLoadDialog`:

1. Navigate to Loads page
2. Click "Create Load"
3. Fill in: customer, cargo type, weight, origin, destination, dates
4. Save as `status: pending`

**Assign load to trip** via `LoadAssignmentDialog`:

1. Open load details
2. Click "Assign to Trip"
3. Select trip from dropdown
4. System sets: `load.assigned_trip_id = trip.id`

**Result**: Load linked to trip, can track together

### For WEBHOOK (External System)

**Webhook imports** (already fixed in commit 3d67562):

- Webhook → `loads` table ✅
- Creates entries with `import_source: 'web_book'`
- Sets default `status: 'active'`, `currency: 'ZAR'`
- Can be edited/assigned to trips later

## 📋 Testing Checklist

After migration:

- [ ] 1. **Verify trips table empty** (or only manual entries)
- [ ] 2. **Verify loads table has 38+ entries** (21 original + 17 migrated)
- [ ] 3. **Test AddTripDialog** - Vehicle dropdown shows options
- [ ] 4. **Test CreateLoadDialog** - Can create new load
- [ ] 5. **Test EditLoadDialog** - All fields editable, dropdowns work
- [ ] 6. **Test LoadAssignmentDialog** - Can assign load to trip
- [ ] 7. **Send webhook test** - Creates entry in loads table
- [ ] 8. **Verify relationship** - Load shows assigned trip details

## 🔧 Troubleshooting

### Issue: Migration fails with "duplicate key"

**Cause**: Load already exists with same `load_number`

**Fix**: The migration script includes `NOT IN (SELECT load_number FROM loads)` check, should prevent this.

### Issue: Status conversion fails

**Cause**: Invalid status value in trips table

**Fix**: Update the CASE statement in migration to handle edge cases:

```sql
CASE
  WHEN status = 'completed' THEN 'completed'::load_status
  WHEN status = 'active' THEN 'in_transit'::load_status
  WHEN status = 'cancelled' THEN 'cancelled'::load_status
  ELSE 'pending'::load_status
END
```

### Issue: Weight is wrong after migration

**Expected**: Weight was estimated as `distance_km * 100` (rough conversion)

**Fix**: Manually update weights after migration:

```sql
UPDATE loads
SET weight_kg = <correct_weight>
WHERE attachments->>'migrated_from_trips' = 'true'
  AND load_number = '<specific_load>';
```

## 📝 Summary

| Before Migration                         | After Migration                      |
| ---------------------------------------- | ------------------------------------ |
| Trips: 20 entries (17 loads + 3 invalid) | Trips: 0 entries (clean slate)       |
| Loads: 21 entries                        | Loads: 38 entries (21 + 17 migrated) |
| ❌ Dropdowns broken                      | ✅ Dropdowns working                 |
| ❌ Data in wrong tables                  | ✅ Data in correct tables            |
| ❌ Webhook → trips                       | ✅ Webhook → loads                   |

**Files Modified:**

- ✅ `src/hooks/useWialonVehicles.ts` - Created hook for wialon_vehicles
- ✅ `src/components/trips/AddTripDialog.tsx` - Uses useWialonVehicles
- ✅ `src/components/trips/EditTripDialog.tsx` - Uses useWialonVehicles
- ✅ `supabase/functions/quick-task/index.ts` - Imports to loads table
- ✅ `supabase/migrations/20251111_migrate_trips_to_loads.sql` - Migration script

**Commits:**

- `8a0fb42` - Fix trip dialogs to use correct wialon_vehicles table
- `3d67562` - Fixed webhook to import into loads table

**Next Actions:**

1. Run migration SQL in Supabase SQL Editor
2. Test trip creation (should show vehicle dropdown)
3. Test load creation and assignment
4. Regenerate TypeScript types if schema changed

---

**Questions?** Check the relationship diagram in `TRIPS_VS_LOADS_INTEGRATION.md`
