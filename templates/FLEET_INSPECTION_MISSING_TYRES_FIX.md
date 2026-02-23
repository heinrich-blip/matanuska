# Fleet Tyre Inspection - Missing Installed Tyres Issue

## Problem Description

When selecting a fleet number for tyre inspection, the system:

- ✅ Shows the fleet tyre configuration (layout/positions)
- ❌ Does NOT show the actual installed tyres for inspection

## Root Cause Analysis

### The Issue Chain:

1. **Initial Installation Problem** (VARCHAR(12) constraint)

   - When installing tyres, the system attempted to update fleet-specific tables
   - Registration numbers longer than 12 characters (e.g., "ADZ9011/ADZ9010") caused errors
   - This left tyres in a **partially installed state**

2. **Partial Installation State**

   ```
   ✅ Tyre created in `tyres` table with `current_fleet_position` = "33H JFK963FS-V3"
   ❌ Fleet table update FAILED (e.g., `fleet_33h_tyres` missing `tyre_code` entry)
   ```

3. **Inspection Query Failure**
   - The inspection system loads positions from fleet-specific tables
   - It looks for `tyre_code` values to match with actual tyres
   - Since fleet tables have NO `tyre_code` (update failed), no tyres appear
   - Even though the tyres exist in the `tyres` table!

### How Data Should Flow:

```
Installation:
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│ tyres table │────▶│ fleet_33h_tyres  │────▶│ Current Fleet       │
│ id: uuid    │     │ tyre_code: uuid  │     │ Position: "33H..."  │
└─────────────┘     └──────────────────┘     └─────────────────────┘

Inspection:
┌──────────────────┐     ┌─────────────┐     ┌─────────────────┐
│ fleet_33h_tyres  │────▶│ tyres table │────▶│ Display in      │
│ tyre_code lookup │     │ Get details │     │ Inspection UI   │
└──────────────────┘     └─────────────┘     └─────────────────┘
```

### What Actually Happened:

```
BROKEN STATE:
┌─────────────────┐     ┌──────────────────┐
│ tyres table     │  ✗  │ fleet_33h_tyres  │
│ Has tyre data   │     │ tyre_code = NULL │
│ current_fleet   │     │                  │
│ _position set ✓ │     │ (update failed)  │
└─────────────────┘     └──────────────────┘

Inspection query finds:
- Positions: [V1, V2, V3, ... V10, SP] ✓
- Tyre codes: [NULL, NULL, NULL, ...] ✗
- Result: Empty layout diagram
```

## Code References

### 1. Installation Logic

