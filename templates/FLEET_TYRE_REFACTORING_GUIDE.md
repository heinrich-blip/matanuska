# Fleet Tyre System Refactoring - Unified Table Migration

## Problem

The current system uses **26+ separate tables** (`fleet_1h_tyres`, `fleet_33h_tyres`, etc.) with:

- ❌ Hardcoded fleet numbers that may not match actual fleet
- ❌ Inconsistent fleet naming across different parts of the system
- ❌ Need to create new tables for new fleet numbers
- ❌ Complex queries across fleets
- ❌ Maintenance nightmare

## Solution: Unified Table Architecture

Replace all separate tables with ONE dynamic table: `fleet_tyre_positions`

### Benefits

✅ **Dynamic fleet support** - Any fleet number works automatically
✅ **Consistent** - Same fleet naming as vehicles, job cards, inspections
✅ **Scalable** - Add new fleets without schema changes
✅ **Simpler queries** - One table to query across all fleets
✅ **Better performance** - Proper indexing strategy

## Migration Process

### STEP 1: Analyze Current Usage

Run this to see what fleet numbers are actually in use:

```bash
supabase/migrations/20260116100000_analyze_fleet_usage.sql
```

This will show:

- Fleet numbers from vehicles table
- Fleet numbers from installed tyres
- Which old fleet tables have data
- Summary statistics

### STEP 2: Create Unified Table & Migrate Data

Run this migration:

```bash
supabase/migrations/20260116100001_create_unified_fleet_table.sql
```

This will:

1. Create `fleet_tyre_positions` table
2. Migrate ALL data from old `fleet_*_tyres` tables
3. Match vehicles by registration number
4. Show migration summary

**⚠️ SAFE:** Old tables are NOT dropped yet!

### STEP 3: Update Application Code

Update these files to use the new unified table:

#### 3.1: Update Hook: `useFleetTyrePositions.ts`

```typescript
// OLD: Query specific fleet table
const { data, error } = await supabase
  .from(fleetConfig.tableName as "fleet_14l_tyres")
  .select("*")
  .eq("registration_no", registrationNo);

// NEW: Query unified table with fleet number
const { data, error } = await supabase
  .from("fleet_tyre_positions")
  .select("*")
  .eq("fleet_number", fleetNumber)
  .eq("registration_no", registrationNo)
  .order("position");
```

#### 3.2: Update Installation Dialog

In `InstallTyreDialog.tsx`, change the fleet table update:

```typescript
// OLD: Dynamic table name
const { error } = await supabase
  .from(fleetConfig.tableName as any)
  .update({ tyre_code: newTyre.id })
  .eq("registration_no", registrationNo)
  .eq("position", formData.position);

// NEW: Unified table
const { error } = await supabase.from("fleet_tyre_positions").upsert(
  {
    fleet_number: fleetNumber,
    vehicle_id: vehicle.id,
    registration_no: registrationNo,
    position: formData.position,
    tyre_code: newTyre.id,
    updated_at: new Date().toISOString(),
  },
  {
    onConflict: "fleet_number,registration_no,position",
  }
);
```

#### 3.3: Update Fleet Layout Diagram

In `FleetTyreLayoutDiagram.tsx`:

```typescript
// OLD: Query specific table
const { data, error } = await(supabase as any)
  .from(fleetConfig.tableName)
  .select("*")
  .eq("registration_no", registrationNo);

// NEW: Query unified table
const { data, error } = await supabase
  .from("fleet_tyre_positions")
  .select(
    `
    *,
    vehicles:vehicle_id(id, registration_number, fleet_number)
  `
  )
  .eq("fleet_number", fleetNumber)
  .eq("registration_no", registrationNo);
```

### STEP 4: Test Thoroughly

Before dropping old tables, test:

1. **Install a tyre** → Check it appears in `fleet_tyre_positions`
2. **View fleet inspection** → Verify positions load correctly
3. **Remove a tyre** → Check position updated properly
4. **Try different fleet numbers** → Ensure dynamic support works

### STEP 5: Drop Old Tables (AFTER Testing)

**⚠️ ONLY after confirming everything works:**

```bash
supabase/migrations/20260116100002_drop_old_fleet_tables.sql
```

This permanently removes the old 26 tables.

## New Table Schema

```sql
CREATE TABLE fleet_tyre_positions (
    id UUID PRIMARY KEY,
    fleet_number TEXT NOT NULL,      -- Dynamic: "33H", "14L", any fleet
    vehicle_id UUID,                 -- FK to vehicles
    registration_no TEXT NOT NULL,
    position TEXT NOT NULL,          -- "V1", "FL", etc.
    position_label TEXT,             -- Human-readable
    tyre_code TEXT,                  -- UUID from tyres.id
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,

    UNIQUE(fleet_number, registration_no, position)
);
```

## Rollback Plan

If anything goes wrong:

1. **Old tables still exist** until you run STEP 5
2. Can revert code changes
3. Old data preserved in old tables
4. Unified table can be dropped: `DROP TABLE fleet_tyre_positions`

## Code Changes Required

### Files to Update:

1. `src/hooks/useFleetTyrePositions.ts` - Change query logic
2. `src/components/dialogs/InstallTyreDialog.tsx` - Update installation
3. `src/components/dialogs/RemoveTyreDialog.tsx` - Update removal
4. `src/components/tyres/FleetTyreLayoutDiagram.tsx` - Update display
5. `src/constants/fleetTyreConfig.ts` - Remove `tableName` property (no longer needed)

### Key Changes:

Replace all instances of:

- `fleetConfig.tableName` → `"fleet_tyre_positions"`
- Add `fleet_number` to all queries
- Use `.upsert()` instead of checking existence first

## Verification Queries

After migration, verify data:

```sql
-- Check all fleets migrated
SELECT fleet_number, COUNT(*) as positions
FROM fleet_tyre_positions
GROUP BY fleet_number
ORDER BY fleet_number;

-- Compare counts (should match)
SELECT
  (SELECT COUNT(*) FROM fleet_tyre_positions) as new_table_count,
  (SELECT SUM(cnt) FROM (
    SELECT COUNT(*) as cnt FROM fleet_33h_tyres UNION ALL
    SELECT COUNT(*) FROM fleet_6h_tyres -- etc...
  ) x) as old_tables_total;

-- Check vehicles linked correctly
SELECT
  COUNT(*) as total_positions,
  COUNT(vehicle_id) as positions_with_vehicle_link,
  COUNT(tyre_code) as positions_with_tyres
FROM fleet_tyre_positions;
```

## Timeline

- **Analysis**: 5 minutes (STEP 1)
- **Migration**: 10 minutes (STEP 2)
- **Code updates**: 1-2 hours (STEP 3)
- **Testing**: 30 minutes (STEP 4)
- **Cleanup**: 5 minutes (STEP 5)

**Total: ~2-3 hours** for complete refactoring

## Support

If you encounter issues:

- Check migration logs for errors
- Verify unified table has data before dropping old tables
- Old tables remain until explicitly dropped
- Can rollback code changes anytime
