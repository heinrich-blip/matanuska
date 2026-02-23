# Vehicle Type Selection Issue - Reefer and Interlink

## Problem Summary

Users cannot select reefer or interlink vehicles when creating job cards. The vehicle dropdown in `AddJobCardDialog` does not show these vehicle types.

## Root Cause Analysis

### 1. Database Enum Limitation

The `vehicle_type` enum in the database only includes 3 values:

- `'rigid_truck'`
- `'horse_truck'`
- `'refrigerated_truck'`

**Missing values:**

- `'reefer'` (for refrigerated trailers)
- `'interlink'` (for interlink trailers)

### 2. Code Flow

```typescript
// src/hooks/useVehicles.ts
export const useVehicles = () => {
  return useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("active", true) // Only shows active vehicles
        .order("registration_number");

      if (error) throw error;
      return data;
    },
  });
};
```

```typescript
// src/components/dialogs/AddJobCardDialog.tsx (lines 280-294)
<Select
  value={formData.vehicle_id || undefined}
  onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
>
  <SelectTrigger>
    <SelectValue placeholder="Select vehicle" />
  </SelectTrigger>
  <SelectContent>
    {vehicles.map((vehicle) => (
      <SelectItem key={vehicle.id} value={vehicle.id}>
        {vehicle.registration_number} - {vehicle.make} {vehicle.model}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

The dropdown correctly renders all vehicles returned by `useVehicles()`, but the problem is:

1. The enum doesn't include 'reefer' and 'interlink'
2. Therefore, no vehicles can be created with these types
3. Therefore, none appear in the dropdown

### 3. Evidence from Codebase

**Inspection templates exist for reefers:**

- `supabase/migrations/20251103000002_populate_inspection_template_items.sql` contains `REEFER_BIWEEKLY_INSP` template with 20 inspection items

**References to interlinks exist:**

- `supabase/migrations/20251028042042_a5e8f2e6-68ed-4197-ba28-00be934eb699.sql` mentions "3T-type interlink trailers (T1-T16 + SP)"

**But the enum was never updated:**

- Original enum created in `supabase/migrations/20250930154607_0a194880-14a7-475c-942c-c5cd33f69a28.sql`
- No subsequent migrations added the new vehicle types

## Solution Implemented

### Migration File

**File:** `supabase/migrations/20250114000000_add_reefer_interlink_vehicle_types.sql`

```sql
-- Add reefer and interlink vehicle types to the vehicle_type enum
-- This allows creating job cards for these vehicle types

-- Add new values to the vehicle_type enum
ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'reefer';
ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'interlink';

-- Note: PostgreSQL doesn't allow removing enum values, only adding them
-- The new values will now be available in the vehicles table
```

### Application Steps

#### 1. Apply the Migration

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/wxvhkljrbcpcgpgdqhsp/editor)
2. Click **SQL Editor** in left sidebar
3. Click **New Query**
4. Copy the migration content from `supabase/migrations/20250114000000_add_reefer_interlink_vehicle_types.sql`
5. Paste into the SQL editor
6. Click **Run** to execute

**Option B: Using the Helper Script**

```bash
cd /workspaces/car-craft-co
./apply_vehicle_types_migration.sh
# Follow the displayed instructions
```

#### 2. Regenerate TypeScript Types

After applying the migration, regenerate the database types:

```bash
npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
```

This ensures TypeScript knows about the new enum values.

#### 3. Create Reefer/Interlink Vehicles (If Needed)

Example SQL to add vehicles with the new types:

```sql
-- Add a reefer vehicle
INSERT INTO vehicles (
  registration_number,
  vehicle_type,
  make,
  model,
  fleet_number,
  active
) VALUES (
  'RF001GP',
  'reefer',
  'Carrier',
  'Vector 1850',
  'RF001',
  true
);

