# PGRST116 Error Fix - Load Assignment Issue

## Problem Summary

**Error**: `PGRST116: Cannot coerce the result to a single JSON object - The result contains 0 rows`
**HTTP Status**: 406 Not Acceptable
**Affected Operation**: Assigning loads to Wialon GPS vehicles

## Root Cause

The `loads` table was created with a foreign key constraint on `assigned_vehicle_id` pointing to the **wrong table**:

```sql
-- WRONG (from 20251104000000_route_planning_loads.sql)
assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL
```

But the application code is trying to assign loads to the `wialon_vehicles` table instead:

```typescript
// LoadAssignmentDialog.tsx
await assignLoadAsync({
  loadId: load.id,
  vehicleId: vehicleId, // This is a UUID from wialon_vehicles table!
  assignedBy: "current-user",
});
```

### Why This Causes PGRST116 Error

1. The UPDATE query tries to set `assigned_vehicle_id` to a UUID from `wialon_vehicles`
2. PostgreSQL validates the FK constraint and expects the UUID to exist in `vehicles` table
3. The UUID doesn't exist in `vehicles` table (it's in `wialon_vehicles`), so FK constraint fails
4. PostgREST returns 0 rows from the UPDATE operation
5. The `.select().single()` expects 1 row, throws PGRST116 error

## Solution

### Files Modified

1. **supabase/migrations/20251104000000_route_planning_loads.sql**

   - Removed FK constraint from initial table creation
   - Now creates `assigned_vehicle_id` as a plain UUID column

2. **fix_loads_fk_constraint.sql** (NEW)

   - Drops any existing wrong FK constraints
   - Clears existing assigned_vehicle_id values (they reference wrong table)
   - Adds correct FK constraint to `wialon_vehicles` table

3. **fix_wialon_integration.sh** (NEW)
   - Automated script to guide through the fix process
   - Applies both migrations in correct order
   - Regenerates TypeScript types
   - Optionally deploys Edge Function

### Database Changes Required

```sql
-- 1. Create wialon_vehicles table
-- (Run supabase/migrations/20251104120000_create_wialon_vehicles.sql)

-- 2. Fix loads FK constraint
-- (Run fix_loads_fk_constraint.sql)
```

## How to Apply the Fix

### Option 1: Use the Automated Script (Recommended)

```bash
./fix_wialon_integration.sh
```

This script will:

1. Display SQL to create `wialon_vehicles` table
2. Display SQL to fix FK constraint
3. Regenerate TypeScript types
4. Optionally deploy Edge Function

### Option 2: Manual Steps

1. **Create wialon_vehicles table**:

   - Go to https://supabase.com/dashboard/project/wxvhkljrbcpcgpgdqhsp/sql
   - Copy contents of `supabase/migrations/20251104120000_create_wialon_vehicles.sql`
   - Paste and run in SQL Editor

2. **Fix FK constraint**:

   - In the same SQL Editor
   - Copy contents of `fix_loads_fk_constraint.sql`
   - Paste and run

3. **Regenerate types**:

   ```bash
   npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
   ```

4. **Deploy Edge Function** (if not already deployed):
   ```bash
   npx supabase functions deploy get-wialon-token
   ```

## Verification

After applying the fix, verify:

1. ✅ No CORS errors in browser console
2. ✅ No FK constraint violations (error 23503)
3. ✅ No 400 Bad Request errors
4. ✅ No PGRST116 errors
5. ✅ Loads can be successfully assigned to Wialon vehicles
6. ✅ Assigned loads show vehicle name with "GPS Tracked" badge

### Test Steps

1. Refresh browser
2. Go to Load Management page (`/loads`)
3. Click "Assign" on a pending load
4. Select a Wialon vehicle from the list
5. Click "Assign Load"
6. Verify success toast: "Load assigned"
7. Verify load status changes to "assigned"
8. Verify vehicle information displays correctly

## Related Files

### Database Migrations

- `supabase/migrations/20251104000000_route_planning_loads.sql` - Creates loads table (FIXED)
- `supabase/migrations/20251104120000_create_wialon_vehicles.sql` - Creates wialon_vehicles table
- `fix_loads_fk_constraint.sql` - Fixes FK constraint

### Frontend Components

- `src/components/loads/LoadAssignmentDialog.tsx` - Vehicle assignment UI
- `src/hooks/useLoads.ts` - Load data management (assignLoad mutation)
- `src/pages/LoadManagement.tsx` - Load list display

### Edge Functions

- `supabase/functions/get-wialon-token/index.ts` - Wialon API token fetcher (CORS-enabled)

## Database Schema After Fix

```
┌─────────────────────┐
│  wialon_vehicles    │  ← GPS-tracked vehicles
│─────────────────────│
│ id (UUID PK)        │
│ wialon_unit_id (INT)│
│ name (TEXT)         │
│ registration (TEXT) │
└─────────────────────┘
          ↑
          │ FK: fk_assigned_vehicle
          │
┌─────────────────────┐
│      loads          │  ← Cargo/freight
│─────────────────────│
│ id (UUID PK)        │
│ load_number         │
│ assigned_vehicle_id │─────── References wialon_vehicles.id
│ status              │
│ ...                 │
└─────────────────────┘
```

## Previous Errors Fixed

This fix resolves the final issue in a series:

1. ✅ Lint errors (unused variables)
2. ✅ CORS policy errors (Edge Function blocking)
3. ✅ FK constraint 23503 (wialon_vehicles didn't exist)
4. ✅ TypeScript errors 2589/2769 (wrong schema fields)
5. ✅ 400 Bad Request (querying wrong table/columns)
6. ✅ **PGRST116 (FK constraint pointing to wrong table)** ← THIS FIX

## Notes

- **Why separate tables?** `vehicles` table is for workshop fleet management (maintenance, job cards), while `wialon_vehicles` is specifically for GPS-tracked delivery vehicles.
- **Data separation**: Workshop vehicles and GPS vehicles serve different purposes and have different schemas.
- **No data loss**: The fix sets existing `assigned_vehicle_id` values to NULL before adding the new constraint (they were invalid anyway).
- **Idempotent**: The fix scripts can be run multiple times safely.

## Next Steps

After this fix is applied and verified:

1. Test LiveDeliveryTracking component with assigned loads
2. Verify Analytics dashboard (Phase 4) displays correctly
3. Consider adding a sync job to update wialon_vehicles from Wialon API
4. Add UI to manually map wialon_vehicles to workshop vehicles for cross-referencing