[src/components/dialogs/InstallTyreDialog.tsx](src/components/dialogs/InstallTyreDialog.tsx#L287-L445)

Key line that failed:

```typescript
// Line 413: Stores UUID in fleet table
tyre_code: newTyre.id,
```

### 2. Inspection Query Hook

[src/hooks/useFleetTyrePositions.ts](src/hooks/useFleetTyrePositions.ts#L16-L46)

```typescript
// Queries fleet table for tyre_code
const { data, error } = await supabase
  .from(fleetConfig.tableName) // e.g., "fleet_33h_tyres"
  .select("*")
  .eq("registration_no", registrationNo)
  .order("position");
```

### 3. Layout Diagram Matching

[src/components/tyres/FleetTyreLayoutDiagram.tsx](src/components/tyres/FleetTyreLayoutDiagram.tsx#L98-103)

```typescript
// Line 98-99: Gets tyre_code from fleet table
const fleetPos = fleetPositions.find((fp) => fp.position === pos.position);
const tyreCode = fleetPos?.tyre_code; // ← This is NULL due to failed update

// Line 101-103: Tries to find tyre details
const tyreDetail = tyreCode
  ? tyreDetails.find((t) => t.serial_number === tyreCode || t.id === tyreCode)
  : null; // ← Returns null, so no tyre shown
```

## Solution

### ⚠️ IMPORTANT: Run Migrations in Correct Order

The repair script will fail if the VARCHAR(12) constraint hasn't been fixed first. Use the **combined migration** to ensure correct execution order.

### Option 1: Combined Migration (RECOMMENDED)

Apply the single combined migration that fixes the constraint AND repairs orphaned data:

```bash
# Single migration file - runs both fixes in order
supabase/migrations/20260116000002_combined_fix_and_repair.sql
```

This script:

1. **First** changes VARCHAR(12) → TEXT on all fleet tables
2. **Then** repairs orphaned installations by:
   - Finding all tyres with `current_fleet_position` set
   - Parsing the position string (e.g., "33H JFK963FS-V3")
   - Updating the corresponding fleet table with the `tyre_code`
   - Uses UPSERT logic (ON CONFLICT) to handle existing entries

### Option 2: Individual Migrations (Manual Order)

If you prefer to run migrations separately, you MUST run them in this order:

1. **First**: `20260116000000_fix_registration_no_length.sql`
2. **Then**: `20260116000001_repair_orphaned_tyre_installations.sql`

⚠️ Running repair script BEFORE constraint fix will cause errors!

### How to Apply

**Via Supabase Dashboard:**

1. Go to SQL Editor
2. Copy and paste the contents of `20260116000002_combined_fix_and_repair.sql`
3. Click **Run**
4. Check the notices to see repair progress

**Via Supabase CLI:**

```bash
supabase db push
```

## Verification Steps

After applying the migration:

1. **Check Fleet Tables:**

   ```sql
   -- Example for 33H fleet
   SELECT
     registration_no,
     position,
     tyre_code,
     updated_at
   FROM fleet_33h_tyres
   WHERE tyre_code IS NOT NULL
   ORDER BY registration_no, position;
   ```

2. **Test Inspection:**

   - Go to Tyre Management → Inspection tab
   - Select a vehicle with installed tyres
   - Verify positions show with tyre details

3. **Check Data Consistency:**
   ```sql
   -- Find tyres that should appear but might not be linked
   SELECT
     id,
     brand,
     model,
     current_fleet_position,
     position
   FROM tyres
   WHERE current_fleet_position IS NOT NULL
   ORDER BY current_fleet_position;
   ```

## Expected Outcome

After repairs:

- ✅ Fleet configuration loads with positions
- ✅ Installed tyres appear in each position
- ✅ Tyre details visible (brand, model, tread depth, etc.)
- ✅ Inspection can proceed normally

## Prevention

To prevent this in the future:

1. **Transaction Wrapping** (code improvement needed):

   ```typescript
   // Wrap installation in a transaction
   const { data, error } = await supabase.rpc("install_tyre_transaction", {
     // All installation steps as atomic operation
   });
   ```

2. **Better Error Handling**:

   ```typescript
   // Add rollback logic if fleet table update fails
   if (fleetUpdateError) {
     // Delete the tyre record
     await supabase.from("tyres").delete().eq("id", newTyre.id);
     // Restore inventory
     await supabase.from("tyre_inventory").update({ quantity: quantity + 1 });
     throw error;
   }
   ```

3. **Validation Before Installation**:
   ```typescript
   // Check registration length BEFORE attempting install
   if (registrationNo.length > 12) {
     // Warn user or handle appropriately
   }
   ```

## Related Issues

- VARCHAR(12) constraint: [TYRE_INSTALLATION_ERROR_FIX.md](TYRE_INSTALLATION_ERROR_FIX.md)
- Installation dialog: [InstallTyreDialog.tsx](src/components/dialogs/InstallTyreDialog.tsx)
- Fleet positions hook: [useFleetTyrePositions.ts](src/hooks/useFleetTyrePositions.ts)

## Summary

The missing tyres in inspection are **orphaned installations** caused by the VARCHAR(12) constraint failure. The tyres exist but aren't linked in fleet-specific tables. Apply both migrations to:

1. Fix the constraint (VARCHAR(12) → TEXT)
2. Repair the orphaned data (re-link tyres to fleet tables)