-- Add an interlink vehicle
INSERT INTO vehicles (
  registration_number,
  vehicle_type,
  make,
  model,
  fleet_number,
  active
) VALUES (
  'IL001GP',
  'interlink',
  'SA Truck Bodies',
  'Interlink Trailer',
  'IL001',
  true
);
```

**Via Supabase Dashboard:**

1. Go to **Table Editor** → **vehicles**
2. Click **Insert** → **Insert row**
3. Fill in the fields, select 'reefer' or 'interlink' from the vehicle_type dropdown
4. Ensure `active` is set to `true`
5. Click **Save**

## Verification

After applying the migration and creating vehicles:

1. **Check the enum values:**

   ```sql
   SELECT unnest(enum_range(NULL::vehicle_type)) AS vehicle_type;
   ```

   Should return:

   - rigid_truck
   - horse_truck
   - refrigerated_truck
   - reefer
   - interlink

2. **Check vehicles exist:**

   ```sql
   SELECT registration_number, vehicle_type, make, model, active
   FROM vehicles
   WHERE vehicle_type IN ('reefer', 'interlink')
   AND active = true;
   ```

3. **Test in UI:**
   - Open the application
   - Navigate to Maintenance → Job Cards
   - Click **Add Job Card**
   - Click the **Vehicle** dropdown
   - Verify reefer and interlink vehicles appear in the list

## Impact Analysis

### Files Affected

No code changes required! The issue is purely at the database schema level.

### Related Components

**Components that use `useVehicles()` hook:**

- `src/components/dialogs/AddJobCardDialog.tsx` (Job card creation)
- `src/components/TyreInspection.tsx` (Tyre inspections)
- `src/components/inspections/MobileTyreInspectionForm.tsx` (Mobile inspections)
- `src/components/dialogs/AddFaultDialog.tsx` (Fault reporting)

All these components will automatically show the new vehicle types once:

1. The enum is updated
2. Vehicles are created with the new types
3. TypeScript types are regenerated

### Business Impact

**Before fix:**

- ❌ Cannot create job cards for reefer vehicles
- ❌ Cannot create job cards for interlink trailers
- ❌ Cannot track maintenance for these fleet segments
- ❌ Inspection templates exist but cannot be used

**After fix:**

- ✅ Full job card functionality for reefer vehicles
- ✅ Full job card functionality for interlink trailers
- ✅ Complete maintenance tracking for entire fleet
- ✅ Existing inspection templates can be utilized

## Technical Notes

### PostgreSQL Enum Behavior

1. **Adding values:** `ALTER TYPE` with `ADD VALUE` is safe and non-blocking
2. **IF NOT EXISTS:** Prevents errors if value already exists
3. **Order:** New values are added to the end of the enum
4. **Cannot remove:** PostgreSQL doesn't support removing enum values (by design)
5. **No data migration needed:** Existing vehicles are unaffected

### Why No Code Changes Needed

The codebase is already correctly designed:

- `useVehicles()` queries all active vehicles without filtering by type
- Vehicle dropdown renders all vehicles from the query
- Form submission accepts any valid vehicle_id
- No hardcoded vehicle type restrictions exist

The only blocker was the database enum limitation.

## Related Documentation

- **Inspection Templates:** `supabase/migrations/20251103000002_populate_inspection_template_items.sql`
- **Fleet Tables:** `supabase/migrations/20251028042042_a5e8f2e6-68ed-4197-ba28-00be934eb699.sql`
- **Original Vehicles Schema:** `supabase/migrations/20250930154607_0a194880-14a7-475c-942c-c5cd33f69a28.sql`

## Troubleshooting

### Issue: "enum value already exists"

If you see this error, it means the values were already added. This is fine - the migration uses `IF NOT EXISTS` to handle this safely.

### Issue: Vehicles still don't show up

Check:

1. **Are vehicles created?**

   ```sql
   SELECT * FROM vehicles WHERE vehicle_type IN ('reefer', 'interlink');
   ```

2. **Are vehicles active?**

   ```sql
   SELECT * FROM vehicles WHERE vehicle_type IN ('reefer', 'interlink') AND active = true;
   ```

3. **TypeScript types regenerated?**

   ```bash
   npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
   ```

4. **Browser cache cleared?**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

### Issue: TypeScript errors after regeneration

After regenerating types, restart the dev server:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## Future Considerations

### Additional Vehicle Types

If more vehicle types are needed in the future (e.g., 'tanker', 'flatbed', 'curtain_sider'), follow this same pattern:

1. Create a new migration:

   ```sql
   ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'new_type';
   ```

2. Regenerate types:

   ```bash
   npx supabase gen types typescript --project-id wxvhkljrbcpcgpgdqhsp > src/integrations/supabase/types.ts
   ```

3. Add vehicles with the new type

### Fleet Tyre Configuration

When adding new vehicle types, check if `src/constants/fleetTyreConfig.ts` needs updates for tyre position layouts. Currently configured:

- rigid_truck (6-wheeler)
- horse_truck (10-wheeler with dual wheels)
- refrigerated_truck (6-wheeler)

May need to add:

- reefer (depends on chassis - often 6-wheeler)
- interlink (multiple axles, complex layout)

## Summary

**Root Cause:** Database enum missing 'reefer' and 'interlink' values

**Solution:** Add values to enum via migration

**Code Changes:** None required (already properly designed)

**User Action Required:**

1. Apply migration via Supabase Dashboard SQL Editor
2. Regenerate TypeScript types
3. Create reefer/interlink vehicles in the database
4. Refresh browser to see changes

**Result:** All vehicle types can now be selected for job card creation
